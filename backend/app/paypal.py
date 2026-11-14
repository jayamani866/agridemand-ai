
import os
from decimal import Decimal

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.database import get_db
from app.models import User, ProduceLot, PendingPayPalPayment
from app.consumer_schemas import ConsumerCheckoutCreate
from app.consumer import _create_consumer_order
router = APIRouter(prefix="/api/paypal", tags=["PayPal"])

PAYPAL_BASE_URL = os.getenv(
    "PAYPAL_BASE_URL",
    "https://api-m.sandbox.paypal.com"
)
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
# Demo conversion rate: ₹86 = $1 (illustrative only)
INR_PER_USD = Decimal(os.getenv("PAYPAL_INR_PER_USD", "86.00"))


def get_access_token():
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(500, "PayPal credentials missing")

    try:
        response = requests.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            timeout=15,
        )
        response.raise_for_status()
        return response.json()["access_token"]
    except requests.RequestException:
        raise HTTPException(502, "PayPal authentication failed")



def paypal_request(method, path, token, **kwargs):
    try:
        response = requests.request(
            method,
            f"{PAYPAL_BASE_URL}{path}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
            **kwargs,
        )
        response.raise_for_status()
        return response.json()

    except requests.HTTPError:
        # Show PayPal's actual rejection reason for debugging.
        error_text = response.text[:1000]
        raise HTTPException(
            status_code=502,
            detail=f"PayPal API error ({response.status_code}): {error_text}",
        )

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"PayPal connection error: {str(exc)[:300]}",
        )


@router.get("/health")
def paypal_health():
    get_access_token()
    return {"status": "connected", "mode": "sandbox"}


@router.post("/create-order")
def create_paypal_order(
    payload: ConsumerCheckoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("consumer")),
):
    # Aggregate duplicate lot IDs and calculate price from database.
    quantities = {}
    for item in payload.items:
        quantities[item.lot_id] = (
            quantities.get(item.lot_id, 0) + item.quantity_kg
        )

    total = Decimal("0.00")

    for lot_id, quantity in quantities.items():
        lot = db.get(ProduceLot, lot_id)

        if not lot or lot.status != "available":
            raise HTTPException(404, f"Listing {lot_id} unavailable")

        if Decimal(str(lot.available_kg)) < Decimal(str(quantity)):
            raise HTTPException(409, f"Insufficient stock for {lot.crop}")

        total += (
            Decimal(str(lot.price_per_kg)) * Decimal(str(quantity))
        ).quantize(Decimal("0.01"))

    if total <= 0:
        raise HTTPException(400, "Invalid payment amount")

    if INR_PER_USD <= 0:
        raise HTTPException(500, "Invalid currency conversion rate")

    usd_total = (total / INR_PER_USD).quantize(Decimal("0.01"))

    if usd_total <= 0:
        raise HTTPException(400, "Payment amount is too small")

    token = get_access_token()

    paypal_order = paypal_request(
        "POST",
        "/v2/checkout/orders",
        token,
        json={
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {
                    "currency_code": "USD",
                    "value": f"{total:.2f}",
                },
                "description": "AgriDemand AI produce order",
            }],
            "application_context": {
                "return_url": "http://localhost:5173/consumer?paypal=success",
                "cancel_url": "http://localhost:5173/consumer?paypal=cancel",
                "user_action": "PAY_NOW",
            },
        },
    )

    approval_url = next(
        (
            link["href"]
            for link in paypal_order.get("links", [])
            if link.get("rel") == "approve"
        ),
        None,
    )

    if not approval_url:
        raise HTTPException(502, "PayPal approval link missing")

    pending = PendingPayPalPayment(
        user_id=current_user.id,
        paypal_order_id=paypal_order["id"],
        amount=total,
        currency="USD",
        checkout_data=payload.model_dump(mode="json"),
        status="created",
    )

    db.add(pending)
    db.commit()

    return {
        "paypal_order_id": paypal_order["id"],
        "approval_url": approval_url,
        "amount": f"{total:.2f}",
        "currency": "INR",
    }


@router.post("/capture/{paypal_order_id}")
def capture_paypal_order(
    paypal_order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("consumer")),
):
    pending = db.scalar(
        select(PendingPayPalPayment).where(
            PendingPayPalPayment.paypal_order_id == paypal_order_id,
            PendingPayPalPayment.user_id == current_user.id,
        )
    )

    if not pending:
        raise HTTPException(404, "Pending PayPal payment not found")

    checkout_payload = ConsumerCheckoutCreate.model_validate(
        pending.checkout_data
    )

    # Retry safely if payment was captured but order creation previously failed.
    if pending.status == "completed":
        return _create_consumer_order(checkout_payload, db, current_user)

    if pending.status not in ("created", "captured"):
        raise HTTPException(409, "Payment cannot be captured")

    if pending.status == "created":
        token = get_access_token()

        capture = paypal_request(
            "POST",
            f"/v2/checkout/orders/{paypal_order_id}/capture",
            token,
            json={},
        )

        if capture.get("status") != "COMPLETED":
            raise HTTPException(402, "PayPal payment not completed")

        try:
            capture_amount = Decimal(
                capture["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"]
            )
            capture_currency = capture["purchase_units"][0]["payments"]["captures"][0]["amount"]["currency_code"]
        except (KeyError, IndexError, TypeError):
            raise HTTPException(502, "Could not verify PayPal capture amount")

        if (
            capture_amount != Decimal(str(pending.amount))
            or capture_currency != pending.currency
        ):
            raise HTTPException(400, "PayPal payment amount mismatch")

        pending.status = "captured"
        db.commit()

    # Existing order function reserves stock and saves the order.
    checkout_payload.payment_method = "paypal"
    order = _create_consumer_order(checkout_payload, db, current_user)
    pending.status = "completed"
    db.commit()

    return {
        "payment_status": "completed",
        "order": order,
    }
