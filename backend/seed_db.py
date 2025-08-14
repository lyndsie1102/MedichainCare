from datetime import datetime, timezone, timedelta
import random
from faker import Faker
import uuid
from sqlalchemy.orm import Session
from models import (
    User, Doctor, Patient, LabStaff, Symptom, Diagnosis, Consent,
    SymptomStatus, RoleEnum, GenderEnum, ConsentPurpose, MedicalLab, TestRequestStatus,
    TestType, TestRequest, TestResults, Appointment, AppointmentStatus, Slot
)
from database import SessionLocal
from passlib.hash import bcrypt
from brownie import accounts, network

fake = Faker()


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


def create_symptom(db: Session, patient: Patient) -> Symptom:
    # Randomly assign consent booleans
    consent_treatment = True
    consent_referral = True
    consent_research = random.choice([True, False])
       
    # Create a list of image paths
    image_paths = ["https://unsplash.com/photos/woman-with-dslr-camera-e616t35Vbeg", "https://unsplash.com/photos/tall-grass-in-front-of-a-city-skyline-pHmpxFlqAus"] if random.random() < 0.5 else []

    symptom = Symptom(
        patient_id=patient.id,
        symptoms=fake.text(max_nb_chars=50),
        image_paths=image_paths,
        status=SymptomStatus.PENDING,  # Initial status is "PENDING"
        timestamp=datetime.now(timezone.utc),
        consent_treatment=consent_treatment,
        consent_referral=consent_referral,
        consent_research=consent_research
    )
    db.add(symptom)
    db.commit()
    db.refresh(symptom)
    return symptom


def create_consents_for_symptom(db: Session, symptom: Symptom, patient: Patient):
    # Get GP user
    gp_user = db.query(User).filter(User.id == patient.gp_id).first()

    # Treatment consent
    treatment_consent = Consent(
        symptom_id=symptom.id,
        patient_id=patient.id,
        doctor_id=gp_user.id,
        consent_type=ConsentPurpose.TREATMENT,
        is_granted=True,
        granted_at=datetime.now(timezone.utc)
    )
    db.add(treatment_consent)
    
    #Referral consent
    referral_consent = Consent(
        symptom_id=symptom.id,
        patient_id=patient.id,
        doctor_id=gp_user.id,
        consent_type=ConsentPurpose.REFERRAL,
        is_granted=True,
        granted_at=datetime.now(timezone.utc)
    )
    db.add(referral_consent)

    # Research consent
    if symptom.consent_research:
        research_consent = Consent(
            symptom_id=symptom.id,
            patient_id=patient.id,
            doctor_id=None,
            consent_type=ConsentPurpose.RESEARCH,
            is_granted=True,
            granted_at=datetime.now(timezone.utc)
        )
        db.add(research_consent)

    db.commit()


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


def create_test_request(db: Session, symptom: Symptom, lab: MedicalLab, doctor: Doctor, test_type: TestType) -> TestRequest:
    # Create the TestRequest entry
    test_request = TestRequest(
        symptom_id=symptom.id,
        lab_id=lab.id,
        doctor_id=doctor.id,
        test_type_id=test_type.id,  # Associate test type
        requested_at=datetime.now(timezone.utc),
        status=TestRequestStatus.PENDING,  # Initial status is "PENDING"
    )
    db.add(test_request)
    db.commit()
    db.refresh(test_request)

    # After creating the test request, update the symptom status to "Assigned"
    symptom.status = SymptomStatus.ASSIGNED  # Update symptom status to "Assigned"
    db.commit()

    return test_request


def create_test_results(db: Session, test_request: TestRequest) -> TestResults:
    # Randomly generating test result data
    files = [
        {
            "file_name": f"test_result_{str(uuid.uuid4())}.pdf",
            "file_url": fake.url(),
        },
        {
            "file_name": f"test_result_{str(uuid.uuid4())}.png",
            "file_url": fake.url(),
        }
    ]
    
    # Create a random summary for the test result
    summary = fake.text(max_nb_chars=200)

    # Create the TestResult entry
    test_result = TestResults(
        test_request_id=test_request.id,
        files=files,  # Files are stored as a JSON array
        summary=summary,
        uploaded_at=datetime.now(timezone.utc)
    )

    # Commit the new test result to the database
    db.add(test_result)

    # ✅ Update TestRequest and Symptom statuses
    test_request.uploaded_result_path = files[0]["file_url"]
    test_request.status = "uploaded"
    test_request.symptom.status = SymptomStatus.TESTED  # Update symptom status to "Tested"
    
    db.commit()
    db.refresh(test_result)  # Refresh to get the updated record with the ID

    return test_result

