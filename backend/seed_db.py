from datetime import datetime, timezone, timedelta
import random
from faker import Faker
import uuid
from sqlalchemy.orm import Session
from models import (
    User, Doctor, Patient, LabStaff, Symptom, Diagnosis, Consent,
    SymptomStatus, RoleEnum, GenderEnum, ConsentPurpose, MedicalLab, TestRequestStatus,
    TestType, TestRequest, TestResults, Appointment, AppointmentStatus
)
from database import SessionLocal
from passlib.hash import bcrypt
from brownie import accounts, network

fake = Faker()
network.connect('ganache-local')

def create_user(db: Session, role: str, account_index: int) -> User:
    # Check if you're already connected to Ganache
    if network.is_connected():
        print("Already connected to Ganache.")
    else:
        network.connect('ganache-local')  # Ensure you're connected to the Ganache network

    # Get Ganache accounts
    ganache_accounts = accounts  # Brownie automatically loads accounts
    if account_index >= len(ganache_accounts):
        raise ValueError(f"Account index {account_index} is out of range. Ganache only has {len(ganache_accounts)} accounts.")

    # Get the Ganache account based on account_index
    user_account = ganache_accounts[account_index]
    print(f"Creating user {role} with account: {user_account.address}")

    # Create the user
    user = User(
        username=fake.user_name(),
        hashed_password=bcrypt.hash("test123"),
        role=RoleEnum[role.upper()],
        name=fake.name(),
        gender=random.choice([GenderEnum.MALE, GenderEnum.FEMALE]),
        age=random.randint(18, 80),
        is_active=True,
        timestamp=datetime.now(timezone.utc),
        eth_address=user_account.address,  # Store Ethereum address
    )

    # Add user to DB
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


def create_lab_staff(db: Session, user: User, lab: MedicalLab) -> LabStaff:
    lab_staff = LabStaff(
        id=user.id,
        location=fake.city(),
        specialties=fake.word(),
        lab_id=lab.id
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

def create_test_type(db: Session):
    test_types = [
        'Complete Blood Count (CBC)',
        'Basic Metabolic Panel',
        'Comprehensive Metabolic Panel',
        'Lipid Panel',
        'Thyroid Function Panel',
        'Liver Function Tests',
        'Kidney Function Tests',
        'HbA1c & Glucose',
        'Cardiac Stress Test',
        'Electrocardiogram (ECG)',
        'Chest X-Ray',
        'Lumbar Spine X-Ray',
        'MRI Scan',
        'CT Scan',
        'Ultrasound',
        'Skin Allergy Panel',
        'Food Allergy Panel',
        'Urinalysis',
        'Stool Analysis',
        'Blood Culture'
    ]
    
    # Adding each test type to the database
    for test_type_name in test_types:
        test_type = TestType(
            name=test_type_name
        )
        db.add(test_type)
    
    db.commit()
    print(f"✅ {len(test_types)} test types added to the database.")



def seed_db():
    print("Seeding database...")
    db = SessionLocal()

    try:
        users = []
        doctors = []
        labs = []  # Track created medical labs
        lab_staffs = []  # Track created lab staff

        account_index = 0  # Start with the first account
         # Debugging: Print out Ganache accounts count and actual accounts
        print(f"Ganache accounts available: {len(accounts)}")
        print(f"Ganache accounts: {accounts}")


        # Step 1: Create users with different roles
        for role in ['DOCTOR', 'PATIENT', 'LAB_STAFF']:
            for _ in range(3):  # Create 3 users for each role
                if account_index >= len(accounts):
                    raise ValueError("Not enough accounts in Ganache to create users.")

                # Map Ganache account to user (using account_index)
                user = create_user(db, role, account_index=account_index)
                users.append(user)
                account_index += 1  # Increment index to use the next Ganache account

                if role == 'DOCTOR':
                    doctor = create_doctor(db, user)
                    doctors.append(doctor)
                elif role == 'LAB_STAFF':
                    # Ensure labs are created before assigning lab staff
                    if not labs:  # If no labs exist yet, create them
                        for _ in range(5):  # Create 5 labs for testing purposes
                            lab = create_medical_lab(db)
                            labs.append(lab)
                    lab = random.choice(labs)
                    lab_staff = create_lab_staff(db, user, lab)
                    lab_staffs.append(lab_staff)

        # Step 2: Create test types
        create_test_type(db)

        # Step 3: Create patients
        for user in users:
            if user.role == RoleEnum.PATIENT:
                create_patient(db, user, doctors)
                
        print("✅ Database seeded successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()