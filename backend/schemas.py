from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
from models import SymptomStatus, GenderEnum, RoleEnum, ConsentPurpose

class UserCreate(BaseModel):
    username: str
    password: str
    role: RoleEnum
    name: str
    gender: GenderEnum
    age: int

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    name: str
    gender: GenderEnum
    age: int

class ConsentOut(BaseModel):
    treatment: bool
    referral: bool
    research: Optional[bool] = False

class SymptomCreate(BaseModel):
    symptoms: str
    image_path: Optional[str] = None
    consent_type: ConsentOut

class PatientOut(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class DoctorOut(BaseModel):
    id: int
    name: str
    specialty: str

class DiagnosisCreate(BaseModel):
    symptom_id: int
    patient_id: int
    diagnosis_content: str


class SymptomOut(BaseModel):
    id: int
    symptoms: str
    image_path: Optional[List[str]]
    status: str
    submitted_at: datetime
    consents: List[str] 

class DiagnosisOut(BaseModel):
    id: str
    doctorId: str
    doctorName: str
    analysis: str
    createdAt: datetime

class MedicalLabs(BaseModel):
    id: int
    name: str
    location: str
    specialties: List[str]

class LabAssignmentCreate(BaseModel):
    symptom_id: int
    lab_id: int

class LabAssignmentOut(BaseModel):
    id: int
    symptom_id: int
    lab_id: int
    doctor_id: int
    upload_token: str

class TestResultOut(BaseModel):
    uploadedAt: datetime
    files: List[dict]  # Each file contains name, url, and type
    summary: Optional[str] = None

class PatientSymptomDetails(BaseModel):
    id: str
    patient: PatientOut
    symptoms: str
    testType: Optional[str] = None
    testResults: Optional[List[TestResultOut]] = []
    images: List[str] 
    submittedAt: datetime
    status: SymptomStatus
    diagnoses: List[DiagnosisOut]
    consent: ConsentOut

class ReferralCreate(BaseModel):
    symptom_id: int
    referral_doctor_id: int

    class Config:
        from_attributes = True
        use_enum_values = True