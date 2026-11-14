
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update, case
from sqlalchemy.orm import Session, selectinload

from app.auth import require_roles
from app.database import get_db
from app.models import (
    Farmer,
    ProduceLot,
    User,
    RetailOrder,
    RetailOrderItem,
)
from app.consumer_schemas import (
    ConsumerProductOut,
    ConsumerCheckoutCreate,
    ConsumerOrderOut,
)

router = APIRouter(
    prefix="/api/consumer",
    tags=["Consumer"]
)


@router.get("/products", response_model=list[ConsumerProductOut])
def get_consumer_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("consumer")),
):
    statement = (
        select(ProduceLot, Farmer)
        .join(Farmer, ProduceLot.farmer_id == Farmer.id)
        .where(
            ProduceLot.available_kg > 0,
            ProduceLot.status == "available"
        )
        .order_by(ProduceLot.harvest_date.desc())
    )

    rows = db.execute(statement).all()

    return [
        ConsumerProductOut(
            id=lot.id,
            crop=lot.crop,
            available_kg=lot.available_kg,
            grade=lot.grade,
            price_per_kg=lot.price_per_kg,
            location=lot.location,
            farmer_name=farmer.name,
            harvest_date=lot.harvest_date,
        )
        for lot, farmer in rows
    ]



def _create_consumer_order(
    payload: ConsumerCheckoutCreate,
    db: Session,
    current_user: User,
):
    
    # Return the previous order if this checkout was already submitted.
    existing = db.scalar(
        select(RetailOrder)
        .options(selectinload(RetailOrder.items))
        .where(
            RetailOrder.user_id == current_user.id,
            RetailOrder.client_order_key == payload.client_order_key,
        )
    )

    if existing:
        return existing

    # Combine duplicate lot IDs before validating and reserving stock.
    quantities = {}
    for item in payload.items:
        quantities[item.lot_id] = (
            quantities.get(item.lot_id, 0) + item.quantity_kg
        )

    order_items = []
    total = Decimal("0.00")

    try:
        for lot_id, quantity in quantities.items():
            row = db.execute(
                select(ProduceLot, Farmer)
                .join(Farmer, ProduceLot.farmer_id == Farmer.id)
                .where(ProduceLot.id == lot_id)
            ).first()

            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produce listing {lot_id} was not found."
                )

            lot, farmer = row

            # Atomic conditional update prevents overselling.
            result = db.execute(
                update(ProduceLot)
                .where(
                    ProduceLot.id == lot_id,
                    ProduceLot.status == "available",
                    ProduceLot.available_kg >= quantity,
                )
                .values(
                    available_kg=ProduceLot.available_kg - quantity,
                    status=case(
                        (
                            ProduceLot.available_kg - quantity <= 0,
                            "reserved"
                        ),
                        else_="available"
                    )
                )
            )

            if result.rowcount != 1:
                raise HTTPException(
                    status_code=409,
                    detail=f"Insufficient stock for {lot.crop}. Please refresh the marketplace."
                )

            price = Decimal(str(lot.price_per_kg))
            subtotal = (price * Decimal(str(quantity))).quantize(
                Decimal("0.01")
            )
            total += subtotal

            order_items.append(
                RetailOrderItem(
                    lot_id=lot.id,
                    farmer_id=farmer.id,
                    crop=lot.crop,
                    farmer_name=farmer.name,
                    farmer_location=farmer.location,
                    quantity_kg=quantity,
                    price_per_kg=price,
                    subtotal=subtotal,
                )
            )

        order = RetailOrder(
            user_id=current_user.id,
            client_order_key=payload.client_order_key,
            total_amount=total,
            currency="USD",
            status="placed",
            delivery_address=payload.delivery_address,
            delivery_city=payload.delivery_city,
            postal_code=payload.postal_code,
            phone=payload.phone,
            payment_method=payload.payment_method,
            items=order_items,
        )

        db.add(order)
        db.commit()

        saved_order = db.scalar(
            select(RetailOrder)
            .options(selectinload(RetailOrder.items))
            .where(
                RetailOrder.id == order.id,
                RetailOrder.user_id == current_user.id,
            )
        )

        return saved_order

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

@router.post("/orders", response_model=ConsumerOrderOut, status_code=201)
def create_consumer_order(
    payload: ConsumerCheckoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("consumer")),
):
    if payload.payment_method != "pay_on_delivery":
        raise HTTPException(
            status_code=403,
            detail="Online payments must use the PayPal checkout."
        )

    return _create_consumer_order(payload, db, current_user)

@router.get("/orders", response_model=list[ConsumerOrderOut])
def get_consumer_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("consumer")),
):
    statement = (
        select(RetailOrder)
        .options(selectinload(RetailOrder.items))
        .where(RetailOrder.user_id == current_user.id)
        .order_by(RetailOrder.created_at.desc())
    )

    return db.scalars(statement).all()
