import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
from app.models import Farmer, ProduceLot, BuyerRequest
from app.matching import match_request
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
def add_farmer(db, name="Test Farmer", phone="9000000001"):
    farmer = Farmer(name=name, phone=phone, location="Salem")
    db.add(farmer)
    db.flush()
    return farmer
def add_lot(db, farmer, crop="tomato", quantity=100,
            grade="A", price=20, status="available"):
    lot = ProduceLot(
        farmer_id=farmer.id,
        crop=crop,
        quantity_kg=quantity,
        available_kg=quantity,
        grade=grade,
        price_per_kg=price,
        location=farmer.location,
        status=status,
    )
    db.add(lot)
    db.flush()
    return lot
def add_request(db, crop="tomato", quantity=100,
                grade="A", max_price=25):
    request = BuyerRequest(
        buyer_name="Test Buyer",
        crop=crop,
        quantity_kg=quantity,
        grade=grade,
        max_price_per_kg=max_price,
        delivery_location="Salem",
    )
    db.add(request)
    db.commit()
    return request
def test_full_match_from_multiple_farmers(db):
    farmer1 = add_farmer(db)
    farmer2 = add_farmer(db, "Farmer Two", "9000000002")
    add_lot(db, farmer1, quantity=40, price=18)
    add_lot(db, farmer2, quantity=60, price=20)
    request = add_request(db, quantity=100)
    result = match_request(db, request.id)
    assert result["fully_matched"] is True
    assert result["matched_kg"] == 100
    assert result["shortfall_kg"] == 0
    assert len(result["allocations"]) == 2
    assert result["total_estimated_cost"] == 1920
def test_partial_match_reports_shortfall(db):
    farmer = add_farmer(db)
    add_lot(db, farmer, quantity=60)
    request = add_request(db, quantity=100)
    result = match_request(db, request.id)
    assert result["fully_matched"] is False
    assert result["matched_kg"] == 60
    assert result["shortfall_kg"] == 40
def test_crop_matching_ignores_case_and_spaces(db):
    farmer = add_farmer(db)
    add_lot(db, farmer, crop=" Tomato ", quantity=100)
    request = add_request(db, crop="TOMATO", quantity=50)
    result = match_request(db, request.id)
    assert result["matched_kg"] == 50
    assert result["fully_matched"] is True
def test_grade_mismatch_is_excluded(db):
    farmer = add_farmer(db)
    add_lot(db, farmer, grade="B")
    request = add_request(db, grade="A")
    result = match_request(db, request.id)
    assert result["matched_kg"] == 0
    assert result["fully_matched"] is False
def test_any_grade_accepts_available_grade(db):
    farmer = add_farmer(db)
    add_lot(db, farmer, grade="B")
    request = add_request(db, grade="Any")
    result = match_request(db, request.id)
    assert result["matched_kg"] == 100
    assert result["fully_matched"] is True
def test_lot_above_maximum_price_is_excluded(db):
    farmer = add_farmer(db)
    add_lot(db, farmer, price=30)
    request = add_request(db, max_price=25)
    result = match_request(db, request.id)
    assert result["matched_kg"] == 0
    assert result["allocations"] == []
def test_unavailable_lot_is_excluded(db):
    farmer = add_farmer(db)
    add_lot(db, farmer, status="reserved")
    request = add_request(db)
    result = match_request(db, request.id)
    assert result["matched_kg"] == 0
def test_missing_request_returns_none(db):
    assert match_request(db, 99999) is None
def test_cheapest_lot_is_allocated_first(db):
    farmer1 = add_farmer(db)
    farmer2 = add_farmer(db, "Farmer Two", "9000000002")
    expensive = add_lot(db, farmer1, quantity=100, price=24)
    cheap = add_lot(db, farmer2, quantity=100, price=18)
    request = add_request(db, quantity=50)
    result = match_request(db, request.id)
    assert result["fully_matched"] is True
    assert result["allocations"][0]["lot_id"] == cheap.id
    assert result["allocations"][0]["allocated_kg"] == 50
