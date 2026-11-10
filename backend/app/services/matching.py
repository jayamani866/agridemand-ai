from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import BuyerRequest, ProduceLot
def match_request(db: Session, request_id: int):
    request = db.get(BuyerRequest, request_id)
    if not request:
        return None
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
    remaining = request.quantity_kg
    allocations = []
    total_cost = 0.0
    for lot in lots:
        if remaining <= 0:
            break
        grade_matches = (
            request.grade.lower() == "any"
            or lot.grade.lower() == request.grade.lower()
        )
        if not grade_matches:
            continue
        allocated = min(remaining, lot.available_kg)
        cost = allocated * float(lot.price_per_kg)
        allocations.append({
            "lot_id": lot.id,
            "farmer_id": lot.farmer_id,
            "farmer_name": lot.farmer.name,
            "farmer_location": lot.location,
            "crop": lot.crop,
            "grade": lot.grade,
            "allocated_kg": round(allocated, 2),
            "price_per_kg": float(lot.price_per_kg),
            "subtotal": round(cost, 2),
        })
        total_cost += cost
        remaining -= allocated
    matched_kg = request.quantity_kg - remaining
    return {
        "request_id": request.id,
        "requested_kg": request.quantity_kg,
        "matched_kg": round(matched_kg, 2),
        "shortfall_kg": round(max(remaining, 0), 2),
        "total_estimated_cost": round(total_cost, 2),
        "average_price_per_kg": round(total_cost / matched_kg, 2) if matched_kg else 0,
        "fully_matched": remaining <= 0,
        "allocations": allocations,
        "matching_note": (
            "Quantity fully matched across farmer lots."
            if remaining <= 0
            else "Partial match. Additional farmer stock is required."
        ),
    }
