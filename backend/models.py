from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.types import Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
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
    CANCELLED = "Cancelled"
    SCHEDULED = "Scheduled"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(
        SQLEnum(RoleEnum, native_enum=False), nullable=False
    )  # role will be one of patient, doctor, lab_staff
    name = Column(String, nullable=True)
    gender = Column(SQLEnum(GenderEnum, native_enum=False), default=GenderEnum.FEMALE)
    age = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    eth_address = Column(String, nullable=False)  # Store the Ethereum address

    doctor = relationship("Doctor", back_populates="user", uselist=False)
    patient_profile = relationship(
        "Patient",
        back_populates="user",
        foreign_keys="Patient.id",
        uselist=False,  # A user has only one patient profile
    )
    patients_as_gp = relationship(
        "Patient", back_populates="gp", foreign_keys="Patient.gp_id"
    )


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    specialty = Column(String)

    user = relationship("User", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    gp_id = Column(
        Integer, ForeignKey("users.id"), nullable=False
    )  # General Practitioner (GP) ID
    location = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)

    user = relationship("User", back_populates="patient_profile", foreign_keys=[id])
    gp = relationship("User", back_populates="patients_as_gp", foreign_keys=[gp_id])


class MedicalLab(Base):
    __tablename__ = "medical_labs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    specialties = Column(String, nullable=False)

    @property
    def specialties_list(self):
        return self.specialties.split(",")


class LabStaff(Base):
    __tablename__ = "lab_staff"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    location = Column(String, nullable=False)
    specialties = Column(String, nullable=False)
    lab_id = Column(Integer, ForeignKey("medical_labs.id"))

    appointment = relationship("Appointment", back_populates="lab_staff", uselist=False)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True)
    test_request_id = Column(Integer, ForeignKey("test_requests.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    lab_staff_id = Column(Integer, ForeignKey("lab_staff.id"), nullable=False)
    status = Column(SQLEnum(AppointmentStatus, native_enum=False), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    cancelled_at = Column(DateTime, nullable=True)

    # Relationships
    lab_staff = relationship("LabStaff", back_populates="appointment")
    test_request = relationship(
        "TestRequest", back_populates="appointments", uselist=False
    )

    __table_args__ = (
        UniqueConstraint(
            "lab_staff_id", "scheduled_at", name="unique_labstaff_appointment"
        ),
    )


class Symptom(Base):
    __tablename__ = "symptoms"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    symptoms = Column(Text, nullable=False)  # e.g., "fever, cough, headache"
    image_paths = Column(Text, default="")
    status = Column(
        SQLEnum(SymptomStatus, native_enum=False), default=SymptomStatus.PENDING
    )
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
    consent_type = Column(
        SQLEnum(ConsentPurpose, native_enum=False), nullable=False
    )  # "treatment", "referral", "research"
    is_granted = Column(
        Boolean, default=True, nullable=False
    )  # True = granted, False = revoked
    granted_at = Column(DateTime, default=datetime.utcnow)


class TestRequest(Base):
    __tablename__ = "test_requests"
    id = Column(Integer, primary_key=True)
    test_type_id = Column(Integer, ForeignKey("test_types.id"), nullable=False)
    symptom_id = Column(Integer, ForeignKey("symptoms.id"), nullable=False)
    lab_id = Column(Integer, ForeignKey("medical_labs.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    upload_token = Column(
        String, unique=True, index=True, default=lambda: str(uuid.uuid4())
    )
    requested_at = Column(DateTime, default=datetime.utcnow)
    uploaded_result_path = Column(String, nullable=True)
    status = Column(
        SQLEnum(TestRequestStatus, native_enum=False), default=TestRequestStatus.PENDING
    )

    # Add these relationships
    test_type = relationship("TestType", backref="test_requests")
    doctor = relationship("Doctor", backref="test_requests")
    lab = relationship("MedicalLab", backref="test_requests")

    # These are already defined
    test_results = relationship("TestResults", back_populates="test_request")
    symptom = relationship("Symptom", back_populates="test_requests")
    appointments = relationship(
        "Appointment", back_populates="test_request", cascade="all, delete-orphan"
    )


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
