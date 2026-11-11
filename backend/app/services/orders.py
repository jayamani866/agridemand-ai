from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import case, select, update, func
from sqlalchemy.orm import Session, selectinload
from app.models import BuyerRequest, ProduceLot, Order, OrderItem
def money(value) -> Decimal:
    return Decimal(str(value)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
def quantity(value) -> Decimal:
    return Decimal(str(value)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
def create_order_from_request(db: Session, request_id: int):
    try:
        request = db.get(BuyerRequest, request_id)
        if request is None:
            raise ValueError("Buyer request not found")
        existing_order = db.scalar(
            select(Order).where(Order.request_id == request_id)
        )
        if existing_order:
            raise ValueError("An order already exists for this request")
        requested_crop = request.crop.strip().lower()
        requested_grade = request.grade.strip().lower()
        remaining = quantity(request.quantity_kg)
        max_price = money(request.max_price_per_kg)
        if remaining <= 0:
            raise ValueError("Requested quantity must be greater than zero")
        lots = db.scalars(
            select(ProduceLot)
            .where(
                func.lower(func.trim(ProduceLot.crop)) == requested_crop,
                ProduceLot.status == "available",
                ProduceLot.available_kg > 0,
                ProduceLot.price_per_kg <= max_price,
            )
            .order_by(
                ProduceLot.price_per_kg.asc(),
                ProduceLot.id.asc(),
            )
        ).all()
        allocations = []
        for lot in lots:
            if remaining <= 0:
                break
            lot_grade = (lot.grade or "").strip().lower()
            if requested_grade not in ("any", lot_grade):
                continue
            available = quantity(lot.available_kg)
            allocated = min(remaining, available)
            if allocated <= 0:
                continue
            price = money(lot.price_per_kg)
            allocations.append({
                "lot_id": lot.id,
                "farmer_id": lot.farmer_id,
                "allocated": allocated,
                "price": price,
            })
            remaining -= allocated
        if remaining > 0:
            raise ValueError(
                f"Insufficient stock. Shortfall: {remaining:.2f} kg"
            )
        total = Decimal("0.00")
        # Conditional updates prevent reserving stock that has
        # already been consumed by another order.
        for allocation in allocations:
            allocated = allocation["allocated"]
            lot_id = allocation["lot_id"]
            result = db.execute(
                update(ProduceLot)
                .where(
                    ProduceLot.id == lot_id,
                    ProduceLot.status == "available",
                    ProduceLot.available_kg >= float(allocated),
                )
                .values(
                    available_kg=ProduceLot.available_kg - float(allocated),
                    status=case(
                        (
                            ProduceLot.available_kg - float(allocated) <= 0,
                            "reserved",
                        ),
                        else_=ProduceLot.status,
                    ),
                )
            )
            if result.rowcount != 1:
                raise ValueError(
                    f"Stock changed for lot {lot_id}. Please retry."
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
            allocated = allocation["allocated"]
            price = allocation["price"]
            subtotal = money(allocated * price)
            total += subtotal
            db.add(
                OrderItem(
                    order_id=order.id,
                    lot_id=allocation["lot_id"],
                    farmer_id=allocation["farmer_id"],
                    quantity_kg=float(allocated),
                    price_per_kg=price,
                    subtotal=subtotal,
                )
            )
        order.total_amount = money(total)
        db.flush()
        order_id = order.id
        # This service owns its transaction: commit on success.
        db.commit()
        return db.scalar(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id)
        )
    except Exception:
        db.rollback()
        raise
