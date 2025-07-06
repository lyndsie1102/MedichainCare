from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.types import Enum as SQLEnum  # 👈 Import Enum của SQLAlchemy đúng cách
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from enum import Enum  # Enum chuẩn Python




class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password = Column(String)
    role = Column(String)  # "patient", "doctor", "lab_staff"

class SymptomStatus(str, Enum):
    PENDING = "Pending"
    UNDER_REVIEW = "Under Review"
    DIAGNOSED = "Diagnosed"
    COMPLETED = "Completed"

class Symptom(Base):
    __tablename__ = "symptoms"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    symptoms = Column(Text)
    image_path = Column(String, nullable=True)
    status = Column(SQLEnum(SymptomStatus, native_enum=False), default=SymptomStatus.PENDING)
    timestamp = Column(DateTime, default=datetime.utcnow)
    patient = relationship("User")

class DoctorNote(Base):
    __tablename__ = "doctor_notes"
    id = Column(Integer, primary_key=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"))
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    analysis = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    symptom = relationship("Symptom")


