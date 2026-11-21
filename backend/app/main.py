from contextlib import asynccontextmanager
import re
import os
from app.consumer import router as consumer_router
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from app.paypal import router as paypal_router
from app.razorpay import router as razorpay_router

from app.auth import router as auth_router, require_roles
from app.models import Order, User, PendingPayPalPayment
from app.schemas import OrderOut, OrderListOut
from app.services.orders import create_order_from_request

from app.database import Base, engine, get_db, SessionLocal
from app.models import (
    Farmer,
    ProduceLot,
    BuyerRequest,
    OrderItem,
    BulkOrderStatusHistory,
    RetailOrder,
    RetailOrderItem,
    OrderStatusHistory,
)
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

    app_env = os.getenv("APP_ENV", "production").strip().lower()

    if app_env == "development":
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
app.include_router(razorpay_router)
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





@app.get("/api/lots", response_model=list[LotOut])
def get_lots(db: Session = Depends(get_db)):
    return db.scalars(
        select(ProduceLot)
        .where(
            ProduceLot.status == "available",
            ProduceLot.available_kg > 0,
        )
        .order_by(ProduceLot.id)
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
    payment_method: str = "not_selected",
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
    if payment_method not in ("cod", "not_selected"):
        raise HTTPException(
            status_code=400,
            detail="Invalid payment method.",
        )
    try:
        order = create_order_from_request(
        db,
        request_id,
        payment_method=payment_method,
    )
        return order

    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        )

    except IntegrityError as exc:
        print("BULK ORDER DATABASE ERROR:", repr(exc.orig))
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Order creation failed. Check backend terminal.",
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
        .options(
            selectinload(Order.items).selectinload(
                OrderItem.status_history
            )
        )
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
                "subtotal": round(float(item.quantity_kg) * float(item.price_per_kg), 2),
                "status": item.status,
                "updated_at": item.updated_at,
                "farmer_name": farmer.name,
                "farmer_location": farmer.location,
                "status_history": [
                    {
                        "id": history.id,
                        "status": history.status,
                        "updated_by_user_id": history.updated_by_user_id,
                        "note": history.note,
                        "created_at": history.created_at,
                    }
                    for history in item.status_history
                ],
            })

        result.append({
            "id": order.id,
            "request_id": order.request_id,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "status": order.status,
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "payment_reference": order.payment_reference,
            "payment_order_id": order.payment_order_id,
            "paid_at": order.paid_at,
            "created_at": order.created_at,
            "buyer_name": buyer_request.buyer_name,
            "crop": buyer_request.crop,
            "requested_quantity_kg": buyer_request.quantity_kg,
            "delivery_location": buyer_request.delivery_location,
            "items": order_items,
        })

    return result



# ---------------- RETAIL ORDER TRACKING (FARMER) ----------------

FARMER_ORDER_TRANSITIONS = {
    "placed": "accepted",
    "accepted": "preparing",
    "preparing": "dispatched",
    "dispatched": "delivered",
}


@app.get("/api/farmers/me/retail-orders")
def get_my_retail_orders(
    current_user: User = Depends(require_roles("farmer")),
    db: Session = Depends(get_db),
):
    farmer = db.scalar(
        select(Farmer).where(Farmer.user_id == current_user.id)
    )

    if farmer is None:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    items = db.scalars(
        select(RetailOrderItem)
        .where(RetailOrderItem.farmer_id == farmer.id)
        .options(selectinload(RetailOrderItem.status_history))
        .order_by(RetailOrderItem.id.desc())
    ).all()

    return [
        {
            "item_id": item.id,
            "order_id": item.order_id,
            "crop": item.crop,
            "quantity_kg": item.quantity_kg,
            "price_per_kg": item.price_per_kg,
            "subtotal": item.subtotal,
            "status": item.status,
            "updated_at": item.updated_at,
            "history": [
                {
                    "status": history.status,
                    "note": history.note,
                    "created_at": history.created_at,
                }
                for history in item.status_history
            ],
        }
        for item in items
    ]


