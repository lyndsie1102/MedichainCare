from datetime import datetime, timezone
import random
from faker import Faker
from sqlalchemy.orm import Session
from models import (
User,
Doctor,
Patient,
LabStaff,
RoleEnum,
GenderEnum,
MedicalLab,
TestType,
)
from database import SessionLocal
from passlib.hash import bcrypt
from web3 import Web3


fake = Faker()

# --- Configuration ---
NUM_ENTITIES = 3  # We will create 3 of each: doctors, patients, labs, lab_staff
# --- End Configuration ---

# Initialize Web3 and connect to Ganache
try:
    web3 = Web3(Web3.HTTPProvider("http://127.0.0.1:7545"))
    if web3.isConnected():
        print(f"✅ Connected to Ganache at successfully")
        ganache_accounts = web3.eth.accounts
    else:
        print(f"❌ Failed to connect to Ganache.")
        ganache_accounts = []
except Exception as e:
    print(f"❌ Error connecting to Ganache: {e}. Seeding will fail.")
    ganache_accounts = []


# ==============================================================================
# SECTION 1: CORE ENTITY CREATION FUNCTIONS
# ==============================================================================

def create_user(db: Session, role: str, index: int, account_index: int) -> User:
    """Creates a user with a deterministic username and name."""
    if account_index >= len(ganache_accounts):
        raise ValueError(f"Account index {account_index} is out of range.")
    
    user_account = ganache_accounts[account_index]
    username_prefix = role.lower().replace("_", "")
    username = f"{username_prefix}{index + 1}"

    user = User(
        username=username,
        name=username, 
        hashed_password=bcrypt.hash("test123"),
        role=RoleEnum[role.upper()],
        gender=random.choice(list(GenderEnum)),
        age=random.randint(18, 80),
        is_active=True,
        timestamp=datetime.now(timezone.utc),
        eth_address=user_account,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def create_doctor(db: Session, user: User) -> Doctor:
    medical_specialties = ["Cardiology", "Dermatology", "Neurology", "Orthopedics", "Pediatrics"]
    doctor = Doctor(id=user.id, specialty=random.choice(medical_specialties))
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor

def create_patient(db: Session, user: User, gp: Doctor) -> Patient:
    patient = Patient(
        id=user.id,
        gp_id=gp.id,
        location=fake.city(),
        phone_number=fake.phone_number(),
        email=fake.email(),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

def create_lab_staff(db: Session, user: User, lab: MedicalLab) -> LabStaff:
    lab_staff = LabStaff(
        id=user.id, 
        location=lab.location, 
        specialties=lab.specialties, 
        lab_id=lab.id
    )
    db.add(lab_staff)
    db.commit()
    db.refresh(lab_staff)
    return lab_staff

def create_medical_lab(db: Session, index: int) -> MedicalLab:
    specialties = ["Pathology", "Hematology", "Microbiology", "Genetics", "Radiology"]
    lab = MedicalLab(
        name=f"Lab {index + 1} Diagnostics", # Deterministic name
        location=fake.city(),
        specialties=", ".join(random.sample(specialties, k=random.randint(1, 2))),
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab

def create_test_types(db: Session):
    if db.query(TestType).first():
        print("Test types already exist.")
        return
    test_types = [
        "Complete Blood Count (CBC)", "Basic Metabolic Panel", "Lipid Panel",
        "Thyroid Function Panel", "Liver Function Tests", "Urinalysis"
    ]
    for test_type_name in test_types:
        db.add(TestType(name=test_type_name))
    db.commit()
    print(f"✅ {len(test_types)} test types added to the database.")

# ==============================================================================
# SECTION 2: MAIN SEEDING ORCHESTRATOR
# ==============================================================================

def seed_db():
    required_accounts = NUM_ENTITIES * 3 # 3 doctors, 3 patients, 3 lab staff
    if len(ganache_accounts) < required_accounts:
        print(f"❌ Halting: Need at least {required_accounts} Ganache accounts, but found {len(ganache_accounts)}.")
        return
        
    print("Seeding database with specific assignments...")
    db = SessionLocal()

    try:
        # --- Create Labs and Test Types first ---
        print("\nCreating labs and test types...")
        labs = [create_medical_lab(db, i) for i in range(NUM_ENTITIES)]
        create_test_types(db)
        
        doctors, patients, lab_staffs = [], [], []
        account_index = 0

        # --- Create Doctors ---
        print("\nCreating doctors...")
        for i in range(NUM_ENTITIES):
            user = create_user(db, "DOCTOR", i, account_index)
            doctors.append(create_doctor(db, user))
            account_index += 1

        # --- Create Lab Staff with specific lab assignments ---
        print("\nCreating lab staff...")
        for i in range(NUM_ENTITIES):
            user = create_user(db, "LAB_STAFF", i, account_index)
            # Assign lab_staff[i] to lab[i]
            lab_staffs.append(create_lab_staff(db, user, labs[i]))
            account_index += 1

        # --- Create Patients with specific GP assignments ---
        print("\nCreating patients...")
        for i in range(NUM_ENTITIES):
            user = create_user(db, "PATIENT", i, account_index)
            # Assign patient[i] to doctor[i]
            patients.append(create_patient(db, user, doctors[i]))
            account_index += 1

        print("\n✅ Database seeded successfully with specific user relationships.")
        print(f"- patient1 is assigned to doctor1.")
        print(f"- patient2 is assigned to doctor2.")
        print(f"- patient3 is assigned to doctor3.")
        print(f"- lab_staff1 is assigned to Lab 1 Diagnostics.")
        print(f"- lab_staff2 is assigned to Lab 2 Diagnostics.")
        print(f"- lab_staff3 is assigned to Lab 3 Diagnostics.")

    except Exception as e:
        print(f"\n❌ An error occurred during seeding: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
