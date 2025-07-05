from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    symptoms = Column(Text)
    image_path = Column(String, nullable=True)
    status = Column(String, default="Pending")

class DoctorNote(Base):
    __tablename__ = "doctor_notes"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    analysis = Column(Text)

    patient = relationship("Patient", backref="doctor_notes")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    password = Column(String) # For mock login, store plaintext or hashed
    role = Column(String)  # "patient", "doctor", or "lab_staff"
    

