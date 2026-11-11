import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
from app.models import Farmer, ProduceLot, BuyerRequest, Order, OrderItem
from app.services.orders import create_order_from_request
@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
def setup_request(db, stock=100, requested=80, price=20):
    farmer = Farmer(
        name="Test Farmer",
        phone="9000000001",
        location="Salem",
    )
    db.add(farmer)
    db.flush()
    lot = ProduceLot(
        farmer_id=farmer.id,
        crop="tomato",
        quantity_kg=stock,
        available_kg=stock,
        grade="A",
        price_per_kg=price,
        location="Salem",
        status="available",
    )
    db.add(lot)
    request = BuyerRequest(
        buyer_name="Test Buyer",
        crop="tomato",
        quantity_kg=requested,
        grade="A",
        max_price_per_kg=25,
        delivery_location="Salem",
    )
    db.add(request)
    db.commit()
    return request, lot
def test_order_creation_reserves_stock(db):
    request, lot = setup_request(db, stock=100, requested=80)
    order = create_order_from_request(db, request.id)
    db.refresh(lot)
    assert order.status == "pending_payment"
    assert order.total_amount == 1600
    assert lot.available_kg == 20
    assert lot.status == "available"
    assert len(order.items) == 1
    assert order.items[0].quantity_kg == 80
def test_fully_reserved_lot_changes_status(db):
    request, lot = setup_request(db, stock=80, requested=80)
    create_order_from_request(db, request.id)
    db.refresh(lot)
    assert lot.available_kg == 0
    assert lot.status == "reserved"
def test_insufficient_stock_does_not_create_order(db):
    request, lot = setup_request(db, stock=50, requested=80)
    with pytest.raises(ValueError, match="Insufficient stock"):
        create_order_from_request(db, request.id)
    db.refresh(lot)
    assert lot.available_kg == 50
    assert db.scalar(select(Order)) is None
def test_duplicate_order_is_rejected(db):
    request, lot = setup_request(db, stock=200, requested=80)
    first_order = create_order_from_request(db, request.id)
    db.rollback()
    with pytest.raises(ValueError, match="already exists"):
        create_order_from_request(db, request.id)
    orders = db.scalars(select(Order)).all()
    assert len(orders) == 1
    assert orders[0].id == first_order.id
def test_missing_request_is_rejected(db):
    with pytest.raises(ValueError, match="not found"):
        create_order_from_request(db, 99999)
def test_multiple_farmer_lots_are_reserved(db):
    farmer1 = Farmer(
        name="Farmer One",
        phone="9000000001",
        location="Salem",
    )
    farmer2 = Farmer(
        name="Farmer Two",
        phone="9000000002",
        location="Dharmapuri",
    )
    db.add_all([farmer1, farmer2])
    db.flush()
    lot1 = ProduceLot(
        farmer_id=farmer1.id,
        crop="tomato",
        quantity_kg=40,
        available_kg=40,
        grade="A",
        price_per_kg=18,
        location="Salem",
        status="available",
    )
    lot2 = ProduceLot(
        farmer_id=farmer2.id,
        crop="tomato",
        quantity_kg=60,
        available_kg=60,
        grade="A",
        price_per_kg=20,
        location="Dharmapuri",
        status="available",
    )
    request = BuyerRequest(
        buyer_name="Bulk Buyer",
        crop="tomato",
        quantity_kg=100,
        grade="A",
        max_price_per_kg=25,
        delivery_location="Salem",
    )
    db.add_all([lot1, lot2, request])
    db.commit()
    order = create_order_from_request(db, request.id)
    db.refresh(lot1)
    db.refresh(lot2)
    assert order.total_amount == 1920
    assert len(order.items) == 2
    assert lot1.available_kg == 0
    assert lot2.available_kg == 0
    assert lot1.status == "reserved"
    assert lot2.status == "reserved"
