from contextlib import asynccontextmanager
import re
from app.consumer import router as consumer_router
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from app.paypal import router as paypal_router

from app.auth import router as auth_router, require_roles
from app.models import Order, User, PendingPayPalPayment
from app.schemas import OrderOut, OrderListOut
from app.services.orders import create_order_from_request

from app.database import Base, engine, get_db, SessionLocal
from app.models import Farmer, ProduceLot, BuyerRequest
from app.schemas import (
    FarmerCreate,
    FarmerOnboarding,
    FarmerOut,
    FarmerLotCreate,
    LotCreate,
    LotOut,
    BuyerRequestCreate,
    BuyerRequestOut,
    CROPS,
)
from app.services.matching import match_request


def seed_demo_data(db: Session) -> None:
    """Insert demo farmers and stock only when the database is empty."""
    existing_farmer = db.scalar(select(Farmer.id).limit(1))

    if existing_farmer is not None:
        return

    farmers = [
        Farmer(
            name="Ravi Kumar",
            phone="9000000001",
            location="Salem",
        ),
        Farmer(
            name="Kannan",
            phone="9000000002",
            location="Dharmapuri",
        ),
        Farmer(
            name="Murugan",
            phone="9000000003",
            location="Erode",
        ),
    ]

    try:
        db.add_all(farmers)
        db.flush()

        lots = [
            ProduceLot(
                farmer_id=farmers[0].id,
                crop="tomato",
                quantity_kg=800,
                available_kg=800,
                grade="A",
                price_per_kg=22,
                location="Salem",
            ),
            ProduceLot(
                farmer_id=farmers[1].id,
                crop="tomato",
                quantity_kg=700,
                available_kg=700,
                grade="A",
                price_per_kg=20,
                location="Dharmapuri",
            ),
            ProduceLot(
                farmer_id=farmers[2].id,
                crop="tomato",
                quantity_kg=1000,
                available_kg=1000,
                grade="A",
                price_per_kg=24,
                location="Erode",
            ),
            ProduceLot(
                farmer_id=farmers[0].id,
                crop="onion",
                quantity_kg=500,
                available_kg=500,
                grade="A",
                price_per_kg=28,
                location="Salem",
            ),
            ProduceLot(
                farmer_id=farmers[1].id,
                crop="coconut",
                quantity_kg=1000,
                available_kg=1000,
                grade="A",
                price_per_kg=32,
                location="Dharmapuri",
            ),
            ProduceLot(
                farmer_id=farmers[2].id,
                crop="banana",
                quantity_kg=600,
                available_kg=600,
                grade="A",
                price_per_kg=18,
                location="Erode",
            ),
        ]

        db.add_all(lots)
        db.commit()

    except Exception:
        db.rollback()
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed_demo_data(db)

    yield


app = FastAPI(
    title="AgriDemand AI",
    description=(
        "AI-powered agricultural demand parsing, "
        "multi-farmer stock matching and procurement."
    ),
    version="1.0.0",
    lifespan=lifespan,
    
)
app.include_router(auth_router)
app.include_router(consumer_router)
app.include_router(paypal_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5177",
        "http://localhost:5178",
        "http://127.0.0.1:5178",
        "http://localhost:5179",
        "http://127.0.0.1:5179",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "AgriDemand AI API is running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "project": "AgriDemand AI",
    }

@app.get("/api/farmers/me", response_model=FarmerOut)
def get_my_farmer_profile(
    current_user: User = Depends(require_roles("farmer")),
    db: Session = Depends(get_db),
):
    farmer = db.scalar(
        select(Farmer).where(Farmer.user_id == current_user.id)
    )

    if farmer is None:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not created yet.",
        )

    return farmer


@app.post(
    "/api/farmers/me",
    response_model=FarmerOut,
    status_code=201,
)
def create_my_farmer_profile(
    payload: FarmerOnboarding,
    current_user: User = Depends(require_roles("farmer")),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Farmer).where(Farmer.user_id == current_user.id)
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Farmer profile already exists.",
        )

    farmer = Farmer(
        user_id=current_user.id,
        name=current_user.full_name,
        phone=payload.phone.strip(),
        location=payload.location.strip(),
    )

    try:
        db.add(farmer)
        db.commit()
        db.refresh(farmer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This phone number is already registered.",
        )

    return farmer

@app.get("/api/farmers", response_model=list[FarmerOut])
def get_farmers(db: Session = Depends(get_db)):
    return db.scalars(
        select(Farmer).order_by(Farmer.id)
    ).all()


