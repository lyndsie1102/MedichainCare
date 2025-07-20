from datetime import datetime, timezone
import random
from faker import Faker
from sqlalchemy.orm import Session
from models import (
    User, Doctor, Patient, LabStaff, Symptom, Diagnosis, Consent,
    SymptomStatus, RoleEnum, GenderEnum, ConsentPurpose, MedicalLab
)
from database import SessionLocal
from passlib.hash import bcrypt

fake = Faker()

def create_user(db: Session, role: str) -> User:
    user = User(
        username=fake.user_name(),
        hashed_password = bcrypt.hash("test123"),
        role=RoleEnum[role.upper()],
        name=fake.name(),
        gender=random.choice([GenderEnum.MALE, GenderEnum.FEMALE]),
        age=random.randint(18, 80),
        is_active=True,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_doctor(db: Session, user: User) -> Doctor:
    medical_specialties = [
        "Cardiology",
        "Dermatology",
        "Neurology",
        "Orthopedics",
        "Pediatrics",
        "Radiology",
        "Oncology",
        "Internal Medicine",
        "Emergency Medicine",
        "Endocrinology",
        "Psychiatry",
        "Gastroenterology",
        "Nephrology",
        "Ophthalmology",
        "Urology"
    ]
    doctor = Doctor(
        id=user.id,
        specialty=random.choice(medical_specialties)
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def create_patient(db: Session, user: User, doctors: list[User]) -> Patient:
    gp = random.choice(doctors)
    patient = Patient(
        id=user.id,
        gp_id=gp.id,
        location=fake.city(),
        phone_number=fake.phone_number(),
        email=fake.email()
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def create_lab_staff(db: Session, user: User) -> LabStaff:
    lab_staff = LabStaff(
        id=user.id,
        location=fake.city(),
        specialties=fake.word()
    )
    db.add(lab_staff)
    db.commit()
    db.refresh(lab_staff)
    return lab_staff


def create_medical_lab(db: Session) -> MedicalLab:
    specialties = [
        "Pathology",
        "Hematology",
        "Microbiology",
        "Genetics",
        "Radiology",
        "Toxicology",
        "Immunology"
    ]
    lab = MedicalLab(
        name=f"{fake.last_name()} Medical Lab",
        location=fake.city(),
        specialties=", ".join(random.sample(specialties, k=random.randint(1, 3)))
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab


def create_symptom(db: Session, patient_id: int) -> Symptom:
    symptom = Symptom(
        patient_id=patient_id,
        symptoms=fake.text(max_nb_chars=50),
        image_path="images/sample.png" if random.random() < 0.5 else None,
        status=random.choice(list(SymptomStatus)),
        timestamp=datetime.now(timezone.utc)
    )
    db.add(symptom)
    db.commit()
    db.refresh(symptom)
    return symptom


def create_diagnosis(db: Session, symptom: Symptom, patient: Patient, doctor: Doctor) -> Diagnosis:
    diagnosis = Diagnosis(
        symptom_id=symptom.id,
        patient_id=patient.id,
        doctor_id=doctor.id,
        diagnosis_content=fake.text(max_nb_chars=100),
        timestamp=datetime.now(timezone.utc)
    )
    db.add(diagnosis)
    db.commit()
    db.refresh(diagnosis)
    return diagnosis


def create_consent(db: Session, symptom: Symptom, patient: Patient, doctor: User) -> Consent:
    consent = Consent(
        symptom_id=symptom.id,
        patient_id=patient.id,
        doctor_id=doctor.id,
        consent_type=random.choice(list(ConsentPurpose)),
        is_granted=True,
        granted_at=datetime.now(timezone.utc),
        revoked_at=None
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return consent


def seed_db():
    print("Seeding database...")
    db = SessionLocal()

    try:
        users = []
        doctors = []

        # Step 1: Create users with different roles
        for role in ['DOCTOR', 'PATIENT', 'LAB_STAFF']:
            for _ in range(3):  # Create 3 users for each role
                user = create_user(db, role)
                users.append(user)
                if role == 'DOCTOR':
                    create_doctor(db, user)
                    doctors.append(user)
                elif role == 'LAB_STAFF':
                    create_lab_staff(db, user)

        # Step 2: Create medical labs
        for _ in range(5):  # Create 5 medical labs
            create_medical_lab(db)

        # Step 3: Create patients
        for user in users:
            if user.role == RoleEnum.PATIENT:
                create_patient(db, user, doctors)

        # Step 4: Create symptoms, diagnoses, consents for patients
        patients = db.query(Patient).all()
        doctor = db.query(Doctor).first()
        if not doctor:
            print("❌ No doctors found. Cannot continue.")
            return

        for patient in patients:
            for _ in range(random.randint(1, 3)):
                symptom = create_symptom(db, patient_id=patient.id)
                create_diagnosis(db, symptom, patient, doctor)
                create_consent(db, symptom, patient, doctor)

        print("✅ Database seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
