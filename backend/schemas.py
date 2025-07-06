from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import SymptomStatus

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str

class SymptomCreate(BaseModel):
    symptoms: str
    image_path: Optional[str] = None
    patient_id: int

class SymptomOut(BaseModel):
    id: int
    symptoms: str
    image_path: Optional[str]
    status: SymptomStatus
    date: str
    time: str
    hasImage: bool

    class Config:
        from_attributes = True
        use_enum_values = True