@app.post(
    "/api/farmers",
    response_model=FarmerOut,
    status_code=201,
)
def create_farmer(
    payload: FarmerCreate,
    db: Session = Depends(get_db),
):
    farmer = Farmer(**payload.model_dump())

    try:
        db.add(farmer)
        db.commit()
        db.refresh(farmer)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A farmer with this phone number already exists.",
        )

    return farmer


@app.get("/api/lots", response_model=list[LotOut])
def get_lots(db: Session = Depends(get_db)):
    return db.scalars(
        select(ProduceLot).order_by(ProduceLot.id)
    ).all()


@app.post(
    "/api/lots",
    response_model=LotOut,
    status_code=201,
)
def create_lot(
    payload: FarmerLotCreate,
    current_user: User = Depends(require_roles("farmer")),
    db: Session = Depends(get_db),
):
    farmer = db.scalar(
        select(Farmer).where(Farmer.user_id == current_user.id)
    )

    if farmer is None:
        raise HTTPException(
            status_code=403,
            detail="Complete farmer onboarding before adding inventory.",
        )

    crop = payload.crop.strip().lower()

    if not re.fullmatch(r"[a-z][a-z -]{1,39}", crop):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid crop name (2-40 letters)."
        )
    lot = ProduceLot(
        farmer_id=farmer.id,
        crop=crop,
        quantity_kg=payload.quantity_kg,
        available_kg=payload.quantity_kg,
        grade=payload.grade,
        price_per_kg=payload.price_per_kg,
        location=farmer.location,
    )

    try:
        db.add(lot)
        db.commit()
        db.refresh(lot)
    except Exception:
        db.rollback()
        raise

    return lot


@app.get(
    "/api/requests",
    response_model=list[BuyerRequestOut],
)
def get_requests(db: Session = Depends(get_db)):
    return db.scalars(
        select(BuyerRequest).order_by(BuyerRequest.id.desc())
    ).all()


@app.post(
    "/api/requests",
    response_model=BuyerRequestOut,
    status_code=201,
)
def create_request(
    payload: BuyerRequestCreate,
    db: Session = Depends(get_db),
):
    crop = payload.crop.strip().lower()

    if not re.fullmatch(r"[a-z][a-z -]{1,39}", crop):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid crop name (2-40 letters)."
        )

    request_data = payload.model_dump()
    request_data["crop"] = crop

    buyer_request = BuyerRequest(**request_data)

    try:
        db.add(buyer_request)
        db.commit()
        db.refresh(buyer_request)

    except Exception:
        db.rollback()
        raise

    return buyer_request



@app.get(
    "/api/requests",
    response_model=list[BuyerRequestOut],
)
def get_requests(
    current_user: User = Depends(require_roles("bulk_buyer")),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(BuyerRequest)
        .where(BuyerRequest.user_id == current_user.id)
        .order_by(BuyerRequest.id.desc())
    ).all()


@app.post(
    "/api/requests",
    response_model=BuyerRequestOut,
    status_code=201,
)
def create_request(
    payload: BuyerRequestCreate,
    current_user: User = Depends(require_roles("bulk_buyer")),
    db: Session = Depends(get_db),
):
    crop = payload.crop.strip().lower()

    if not re.fullmatch(r"[a-z][a-z -]{1,39}", crop):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid crop name (2-40 letters).",
        )

    request_data = payload.model_dump()
    request_data["crop"] = crop
    request_data["buyer_name"] = current_user.full_name

    buyer_request = BuyerRequest(
        **request_data,
        user_id=current_user.id,
    )

    try:
        db.add(buyer_request)
        db.commit()
        db.refresh(buyer_request)
    except Exception:
        db.rollback()
        raise

    return buyer_request


@app.get("/api/requests/{request_id}/match")
def get_matches(
    request_id: int,
    current_user: User = Depends(require_roles("bulk_buyer")),
    db: Session = Depends(get_db),
):
    buyer_request = db.scalar(
        select(BuyerRequest).where(
            BuyerRequest.id == request_id,
            BuyerRequest.user_id == current_user.id,
        )
    )

    if buyer_request is None:
        raise HTTPException(
            status_code=404,
            detail="Buyer request not found.",
        )

    result = match_request(db, request_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Matching results not found.",
        )

    return result


