from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
class Farmer(Base):
    __tablename__ = "farmers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    lots: Mapped[list["ProduceLot"]] = relationship(
        back_populates="farmer",
        cascade="all, delete-orphan"
    )
class ProduceLot(Base):
    __tablename__ = "produce_lots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id"), nullable=False)
    crop: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    available_kg: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(30), default="A")
    price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    harvest_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default="available")
    farmer: Mapped["Farmer"] = relationship(back_populates="lots")
class BuyerRequest(Base):
    __tablename__ = "buyer_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    buyer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    crop: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(30), default="Any")
    max_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    delivery_location: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)



class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("buyer_requests.id"),
        unique=True,
        nullable=False
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3), default="INR", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), default="pending_payment", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id"), nullable=False
    )
    lot_id: Mapped[int] = mapped_column(
        ForeignKey("produce_lots.id"), nullable=False
    )
    farmer_id: Mapped[int] = mapped_column(
        ForeignKey("farmers.id"), nullable=False
    )
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    order: Mapped["Order"] = relationship(back_populates="items")
