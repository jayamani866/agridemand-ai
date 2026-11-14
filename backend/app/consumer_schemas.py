
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConsumerProductOut(BaseModel):
    id: int
    crop: str
    available_kg: float
    grade: str
    price_per_kg: float
    location: str
    farmer_name: str
    harvest_date: datetime


class ConsumerOrderItemCreate(BaseModel):
    lot_id: int = Field(gt=0)
    quantity_kg: float = Field(gt=0, le=5000)


class ConsumerCheckoutCreate(BaseModel):
    client_order_key: str = Field(min_length=8, max_length=64)
    delivery_address: str = Field(min_length=5, max_length=250)
    delivery_city: str = Field(min_length=2, max_length=100)
    postal_code: str = Field(pattern=r"^[0-9]{5,10}$")
    phone: str = Field(pattern=r"^[0-9+ -]{8,16}$")
    payment_method: Literal["pay_on_delivery", "paypal"] = "pay_on_delivery"
    items: list[ConsumerOrderItemCreate] = Field(
        min_length=1,
        max_length=30
    )


class ConsumerOrderItemOut(BaseModel):
    id: int
    lot_id: int
    crop: str
    farmer_name: str
    farmer_location: str
    quantity_kg: float
    price_per_kg: float
    subtotal: float


class ConsumerOrderOut(BaseModel):
    id: int
    client_order_key: str
    total_amount: float
    currency: str
    status: str
    delivery_address: str
    delivery_city: str
    postal_code: str
    phone: str
    payment_method: str
    created_at: datetime
    items: list[ConsumerOrderItemOut]