def get_end_of_next_month(current_date: datetime) -> datetime:
    """
    Calculate the last day of the next month from the current date.
    """
    # Get the first day of the current month
    first_of_current_month = current_date.replace(day=1)
    
    # Add one month to it, and then subtract one day to get the last day of next month
    next_month = first_of_current_month.replace(month=current_date.month % 12 + 1)
    end_of_next_month = next_month - timedelta(days=1)
    
    return end_of_next_month

def create_slots_for_lab_staff(db: Session, lab_staff: LabStaff, start_date: datetime, end_date: datetime):
    current_date = start_date
    while current_date <= end_date:
        slots = Slot.generate_slots(lab_staff.id, current_date)
        db.bulk_save_objects(slots)
        db.commit()
        print(f"✅ {len(slots)} slots created for lab staff {lab_staff.id} on {current_date.date()}")
        current_date += timedelta(days=1)

def create_appointments_for_patients(db: Session, patients: list[Patient], labs: list[MedicalLab], doctors: list[Doctor]):
    for patient in patients:
        # Pick a random lab staff
        lab_staff = random.choice(db.query(LabStaff).all())
    
        # Pick a random date (e.g., today)
        date = datetime.now().date()

        # Get available slots for the lab staff using LabStaff model
        available_slots = LabStaff.get_slots_for_date(db, lab_staff.id, date)  # Pass db session here

        if available_slots:
            # Pick a random available slot
            slot = random.choice(available_slots)

            # Check if a TestRequest exists for the patient, or create one
            test_request = db.query(TestRequest).join(Symptom).filter(Symptom.patient_id == patient.id).first()

            if not test_request:
                # Create a TestRequest if it doesn't exist
                test_request = TestRequest(
                    patient_id=patient.id,
                    lab_id=random.choice(labs).id,  # You can pick a random lab here
                    doctor_id=random.choice(doctors).id,  # And a random doctor
                    status="PENDING"  # Default status
                )
                db.add(test_request)
                db.commit()
                db.refresh(test_request)  # Ensure test_request has an ID after commit

            # Create an appointment for the patient
            appointment = Appointment(
                patient_id=patient.id,
                test_request_id=test_request.id,
                lab_staff_id=lab_staff.id,
                slot_id=slot.id
            )
            db.add(appointment)

            # Mark the slot as unavailable
            slot.is_available = False
            db.commit()

            print(f"✅ Appointment created for Patient {patient.id} with Lab Staff {lab_staff.id} at Slot {slot.id}")
        else:
            print(f"⚠️ No available slots for Lab Staff {lab_staff.id} on {date}")


def seed_db():
    print("Seeding database...")
    db = SessionLocal()

    try:
        users = []
        doctors = []
        labs = []  # Track created medical labs
        lab_staffs = []  # Track created lab staff

        # Step 1: Create users with different roles
        for role in ['DOCTOR', 'PATIENT', 'LAB_STAFF']:
            for i in range(3):  # Create 3 users for each role
                # Map Ganache account to user (using account_index)
                user = create_user(db, role, account_index=i)
                users.append(user)

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

        # Step 4: Create symptoms, diagnoses, consents for patients
        patients = db.query(Patient).all()
        doctor = db.query(Doctor).first()
        if not doctor:
            print("❌ No doctors found. Cannot continue.")
            return

        for patient in patients:
            for _ in range(5):
                symptom = create_symptom(db, patient=patient)
                create_diagnosis(db, symptom, patient, doctor)
                create_consents_for_symptom(db, symptom, patient)

        # Step 5: Create Test Requests
        labs = db.query(MedicalLab).all()
        test_types = db.query(TestType).all()
        for patient in patients:
            symptoms = db.query(Symptom).filter(Symptom.patient_id == patient.id).all()
            for symptom in symptoms:  # Create a test request for each symptom
                lab = random.choice(labs)
                test_type = random.choice(test_types)
                test_request = create_test_request(db, symptom, lab, doctor, test_type)

        # Step 6: Create slots for lab staff from now until the end of next month
        for lab_staff in lab_staffs:
            # Get today's date and the last date of next month
            today = datetime.now()
            end_of_next_month = get_end_of_next_month(today)

            # Create slots for the period from today to the end of next month
            create_slots_for_lab_staff(db, lab_staff, today, end_of_next_month)

        # Step 7: Create appointments for patients
        create_appointments_for_patients(db, patients, labs, doctors)

        print("✅ Database seeded successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()