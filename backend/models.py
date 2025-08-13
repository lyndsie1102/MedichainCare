from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.types import Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship, Session
from sqlalchemy.types import PickleType
from sqlalchemy.ext.mutable import MutableList
from database import Base
from datetime import datetime, timedelta
from enum import Enum, IntEnum 
import uuid


class SymptomStatus(str, Enum):
    PENDING = "Pending"
    TESTED = "Tested"
    DIAGNOSED = "Diagnosed"
    WAITING = "Waiting for Test"
    REFERRED = "Referred"
    ASSIGNED = "Assigned to Lab"

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

class TestRequestStatus(str, Enum):
    PENDING = "pending"
    UPLOADED = "uploaded"

class AppointmentStatus(str, Enum):
    PENDING_PATIENT = "Pending_Patient"
    PENDING_LAB = "Pending_Lab"
    CONFIRMED = "Confirmed"

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
    eth_address = Column(String, nullable=False)  # Store the Ethereum address

    doctor = relationship("Doctor", back_populates="user", uselist=False)

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    specialty = Column(String)

    user = relationship("User", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    gp_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # General Practitioner (GP) ID
    location = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)

class MedicalLab(Base):
    __tablename__ = "medical_labs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    specialties = Column(String, nullable=False)

    @property
    def specialties_list(self):
        return self.specialties.split(',')

class Slot(Base):
    __tablename__ = "slots"
    
    id = Column(Integer, primary_key=True)
    lab_staff_id = Column(Integer, ForeignKey("lab_staff.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)  # Start time of the slot
    end_time = Column(DateTime, nullable=False)  # End time of the slot
    is_available = Column(Boolean, default=True)  # Whether the slot is available
    
    # Relationships
    lab_staff = relationship("LabStaff", back_populates="slots")
    appointments = relationship("Appointment", back_populates="slot")  # Fixed this to "appointments"
    
    @staticmethod
    def generate_slots(lab_staff_id: int, date: datetime):
        """
        Generates slots for a given lab staff on a specific date.
        Each slot is 30 minutes and the lunch break is between 12:00 PM - 1:30 PM.
        """
        slots = []
        start_of_day = datetime.combine(date, datetime.min.time()) + timedelta(hours=9)  # 9:00 AM
        end_of_day = datetime.combine(date, datetime.min.time()) + timedelta(hours=17)  # 5:00 PM
        lunch_start = datetime.combine(date, datetime.min.time()) + timedelta(hours=12)  # 12:00 PM
        lunch_end = datetime.combine(date, datetime.min.time()) + timedelta(hours=13, minutes=30)  # 1:30 PM

        current_time = start_of_day
        
        while current_time < end_of_day:
            # Skip the lunch break
            if lunch_start <= current_time < lunch_end:
                current_time = lunch_end
                continue

            # Create a new slot
            slot_end_time = current_time + timedelta(minutes=30)
            slots.append(Slot(
                lab_staff_id=lab_staff_id,
                start_time=current_time,
                end_time=slot_end_time,
                is_available=True
            ))

            # Move to the next slot
            current_time = slot_end_time

        return slots
    
class LabStaff(Base):
    __tablename__ = "lab_staff"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    location = Column(String, nullable=False)
    specialties = Column(String, nullable=False)
    lab_id = Column(Integer, ForeignKey("medical_labs.id"))

    appointments = relationship('Appointment', back_populates='lab_staff')
    slots = relationship("Slot", back_populates="lab_staff")

    @staticmethod
    def get_slots_for_date(db: Session, lab_staff_id: int, date: datetime):
        """Get all slots for a specific lab staff on a specific date."""
        return db.query(Slot).filter(
            Slot.lab_staff_id == lab_staff_id,
            Slot.start_time >= datetime.combine(date, datetime.min.time()) + timedelta(hours=9),
            Slot.end_time <= datetime.combine(date, datetime.min.time()) + timedelta(hours=17)
        ).all()

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False)
    test_request_id = Column(Integer, ForeignKey("test_requests.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    lab_staff_id = Column(Integer, ForeignKey("lab_staff.id"), nullable=False)
    status = Column(SQLEnum(AppointmentStatus, native_enum=False), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    # Relationships
    slot = relationship("Slot", back_populates="appointments")  # This is correct, references "appointments"
    lab_staff = relationship('LabStaff', back_populates='appointments')



class Symptom(Base):
    __tablename__ = "symptoms"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    symptoms = Column(Text, nullable=False)  # e.g., "fever, cough, headache"
    image_paths = Column(MutableList.as_mutable(PickleType), default=[])
    status = Column(SQLEnum(SymptomStatus, native_enum=False), default=SymptomStatus.PENDING)
    timestamp = Column(DateTime, default=datetime.utcnow)
    consent_treatment = Column(Boolean, default=False)
    consent_referral = Column(Boolean, default=False)
    consent_research = Column(Boolean, default=False)

    consents = relationship("Consent", backref="symptom", cascade="all, delete-orphan")
    test_requests = relationship("TestRequest", back_populates="symptom")


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

class TestRequest(Base):
    __tablename__ = "test_requests"
    id = Column(Integer, primary_key=True)
    test_type_id = Column(Integer, ForeignKey("test_types.id"), nullable=False)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    lab_id = Column(Integer, ForeignKey("medical_labs.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    upload_token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    requested_at = Column(DateTime, default=datetime.utcnow)
    uploaded_result_path = Column(String, nullable=True)
    status = Column(SQLEnum(TestRequestStatus, native_enum=False), default=TestRequestStatus.PENDING)

    test_results = relationship("TestResults", back_populates="test_request")
    symptom = relationship("Symptom", back_populates="test_requests")


class Referral(Base):
    __tablename__ = "referrals"
    id = Column(Integer, primary_key=True)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    referral_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False) 
    referred_at = Column(DateTime, default=datetime.utcnow)

class TestType(Base):
    __tablename__ = "test_types"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class TestResults(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True)
    test_request_id = Column(Integer, ForeignKey("test_requests.id"), nullable=False)
    files = Column(JSON, nullable=False)
    summary = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    test_request = relationship("TestRequest", back_populates="test_results")

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    jti = Column(String, primary_key=True, index=True)
    expired_at = Column(DateTime, default=datetime.utcnow)
