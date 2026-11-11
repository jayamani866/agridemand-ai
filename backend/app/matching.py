from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from app.models import BuyerRequest, ProduceLot
def money(value) -> Decimal:
    return Decimal(str(value)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
def quantity(value) -> Decimal:
    return Decimal(str(value)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
def match_request(db: Session, request_id: int):
    buyer_request = db.get(BuyerRequest, request_id)
    if buyer_request is None:
        return None
    requested_crop = buyer_request.crop.strip().lower()
    requested_grade = buyer_request.grade.strip().lower()
    requested_kg = quantity(buyer_request.quantity_kg)
    max_price = money(buyer_request.max_price_per_kg)
    if requested_kg <= 0:
        return None
    lots = db.scalars(
        select(ProduceLot)
        .options(joinedload(ProduceLot.farmer))
        .where(
            func.lower(func.trim(ProduceLot.crop)) == requested_crop,
            ProduceLot.status == "available",
            ProduceLot.available_kg > 0,
            ProduceLot.price_per_kg <= max_price,
        )
        .order_by(ProduceLot.price_per_kg.asc(), ProduceLot.id.asc())
    ).all()
    remaining_kg = requested_kg
    total_cost = Decimal("0.00")
    allocations = []
    for lot in lots:
        if remaining_kg <= 0:
            break
        lot_grade = (lot.grade or "").strip().lower()
        if requested_grade not in ("any", lot_grade):
            continue
        available_kg = quantity(lot.available_kg)
        allocated_kg = min(remaining_kg, available_kg)
        if allocated_kg <= 0:
            continue
        unit_price = money(lot.price_per_kg)
        subtotal = money(allocated_kg * unit_price)
        allocations.append({
            "lot_id": lot.id,
            "farmer_id": lot.farmer_id,
            "farmer_name": lot.farmer.name,
            "farmer_location": lot.location,
            "crop": lot.crop,
            "grade": lot.grade,
            "allocated_kg": float(allocated_kg),
            "price_per_kg": float(unit_price),
            "subtotal": float(subtotal),
        })
        total_cost += subtotal
        remaining_kg -= allocated_kg
    matched_kg = requested_kg - remaining_kg
    fully_matched = remaining_kg == 0
    average_price = (
        money(total_cost / matched_kg)
        if matched_kg > 0
        else Decimal("0.00")
    )
    if fully_matched:
        note = "The requested quantity is available within the buyer's price limit."
    elif matched_kg > 0:
        note = "Partial match: additional eligible farmer stock is required."
    else:
        note = "No eligible stock found for the requested crop, grade and price limit."
    return {
        "request_id": buyer_request.id,
        "requested_kg": float(requested_kg),
        "matched_kg": float(matched_kg),
        "shortfall_kg": float(max(remaining_kg, Decimal("0"))),
        "total_estimated_cost": float(money(total_cost)),
        "average_price_per_kg": float(average_price),
        "fully_matched": fully_matched,
        "allocations": allocations,
        "matching_note": note,
    }
