from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.types import Enum as SQLEnum  # 👈 Import Enum của SQLAlchemy đúng cách
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from enum import Enum, IntEnum 
import uuid


class SymptomStatus(str, Enum):
    PENDING = "Pending"
    UNDER_REVIEW = "Under Review"
    DIAGNOSED = "Diagnosed"
    COMPLETED = "Completed"
    REFERRED = "Referred"

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"

class RoleEnum(IntEnum):
    PATIENT = 1
    DOCTOR = 2
    LAB_STAFF = 3

class ConsentPurpose(str, Enum):
    TREATMENT = "treatment"
    REFERRAL = "referral"
    RESEARCH = "research"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(RoleEnum, native_enum=False), nullable=False)  # role will be one of patient, doctor, lab_staff
    name = Column(String, nullable=True)
    gender = Column(SQLEnum(GenderEnum, native_enum=False), default=GenderEnum.FEMALE)
    age = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="user", uselist=False)

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    specialty = Column(String)

    user = relationship("User", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    gp_id = Column(Integer, ForeignKey('users.id'))
    location = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
class LabStaff(Base):
    __tablename__ = "lab_staff"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    location = Column(String, nullable=False)   
    specialties = Column(String, nullable=False)

class MedicalLab(Base):
    __tablename__ = "medical_labs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    specialties = Column(String, nullable=False)

    @property
    def specialties_list(self):
        return self.specialties.split(',')

class Symptom(Base):
    __tablename__ = "symptoms"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    symptoms = Column(Text, nullable=False)  # e.g., "fever, cough, headache"
    image_path = Column(String, nullable=True)
    status = Column(SQLEnum(SymptomStatus, native_enum=False), default=SymptomStatus.PENDING)
    timestamp = Column(DateTime, default=datetime.utcnow)

    consents = relationship("Consent", backref="symptom", cascade="all, delete-orphan")


class Diagnosis(Base):
    __tablename__ = "diagnosis"
    id = Column(Integer, primary_key=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    diagnosis_content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Consent(Base):
    __tablename__ = "consents"
    id = Column(Integer, primary_key=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    consent_type = Column(SQLEnum(ConsentPurpose, native_enum=False), nullable=False)  # "treatment", "referral", "research"
    is_granted = Column(Boolean, default=True, nullable=False)  # True = granted, False = revoked
    granted_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)

class LabAssignment(Base):
    __tablename__ = "lab_assignments"
    id = Column(Integer, primary_key=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    lab_id = Column(Integer, ForeignKey("medical_labs.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    upload_token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    assigned_at = Column(DateTime, default=datetime.utcnow)
    uploaded_result_path = Column(String, nullable=True)
    uploaded_at = Column(DateTime, nullable=True)


class Referral(Base):
    __tablename__ = "referrals"
    id = Column(Integer, primary_key=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    referral_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False) 
    referred_at = Column(DateTime, default=datetime.utcnow)
