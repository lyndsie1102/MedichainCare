from datetime import datetime, timezone
import random
from faker import Faker
import uuid
from sqlalchemy.orm import Session
from models import (
    User, Doctor, Patient, LabStaff, Symptom, Diagnosis, Consent,
    SymptomStatus, RoleEnum, GenderEnum, ConsentPurpose, MedicalLab, TestType, TestRequest, TestResults
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
        status=random.choice(list(SymptomStatus)),
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
    test_request = TestRequest(
        symptom_id=symptom.id,
        lab_id=lab.id,
        doctor_id=doctor.id,
        test_type_id=test_type.id,  # Associate test type
        requested_at=datetime.now(timezone.utc),
        status=SymptomStatus.PENDING
    )
    db.add(test_request)
    db.commit()
    db.refresh(test_request)
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
    db.commit()
    db.refresh(test_result)  # Refresh to get the updated record with the ID

    return test_result

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

        # Step 3: Create test types
        create_test_type(db)

        # Step 4: Create patients
        for user in users:
            if user.role == RoleEnum.PATIENT:
                create_patient(db, user, doctors)

        # Step 5: Create symptoms, diagnoses, consents for patients
        patients = db.query(Patient).all()
        doctor = db.query(Doctor).first()
        if not doctor:
            print("❌ No doctors found. Cannot continue.")
            return

        for patient in patients:
            for _ in range(random.randint(1, 3)):
                symptom = create_symptom(db, patient=patient)
                create_diagnosis(db, symptom, patient, doctor)
                create_consents_for_symptom(db, symptom, patient)

        # Step 6: Create Test Requests
        labs = db.query(MedicalLab).all()
        test_types = db.query(TestType).all()
        for patient in patients:
            for _ in range(random.randint(1, 2)):  # Random test requests per patient
                symptom = db.query(Symptom).filter(Symptom.patient_id == patient.id).first()
                if symptom:
                    lab = random.choice(labs)
                    test_type = random.choice(test_types)
                    test_request = create_test_request(db, symptom, lab, doctor, test_type)
                    
                    # Now create test results for the test request
                    create_test_results(db, test_request)
            print("✅ Database seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
