import pytest
from models import RoleEnum, User
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import Base, engine
from fastapi.testclient import TestClient
from main import app
from models import (
    Doctor,
    Patient,
    LabStaff,
    MedicalLab,
    TestRequest,
    TestResults,
    TestType,
    Diagnosis,
    Appointment,
    Symptom,
    GenderEnum,
    SymptomStatus,
    ConsentPurpose,
    Consent,
    Referral,
    AppointmentStatus,
    TestRequestStatus,
)
from app.auth import pwd_context, create_access_token
from database import get_db


@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# Test database setup fixture
@pytest.fixture(scope="function")
def test_db(db_engine):
    connection = engine.connect()
    # Begin a transaction
    transaction = connection.begin()
    # Bind a session to that transaction
    db = Session(bind=connection)
    try:
        yield db
    finally:
        db.close()
        # Roll back the transaction after the test is done
        transaction.rollback()
        connection.close()


# FastAPI TestClient fixture
@pytest.fixture(scope="function")
def client(test_db: Session):
    def override_get_db():
        try:
            yield test_db
        finally:
            # The test_db fixture itself handles the closing/rollback
            pass

    # Apply the override
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# Fixture to create a test user with a specific role
@pytest.fixture(scope="function")
def test_user(test_db):
    def _create(role: RoleEnum, username_suffix: str, password="testpassword"):
        # Use the pwd_context to hash the password
        hashed_password = pwd_context.hash(password)

        user = User(
            username=f"{username_suffix}_{role.name.lower()}",
            # --- FIX: Store the *hashed* password ---
            hashed_password=hashed_password,
            role=role,
            eth_address=f"0x{uuid.uuid4().hex}",
            name=f"{role.value}_name",
            gender=GenderEnum.MALE,
            age=30,
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        return user

    return _create


# Fixtures to create users with different roles
@pytest.fixture(scope="function")
def patient_user(test_user):
    return test_user(RoleEnum.PATIENT, username_suffix="patient")


@pytest.fixture(scope="function")
def doctor_user(test_user):
    return test_user(RoleEnum.DOCTOR, username_suffix="doctor")


@pytest.fixture
def gp_doctor(test_user, test_db):
    """Creates a doctor user to act as a General Practitioner."""
    # FIX: Provide a unique username_suffix
    doctor_user = test_user(
        role=RoleEnum.DOCTOR, username_suffix="gp_house", password="gp_doctor_user"
    )
    doctor_user.name = "House"

    doctor_record = Doctor(id=doctor_user.id, specialty="General Medicine")
    test_db.add(doctor_record)
    test_db.commit()  # This commit saves both the user and doctor profile
    test_db.refresh(doctor_user)
    return doctor_user


@pytest.fixture
def specialist_doctor(test_user, test_db):
    """Creates a second doctor user to act as a Specialist for referrals."""
    # FIX: Provide a different, unique username_suffix
    doctor_user = test_user(
        role=RoleEnum.DOCTOR,
        username_suffix="specialist_cuddy",
        password="specialistpassword",
    )
    doctor_user.name = "Dr. Cuddy"

    doctor_record = Doctor(id=doctor_user.id, specialty="Cardiology")
    test_db.add(doctor_record)
    test_db.commit()
    test_db.refresh(doctor_user)
    return doctor_user


@pytest.fixture
def patient_user_with_gp(test_user, gp_doctor, test_db):
    """Creates a patient user with a linked patient profile, assigned to a GP."""
    # FIX: Provide a unique username_suffix
    patient_user = test_user(
        role=RoleEnum.PATIENT, username_suffix="johndoe", password="testpassword123"
    )
    # ... (rest of the fixture is fine)
    patient_user.name = "John Doe"
    patient_record = Patient(
        user=patient_user,
        gp_id=gp_doctor.id,
        location="Testville",
        email="john.doe@test.com",
    )
    test_db.add(patient_record)
    test_db.commit()
    test_db.refresh(patient_user)
    return patient_user


@pytest.fixture
def lab_staff_user(test_user, medical_lab, test_db):
    """Creates a lab staff user associated with a medical lab."""
    # FIX: Provide a unique username_suffix
    staff_user = test_user(
        role=RoleEnum.LAB_STAFF,
        username_suffix="marie_curie",
        password="test_lab_staff",
    )
    # ... (rest of the fixture is fine)
    staff_user.name = "Marie Curie"
    staff_record = LabStaff(
        id=staff_user.id,
        location="Lab City",
        specialties="Bloodwork",
        lab_id=medical_lab.id,
    )
    test_db.add(staff_record)
    test_db.commit()
    test_db.refresh(staff_user)
    return staff_user


@pytest.fixture
def token_factory():
    def _make(user: User):
        payload = {
            "sub": user.username,
            "role": user.role.value if hasattr(user.role, "value") else user.role,
            "eth_address": user.eth_address,
        }

        return create_access_token(data=payload)

    return _make


# auth token for doctor
@pytest.fixture
def doctor_auth_token(doctor_user, token_factory):
    return token_factory(doctor_user)


# auth token for gp doctor
@pytest.fixture
def gp_auth_token(gp_doctor, token_factory):
    return token_factory(gp_doctor)


# auth token for specialist doctor
@pytest.fixture
def specialist_auth_token(specialist_doctor, token_factory):
    return token_factory(specialist_doctor)


# auth token for patient
@pytest.fixture
def patient_auth_token(patient_user, token_factory):
    return token_factory(patient_user)


# auth token for lab staff
@pytest.fixture
def lab_auth_token(lab_staff_user, token_factory):
    return token_factory(lab_staff_user)


@pytest.fixture
def details_patient_auth_token(patient_user_with_gp, token_factory):
    return token_factory(patient_user_with_gp)


@pytest.fixture
def medical_lab(test_db):
    lab = MedicalLab(
        name="TestLab Inc.", location="Lab City", specialties="Bloodwork,Genetics"
    )
    test_db.add(lab)
    test_db.commit()
    test_db.refresh(lab)
    return lab


@pytest.fixture
def test_type(test_db):
    ttype = TestType(name="Blood Test")
    test_db.add(ttype)
    test_db.commit()
    test_db.refresh(ttype)
    return ttype


@pytest.fixture
def symptom(test_db, patient_user):
    """Creates a basic symptom record for the test patient."""
    s = Symptom(
        patient_id=patient_user.id,
        symptoms="High fever and persistent cough",
        image_paths='["uploads/lab_images/fake1.jpg"]',
        consent_treatment=True,
        consent_referral=True,
        consent_research=True,
    )
    test_db.add(s)
    test_db.commit()
    test_db.refresh(s)
    return s


@pytest.fixture
def diagnosis(test_db, symptom, patient_user, gp_doctor):
    diag = Diagnosis(
        symptom_id=symptom.id,
        patient_id=patient_user.id,
        doctor_id=gp_doctor.id,
        diagnosis_content="Initial analysis suggests a viral infection.",
    )
    test_db.add(diag)
    test_db.commit()
    test_db.refresh(diag)
    return diag


@pytest.fixture
def test_request(test_db, symptom, gp_doctor, medical_lab, test_type):
    tr = TestRequest(
        symptom_id=symptom.id,
        doctor_id=gp_doctor.id,
        lab_id=medical_lab.id,
        test_type_id=test_type.id,
    )
    test_db.add(tr)
    test_db.commit()
    test_db.refresh(tr)
    return tr


@pytest.fixture
def appointment(test_db, test_request, patient_user, lab_staff_user):
    appt = Appointment(
        test_request_id=test_request.id,
        patient_id=patient_user.id,
        lab_staff_id=lab_staff_user.id,
        status="Scheduled",
        scheduled_at=datetime(2023, 10, 28, 10, 0, 0),
    )
    test_db.add(appt)
    test_db.commit()
    test_db.refresh(appt)
    return appt


@pytest.fixture
def test_result(test_db, test_request):
    result = TestResults(
        test_request_id=test_request.id,
        files=[{"name": "result.pdf", "url": "/results/result.pdf"}],
        summary="Patient's white blood cell count is elevated.",
    )
    test_db.add(result)
    test_db.commit()
    test_db.refresh(result)
    return result


@pytest.fixture
def symptom_for_gp(test_db, patient_user_with_gp):
    """Creates a basic PENDING symptom record for the patient assigned to the GP."""
    s = Symptom(
        patient_id=patient_user_with_gp.id,
        symptoms="Chest pain and shortness of breath",
        image_paths="[]",
        status=SymptomStatus.PENDING,
        consent_treatment=True,
        consent_referral=True,
        consent_research=True,
    )
    test_db.add(s)
    test_db.commit()
    test_db.refresh(s)
    return s


@pytest.fixture
def referred_symptom(test_db, symptom_for_gp, specialist_doctor):
    """Creates a referral record for a symptom to the specialist."""
    referral = Referral(
        symptom_id=symptom_for_gp.id, referral_doctor_id=specialist_doctor.id
    )
    # Also create the corresponding consent
    consent = Consent(
        symptom_id=symptom_for_gp.id,
        patient_id=symptom_for_gp.patient_id,
        doctor_id=specialist_doctor.id,
        consent_type=ConsentPurpose.REFERRAL,
        is_granted=True,
    )
    test_db.add_all([referral, consent])
    symptom_for_gp.status = SymptomStatus.REFERRED
    test_db.commit()
    test_db.refresh(symptom_for_gp)
    return symptom_for_gp


@pytest.fixture
def assigned_test_request(test_db, symptom_for_gp, gp_doctor, medical_lab, test_type):
    """
    Creates a TestRequest that has been assigned by a GP to the main medical lab.
    This is the state before a lab staff member has interacted with it.
    """
    tr = TestRequest(
        symptom_id=symptom_for_gp.id,
        doctor_id=gp_doctor.id,
        lab_id=medical_lab.id,
        test_type_id=test_type.id,
        status=TestRequestStatus.PENDING,
    )
    symptom_for_gp.status = SymptomStatus.ASSIGNED
    test_db.add(tr)
    test_db.commit()
    test_db.refresh(tr)
    return tr


@pytest.fixture
def scheduled_appointment(test_db, assigned_test_request, lab_staff_user):
    """Creates a scheduled appointment for a test request."""
    # Schedule for a predictable future time
    scheduled_time = datetime.utcnow().replace(
        hour=10, minute=0, second=0, microsecond=0
    ) + timedelta(days=5)

    appt = Appointment(
        test_request_id=assigned_test_request.id,
        patient_id=assigned_test_request.symptom.patient_id,
        lab_staff_id=lab_staff_user.id,
        status=AppointmentStatus.SCHEDULED,
        scheduled_at=scheduled_time,
    )
    assigned_test_request.symptom.status = SymptomStatus.WAITING
    test_db.add(appt)
    test_db.commit()
    test_db.refresh(appt)
    return appt
