from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Float, JSON, Index
from sqlalchemy import UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class PendingPayPalPayment(Base):
    __tablename__ = "pending_paypal_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    paypal_order_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    checkout_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), default="created", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    
class Farmer(Base):
    __tablename__ = "farmers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=True,
        index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    lots: Mapped[list["ProduceLot"]] = relationship(
        back_populates="farmer",
        cascade="all, delete-orphan"
    )
    user: Mapped["User | None"] = relationship()
    
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

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    buyer_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )

    crop: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )

    quantity_kg: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    grade: Mapped[str] = mapped_column(
        String(30),
        default="Any"
    )

    max_price_per_kg: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    delivery_location: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    user: Mapped["User | None"] = relationship()




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

    # Payment details for Bulk Buyer
    payment_method: Mapped[str] = mapped_column(
        String(30), default="not_selected", nullable=False
    )

    payment_status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )

    payment_reference: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )

    payment_order_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
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
        ForeignKey("farmers.id"), nullable=False, index=True
    )

    quantity_kg: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    price_per_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False, index=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    order: Mapped["Order"] = relationship(
        back_populates="items"
    )

    status_history: Mapped[list["BulkOrderStatusHistory"]] = relationship(
        back_populates="order_item",
        cascade="all, delete-orphan",
        order_by="BulkOrderStatusHistory.created_at"
    )



class BulkOrderStatusHistory(Base):
    __tablename__ = "bulk_order_status_history"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    order_item_id: Mapped[int] = mapped_column(
        ForeignKey("order_items.id"),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    updated_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    note: Mapped[str | None] = mapped_column(
        String(250), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    order_item: Mapped["OrderItem"] = relationship(
        back_populates="status_history"
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    full_name: Mapped[str] = mapped_column(
        String(120), nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    phone: Mapped[str | None] = mapped_column(
        String(20), unique=True, nullable=True
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    google_sub: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )




class RetailOrder(Base):
    __tablename__ = "retail_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    client_order_key: Mapped[str] = mapped_column(
        String(64), nullable=False
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3), default="INR", nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), default="placed", nullable=False
    )
    delivery_address: Mapped[str] = mapped_column(
        String(250), nullable=False
    )
    delivery_city: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    postal_code: Mapped[str] = mapped_column(
        String(10), nullable=False
    )
    phone: Mapped[str] = mapped_column(
        String(16), nullable=False
    )
    payment_method: Mapped[str] = mapped_column(
        String(30), default="pay_on_delivery", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    items: Mapped[list["RetailOrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan"
    )
    __table_args__ = (
        Index(
            "uq_retail_order_user_client_key",
            "user_id",
            "client_order_key",
            unique=True,
        ),
    )


class RetailOrderItem(Base):
    __tablename__ = "retail_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("retail_orders.id"), nullable=False, index=True
    )
    lot_id: Mapped[int] = mapped_column(
        ForeignKey("produce_lots.id"), nullable=False
    )
    farmer_id: Mapped[int] = mapped_column(
        ForeignKey("farmers.id"), nullable=False, index=True
    )
    crop: Mapped[str] = mapped_column(String(50), nullable=False)
    farmer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    farmer_location: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_kg: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30), default="placed", nullable=False, index=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    order: Mapped["RetailOrder"] = relationship(
        back_populates="items"
    )

    status_history: Mapped[list["OrderStatusHistory"]] = relationship(
        back_populates="order_item",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.created_at",
    )


class OrderStatusHistory(Base):
    __tablename__ = "retail_order_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    order_item_id: Mapped[int] = mapped_column(
        ForeignKey("retail_order_items.id"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    updated_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    note: Mapped[str | None] = mapped_column(
        String(250), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    order_item: Mapped["RetailOrderItem"] = relationship(
        back_populates="status_history"
    )

class PendingRazorpayPayment(Base):
    __tablename__ = "pending_razorpay_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    client_order_key: Mapped[str] = mapped_column(
        String(64), nullable=False
    )

    razorpay_order_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )

    razorpay_payment_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )

    amount_paise: Mapped[int] = mapped_column(
        Integer, nullable=False
    )

    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    buyer_fee: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    currency: Mapped[str] = mapped_column(
        String(3), default="INR", nullable=False
    )

    checkout_data: Mapped[dict] = mapped_column(
        JSON, nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30), default="created", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "client_order_key",
            name="uq_razorpay_user_client_key",
        ),
    )




class ConsumerAddress(Base):
    __tablename__ = "consumer_addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    delivery_address: Mapped[str] = mapped_column(
        String(250), nullable=False
    )
    delivery_city: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    postal_code: Mapped[str] = mapped_column(
        String(10), nullable=False
    )
    phone: Mapped[str] = mapped_column(
        String(16), nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )