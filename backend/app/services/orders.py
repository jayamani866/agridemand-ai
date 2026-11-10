from decimal import Decimal

from sqlalchemy import select, update, case
from sqlalchemy.orm import Session, selectinload

from app.models import (
    BuyerRequest,
    ProduceLot,
    Order,
    OrderItem,
)


def create_order_from_request(db: Session, request_id: int):
    with db.begin():

        request = db.get(BuyerRequest, request_id)

        if request is None:
            raise ValueError("Buyer request not found")

        existing_order = db.scalar(
            select(Order).where(Order.request_id == request_id)
        )

        if existing_order:
            raise ValueError("An order already exists for this request")

        lots = db.scalars(
            select(ProduceLot)
            .where(
                ProduceLot.crop == request.crop.lower(),
                ProduceLot.status == "available",
                ProduceLot.available_kg > 0,
                ProduceLot.price_per_kg <= request.max_price_per_kg,
            )
            .order_by(ProduceLot.price_per_kg.asc())
        ).all()

        remaining = float(request.quantity_kg)
        allocations = []

        # Calculate possible allocations first.
        for lot in lots:
            if remaining <= 0:
                break

            grade_matches = (
                request.grade.lower() == "any"
                or lot.grade.lower() == request.grade.lower()
            )

            if not grade_matches:
                continue

            quantity = min(remaining, float(lot.available_kg))

            if quantity <= 0:
                continue

            allocations.append({
                "lot": lot,
                "quantity": quantity,
                "price": Decimal(str(lot.price_per_kg)),
            })

            remaining -= quantity

        if remaining > 0:
            raise ValueError(
                f"Insufficient stock. Shortfall: {remaining:.2f} kg"
            )

        total = Decimal("0.00")

        # Atomically reserve each lot.
        for allocation in allocations:
            lot = allocation["lot"]
            quantity = allocation["quantity"]

            result = db.execute(
                update(ProduceLot)
                .where(
                    ProduceLot.id == lot.id,
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
                        else_=ProduceLot.status,
                    ),
                )
            )

            if result.rowcount != 1:
                raise ValueError(
                    f"Stock changed for lot {lot.id}. Please retry."
                )

        order = Order(
            request_id=request.id,
            total_amount=Decimal("0.00"),
            currency="INR",
            status="pending_payment",
        )

        db.add(order)
        db.flush()

        for allocation in allocations:
            quantity = Decimal(str(allocation["quantity"]))
            price = allocation["price"]
            subtotal = (quantity * price).quantize(
                Decimal("0.01")
            )

            total += subtotal

            item = OrderItem(
                order_id=order.id,
                lot_id=allocation["lot"].id,
                farmer_id=allocation["lot"].farmer_id,
                quantity_kg=float(quantity),
                price_per_kg=price,
                subtotal=subtotal,
            )

            db.add(item)

        order.total_amount = total

        db.flush()

    return db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
