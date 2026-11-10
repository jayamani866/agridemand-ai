from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


from app.models import Order
from app.schemas import OrderOut
from app.services.orders import create_order_from_request

from app.database import Base, engine, get_db, SessionLocal
from app.models import Farmer, ProduceLot, BuyerRequest
from app.schemas import (
    FarmerCreate,
    FarmerOut,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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
    payload: LotCreate,
    db: Session = Depends(get_db),
):
    crop = payload.crop.strip().lower()

    if crop not in CROPS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported crop. Allowed crops: {sorted(CROPS)}",
        )

    farmer = db.get(Farmer, payload.farmer_id)

    if farmer is None:
        raise HTTPException(
            status_code=404,
            detail="Farmer not found.",
        )

    # Build one dictionary so crop is never passed twice.
    lot_data = payload.model_dump()
    lot_data["crop"] = crop
    lot_data["available_kg"] = payload.quantity_kg

    lot = ProduceLot(**lot_data)

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

    if crop not in CROPS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported crop. Allowed crops: {sorted(CROPS)}",
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


@app.get("/api/requests/{request_id}/match")
def get_matches(
    request_id: int,
    db: Session = Depends(get_db),
):
    result = match_request(db, request_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Buyer request not found.",
        )

    return result

@app.post(
    "/api/requests/{request_id}/orders",
    response_model=OrderOut,
    status_code=201
)
def create_order(
    request_id: int,
    db: Session = Depends(get_db)
):
    try:
        return create_order_from_request(db, request_id)

    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc)
        )