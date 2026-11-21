
import hashlib
import os
from decimal import Decimal

import razorpay
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.database import get_db
from app.models import User, ProduceLot, PendingRazorpayPayment, RetailOrder
from app.consumer_schemas import ConsumerCheckoutCreate
from app.consumer import _create_consumer_order, calculate_buyer_fee

router = APIRouter(prefix="/api/razorpay", tags=["Razorpay"])


def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay test credentials are not configured.",
        )

    return razorpay.Client(auth=(key_id, key_secret))


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str = Field(min_length=1, max_length=64)
    razorpay_payment_id: str = Field(min_length=1, max_length=64)
    razorpay_signature: str = Field(min_length=1, max_length=256)


def calculate_checkout_totals(payload: ConsumerCheckoutCreate, db: Session):
    quantities = {}

    for item in payload.items:
        quantities[item.lot_id] = (
            quantities.get(item.lot_id, 0) + item.quantity_kg
        )

    subtotal = Decimal("0.00")

    for lot_id, quantity in quantities.items():
        lot = db.get(ProduceLot, lot_id)

        if not lot or lot.status != "available":
            raise HTTPException(
                status_code=404,
                detail=f"Produce listing {lot_id} is unavailable.",
            )

        if Decimal(str(lot.available_kg)) < Decimal(str(quantity)):
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient stock for {lot.crop}.",
            )

        line_total = (
            Decimal(str(lot.price_per_kg)) * Decimal(str(quantity))
        ).quantize(Decimal("0.01"))

        subtotal += line_total

    subtotal = subtotal.quantize(Decimal("0.01"))

    if subtotal <= 0:
        raise HTTPException(status_code=400, detail="Invalid order amount.")

    buyer_fee = calculate_buyer_fee(subtotal)
    payable = (subtotal + buyer_fee).quantize(Decimal("0.01"))
    amount_paise = int(payable * 100)

    return subtotal, buyer_fee, payable, amount_paise


@router.get("/health")
def razorpay_health():
    client = get_razorpay_client()

    try:
        # A small API request verifies that the configured credentials work.
        client.order.all({"count": 1})
        return {"status": "connected", "mode": "test"}
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Razorpay connection failed. Check test API credentials.",
        )


@router.post("/create-order")
def create_razorpay_order(
    payload: ConsumerCheckoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("consumer")),
):
    if payload.payment_method != "razorpay":
        raise HTTPException(
            status_code=400,
            detail="Payment method must be razorpay.",
        )

    existing = db.scalar(
        select(PendingRazorpayPayment).where(
            PendingRazorpayPayment.user_id == current_user.id,
            PendingRazorpayPayment.client_order_key == payload.client_order_key,
        )
    )

    if existing:
        if existing.status == "created":
            return {
                "razorpay_order_id": existing.razorpay_order_id,
                "amount": existing.amount_paise,
                "currency": existing.currency,
                "key_id": os.getenv("RAZORPAY_KEY_ID"),
            }

        raise HTTPException(
            status_code=409,
            detail=f"This checkout is already {existing.status}. Start a new checkout.",
        )

    subtotal, buyer_fee, payable, amount_paise = calculate_checkout_totals(
        payload, db
    )

    client = get_razorpay_client()

    receipt_source = f"{current_user.id}:{payload.client_order_key}"
    receipt = "agri-" + hashlib.sha256(
        receipt_source.encode("utf-8")
    ).hexdigest()[:24]

    try:
        razorpay_order = client.order.create(
            data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "user_id": str(current_user.id),
                    "client_order_key": payload.client_order_key,
                },
            }
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Could not create Razorpay order. Please try again.",
        )

    pending = PendingRazorpayPayment(
        user_id=current_user.id,
        client_order_key=payload.client_order_key,
        razorpay_order_id=razorpay_order["id"],
        amount_paise=amount_paise,
        subtotal=subtotal,
        buyer_fee=buyer_fee,
        currency="INR",
        checkout_data=payload.model_dump(mode="json"),
        status="created",
    )

    try:
        db.add(pending)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not save this checkout. Please start a new checkout.",
        )

    return {
        "razorpay_order_id": razorpay_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": os.getenv("RAZORPAY_KEY_ID"),
        "subtotal": str(subtotal),
        "buyer_fee": str(buyer_fee),
        "payable": str(payable),
    }


@router.post("/verify-payment")
def verify_razorpay_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("consumer")),
):
    pending = db.scalar(
        select(PendingRazorpayPayment).where(
            PendingRazorpayPayment.razorpay_order_id
            == payload.razorpay_order_id,
            PendingRazorpayPayment.user_id == current_user.id,
        )
    )

    if not pending:
        raise HTTPException(status_code=404, detail="Payment order not found.")

    if pending.status == "completed":
        return {
            "status": "completed",
            "message": "Order was already created.",
            "client_order_key": pending.client_order_key,
        }

    if pending.status != "created":
        raise HTTPException(
            status_code=409,
            detail=f"Payment is currently {pending.status}.",
        )

    client = get_razorpay_client()

    # 1. Verify Checkout signature.
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
            }
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Payment signature verification failed.",
        )

    # 2. Independently fetch payment details from Razorpay.
    try:
        payment = client.payment.fetch(payload.razorpay_payment_id)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Could not verify payment status with Razorpay. Please retry.",
        )

    if payment.get("order_id") != pending.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment order mismatch.")

    if payment.get("amount") != pending.amount_paise:
        raise HTTPException(status_code=400, detail="Payment amount mismatch.")

    if payment.get("currency") != "INR":
        raise HTTPException(status_code=400, detail="Payment currency mismatch.")

    if payment.get("status") != "captured":
        raise HTTPException(
            status_code=409,
            detail="Payment is not captured yet. Please retry after confirmation.",
        )

    # 3. Claim this pending payment to prevent duplicate order creation.
    claim = db.execute(
        update(PendingRazorpayPayment)
        .where(
            PendingRazorpayPayment.id == pending.id,
            PendingRazorpayPayment.status == "created",
        )
        .values(
            status="processing",
            razorpay_payment_id=payload.razorpay_payment_id,
        )
    )
    db.commit()

    if claim.rowcount != 1:
        raise HTTPException(
            status_code=409,
            detail="This payment is already being processed.",
        )

    # 4. Only now create the order and deduct stock.
    
    # 4. Only now create the order and deduct stock.
    try:
        checkout = ConsumerCheckoutCreate.model_validate(
            pending.checkout_data
        )

        order = _create_consumer_order(
            checkout,
            db,
            current_user,
            buyer_fee=Decimal(str(pending.buyer_fee)),
        )

    except Exception:
        db.rollback()

        # Payment was captured but order creation failed. Attempt a full refund.
        try:
            client.payment.refund(
                payload.razorpay_payment_id,
                {"amount": pending.amount_paise},
            )
            pending.status = "refunded"
        except Exception:
            pending.status = "refund_required"

        db.commit()

        if pending.status == "refunded":
            raise HTTPException(
                status_code=409,
                detail="Order creation failed. Refund was initiated.",
            )

        raise HTTPException(
            status_code=500,
            detail="Order creation failed. Refund requires support review.",
        )

    # Order creation has already committed. Never refund if this status update fails.
    pending.status = "completed"

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=(
                "Order was created, but payment status needs reconciliation. "
                "Do not pay again."
            ),
        )

    return {
        "status": "completed",
        "message": "Payment verified and order created.",
        "order_id": order.id,
        "client_order_key": pending.client_order_key,
        "payment_id": payload.razorpay_payment_id,
        "amount": pending.amount_paise,
        "currency": "INR",
    }