@app.patch("/api/farmers/me/retail-orders/{item_id}/status")
def update_my_retail_order_status(
    item_id: int,
    payload: dict,
    current_user: User = Depends(require_roles("farmer")),
    db: Session = Depends(get_db),
):
    farmer = db.scalar(
        select(Farmer).where(Farmer.user_id == current_user.id)
    )

    if farmer is None:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    item = db.scalar(
        select(RetailOrderItem).where(
            RetailOrderItem.id == item_id,
            RetailOrderItem.farmer_id == farmer.id,
        )
    )

    if item is None:
        raise HTTPException(status_code=404, detail="Order item not found")

    new_status = payload.get("status")
    expected_status = FARMER_ORDER_TRANSITIONS.get(item.status)

    if new_status != expected_status:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition. Current status: {item.status}. "
                   f"Next allowed status: {expected_status}",
        )

    item.status = new_status

    db.add(
        OrderStatusHistory(
            order_item_id=item.id,
            status=new_status,
            updated_by_user_id=current_user.id,
            note=payload.get("note"),
        )
    )

    db.commit()
    db.refresh(item)

    return {
        "message": "Order status updated",
        "item_id": item.id,
        "status": item.status,
        "updated_at": item.updated_at,
    }


# ---------------- BULK ORDER TRACKING (FARMER) ----------------

BULK_ORDER_TRANSITIONS = {
    "pending": "accepted",
    "accepted": "preparing",
    "preparing": "dispatched",
    "dispatched": "delivered",
}


@app.get("/api/farmers/me/bulk-orders")
def get_my_bulk_orders(
    current_user: User = Depends(require_roles("farmer")),
    db: Session = Depends(get_db),
):
    farmer = db.scalar(
        select(Farmer).where(Farmer.user_id == current_user.id)
    )

    if farmer is None:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found",
        )

    items = db.scalars(
        select(OrderItem)
        .where(OrderItem.farmer_id == farmer.id)
        .options(
            selectinload(OrderItem.status_history),
            selectinload(OrderItem.order),
        )
        .order_by(OrderItem.id.desc())
    ).all()

    return [
        {
            "item_id": item.id,
            "order_id": item.order_id,
            "request_id": item.order.request_id,
            "quantity_kg": item.quantity_kg,
            "price_per_kg": float(item.price_per_kg),
            "subtotal": float(item.quantity_kg) * float(item.price_per_kg),
            "status": item.status,
            "updated_at": item.updated_at,
            "payment_method": item.order.payment_method,
            "payment_status": item.order.payment_status,
            "history": [
                {
                    "status": history.status,
                    "note": history.note,
                    "created_at": history.created_at,
                }
                for history in item.status_history
            ],
        }
        for item in items
    ]


@app.patch("/api/farmers/me/bulk-orders/{item_id}/status")
def update_my_bulk_order_status(
    item_id: int,
    payload: dict,
    current_user: User = Depends(require_roles("farmer")),
    db: Session = Depends(get_db),
):
    farmer = db.scalar(
        select(Farmer).where(Farmer.user_id == current_user.id)
    )

    if farmer is None:
        raise HTTPException(
            status_code=404,
            detail="Farmer profile not found",
        )

    item = db.scalar(
        select(OrderItem).where(
            OrderItem.id == item_id,
            OrderItem.farmer_id == farmer.id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Order item not found",
        )

    new_status = payload.get("status")
    expected_status = BULK_ORDER_TRANSITIONS.get(item.status)

    if new_status != expected_status:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid status transition. Current status: {item.status}. "
                f"Next allowed status: {expected_status}"
            ),
        )

    item.status = new_status

    db.add(
        BulkOrderStatusHistory(
            order_item_id=item.id,
            status=new_status,
            updated_by_user_id=current_user.id,
            note=payload.get("note"),
        )
    )

    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update bulk order status",
        )

    return {
        "message": "Bulk order status updated",
        "item_id": item.id,
        "status": item.status,
        "updated_at": item.updated_at,
    }