@app.post(
    "/api/requests/{request_id}/orders",
    response_model=OrderOut,
    status_code=201,
)
def create_order(
    request_id: int,
    current_user: User = Depends(require_roles("bulk_buyer")),
    db: Session = Depends(get_db),
):
    buyer_request = db.scalar(
        select(BuyerRequest).where(
            BuyerRequest.id == request_id,
            BuyerRequest.user_id == current_user.id,
        )
    )

    if buyer_request is None:
        raise HTTPException(
            status_code=404,
            detail="Buyer request not found.",
        )

    existing_order = db.scalar(
        select(Order).where(Order.request_id == request_id)
    )

    if existing_order is not None:
        raise HTTPException(
            status_code=409,
            detail="An order already exists for this request.",
        )

    try:
        order = create_order_from_request(db, request_id)
        return order

    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Order already exists or inventory changed. Refresh and try again.",
        )


@app.get(
    "/api/orders",
    response_model=list[OrderListOut],
)
def get_orders(
    current_user: User = Depends(require_roles("bulk_buyer")),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Order, BuyerRequest)
        .join(
            BuyerRequest,
            Order.request_id == BuyerRequest.id,
        )
        .where(BuyerRequest.user_id == current_user.id)
        .options(selectinload(Order.items))
        .order_by(Order.id.desc())
    ).all()

    if not rows:
        return []

    all_items = [
        item
        for order, buyer_request in rows
        for item in order.items
    ]

    farmer_ids = {item.farmer_id for item in all_items}

    farmers = (
        db.scalars(
            select(Farmer).where(Farmer.id.in_(farmer_ids))
        ).all()
        if farmer_ids else []
    )

    farmer_by_id = {
        farmer.id: farmer
        for farmer in farmers
    }

    result = []

    for order, buyer_request in rows:
        order_items = []

        for item in order.items:
            farmer = farmer_by_id.get(item.farmer_id)

            if farmer is None:
                raise HTTPException(
                    status_code=500,
                    detail=f"Farmer not found for order item {item.id}",
                )

            order_items.append({
                "id": item.id,
                "lot_id": item.lot_id,
                "farmer_id": item.farmer_id,
                "quantity_kg": item.quantity_kg,
                "price_per_kg": item.price_per_kg,
                "subtotal": item.subtotal,
                "farmer_name": farmer.name,
                "farmer_location": farmer.location,
            })

        result.append({
            "id": order.id,
            "request_id": order.request_id,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "status": order.status,
            "created_at": order.created_at,
            "buyer_name": buyer_request.buyer_name,
            "crop": buyer_request.crop,
            "requested_quantity_kg": buyer_request.quantity_kg,
            "delivery_location": buyer_request.delivery_location,
            "items": order_items,
        })

    return result




@app.get(
    "/api/orders",
    response_model=list[OrderListOut],
)
def get_orders(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Order, BuyerRequest)
        .join(
            BuyerRequest,
            Order.request_id == BuyerRequest.id,
        )
        .options(selectinload(Order.items))
        .order_by(Order.id.desc())
    ).all()

    if not rows:
        return []

    all_items = [
        item
        for order, buyer_request in rows
        for item in order.items
    ]

    farmer_ids = {item.farmer_id for item in all_items}

    farmers = db.scalars(
        select(Farmer).where(Farmer.id.in_(farmer_ids))
    ).all() if farmer_ids else []

    farmer_by_id = {
        farmer.id: farmer
        for farmer in farmers
    }

    result = []

    for order, buyer_request in rows:
        order_items = []

        for item in order.items:
            farmer = farmer_by_id.get(item.farmer_id)

            if farmer is None:
                raise HTTPException(
                    status_code=500,
                    detail=f"Farmer not found for order item {item.id}",
                )

            order_items.append({
                "id": item.id,
                "lot_id": item.lot_id,
                "farmer_id": item.farmer_id,
                "quantity_kg": item.quantity_kg,
                "price_per_kg": item.price_per_kg,
                "subtotal": item.subtotal,
                "farmer_name": farmer.name,
                "farmer_location": farmer.location,
            })

        result.append({
            "id": order.id,
            "request_id": order.request_id,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "status": order.status,
            "created_at": order.created_at,
            "buyer_name": buyer_request.buyer_name,
            "crop": buyer_request.crop,
            "requested_quantity_kg": buyer_request.quantity_kg,
            "delivery_location": buyer_request.delivery_location,
            "items": order_items,
        })

    return result
