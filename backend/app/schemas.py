
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


CROPS = {
    "coconut", "banana", "tomato", "onion",
    "turmeric", "rice", "groundnut"
}


class FarmerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    location: str = Field(min_length=2, max_length=120)


class FarmerOut(FarmerCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class LotCreate(BaseModel):
    farmer_id: int
    crop: str
    quantity_kg: float = Field(gt=0)
    grade: str = "A"
    price_per_kg: float = Field(gt=0)
    location: str


class LotOut(BaseModel):
    id: int
    farmer_id: int
    crop: str
    quantity_kg: float
    available_kg: float
    grade: str
    price_per_kg: float
    location: str
    status: str
    model_config = ConfigDict(from_attributes=True)


class BuyerRequestCreate(BaseModel):
    buyer_name: str = Field(min_length=2, max_length=120)
    crop: str
    quantity_kg: float = Field(gt=0)
    grade: str = "Any"
    max_price_per_kg: float = Field(gt=0)
    delivery_location: str


class BuyerRequestOut(BaseModel):
    id: int
    buyer_name: str
    crop: str
    quantity_kg: float
    grade: str
    max_price_per_kg: float
    delivery_location: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class OrderItemOut(BaseModel):
    id: int
    lot_id: int
    farmer_id: int
    quantity_kg: float
    price_per_kg: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    id: int
    request_id: int
    total_amount: float
    currency: str
    status: str
    created_at: datetime
    items: list[OrderItemOut]

    model_config = ConfigDict(from_attributes=True)
