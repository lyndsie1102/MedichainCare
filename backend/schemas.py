from pydantic import BaseModel
from typing import Optional

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    symptoms: str
    image_path: Optional[str] = None

class PatientOut(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    symptoms: str
    status: str

    class Config:
        orm_mode = True
