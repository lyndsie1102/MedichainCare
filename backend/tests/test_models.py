import pytest
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from models import (
    User,
    Doctor,
    Patient,
    MedicalLab,
    LabStaff,
    Appointment,
    Symptom,
    Diagnosis,
    Consent,
    TestRequest,
    Referral,
    TestResults,
    RoleEnum,
    SymptomStatus,
    ConsentPurpose,
)


class TestUserAndProfileModels:
    """Tests for User, Patient, Doctor, and LabStaff models and their relationships."""

    def test_user_creation(self, test_db, patient_user_with_gp, gp_doctor):
        """Verify that user fixtures correctly create users in the DB."""
        # The fixtures already create the users, we just need to query and verify
        patient = (
            test_db.query(User).filter_by(username=patient_user_with_gp.username).one()
        )
        doctor = test_db.query(User).filter_by(username=gp_doctor.username).one()

        assert patient is not None
        assert patient.role == RoleEnum.PATIENT
        assert patient.name == "John Doe"

        assert doctor is not None
        assert doctor.role == RoleEnum.DOCTOR
        assert doctor.name == "House"

    def test_username_uniqueness_constraint(self, test_db, test_user):
        """Ensures the database enforces unique usernames."""
        # Create the first user using the factory fixture
        test_user(role=RoleEnum.PATIENT, username_suffix="duplicate_user")

        # Manually create a second user with the same username
        duplicate_user = User(
            username="duplicate_user_patient",  # Same username as fixture would create
            hashed_password="anotherpassword",
            role=RoleEnum.DOCTOR,
            eth_address="0xdupe",
        )
        test_db.add(duplicate_user)

        # Assert that committing this change raises an IntegrityError
        with pytest.raises(IntegrityError):
            test_db.commit()

    def test_patient_gp_relationship(self, test_db, patient_user_with_gp, gp_doctor):
        """Tests the bidirectional relationship between a Patient and their GP (Doctor)."""
        # Retrieve the patient and doctor from the DB to ensure relationships are loaded
        patient = test_db.query(Patient).filter_by(id=patient_user_with_gp.id).one()
        gp = test_db.query(User).filter_by(id=gp_doctor.id).one()

        # Test from patient to GP
        assert patient.gp_id == gp.id
        assert patient.gp is not None
        assert patient.gp.username == gp_doctor.username
        assert patient.gp.doctor.specialty == "General Medicine"

        # Test from GP to patient (back-population)
        assert len(gp.patients_as_gp) == 1
        assert gp.patients_as_gp[0].id == patient.id
        assert gp.patients_as_gp[0].user.name == "John Doe"

    def test_lab_staff_relationship(self, test_db, lab_staff_user, medical_lab):
        """Tests the relationship between LabStaff, User, and MedicalLab."""
        staff = test_db.query(LabStaff).filter_by(id=lab_staff_user.id).one()
        lab = test_db.query(MedicalLab).filter_by(id=medical_lab.id).one()

        # The user relationship is implicit through the shared primary key
        assert staff.id == lab_staff_user.id

        # Test relationship to the lab
        assert staff.lab_id == lab.id

        # Test the @property on MedicalLab
        assert lab.specialties_list == ["Bloodwork", "Genetics"]


class TestSymptomWorkflowModels:
    """Tests for models involved in the diagnostic workflow: Symptom, Diagnosis, Referral, Consent."""

    def test_symptom_creation(self, test_db, symptom_for_gp, patient_user_with_gp):
        """Verify that a symptom is created and linked to the correct patient."""
        s = test_db.query(Symptom).filter_by(id=symptom_for_gp.id).one()

        assert s is not None
        assert s.patient_id == patient_user_with_gp.id
        assert s.symptoms == "Chest pain and shortness of breath"
        assert s.status == SymptomStatus.PENDING

    def test_symptom_referral_and_consent(
        self, test_db, referred_symptom, specialist_doctor
    ):
        """Verify that creating a referral also creates consent and updates status."""
        # The referred_symptom fixture handles the creation and status update
        symptom = test_db.query(Symptom).filter_by(id=referred_symptom.id).one()

        # Check that the symptom status was updated by the fixture
        assert symptom.status == SymptomStatus.REFERRED

        # Check that the Referral record was created
        referral = test_db.query(Referral).filter_by(symptom_id=symptom.id).one()
        assert referral is not None
        assert referral.referral_doctor_id == specialist_doctor.id

        # Check that the Consent record was created and is linked
        consent = test_db.query(Consent).filter_by(symptom_id=symptom.id).one()
        assert consent is not None
        assert consent.consent_type == ConsentPurpose.REFERRAL
        assert consent.doctor_id == specialist_doctor.id
        assert consent in symptom.consents

    def test_symptom_diagnosis_relationship(self, test_db, diagnosis):
        """Verify the relationship between a Diagnosis and its parent Symptom."""
        diag = test_db.query(Diagnosis).filter_by(id=diagnosis.id).one()

        assert diag is not None
        assert diag.symptom_id == diagnosis.symptom_id
        assert diag.diagnosis_content == "Initial analysis suggests a viral infection."


class TestTestingWorkflowModels:
    """Tests for models involved in the lab testing workflow: TestRequest, TestResults, Appointment."""

    def test_test_request_creation(self, test_db, assigned_test_request):
        """Verify that a TestRequest is created with correct foreign keys and relationships."""
        tr = test_db.query(TestRequest).filter_by(id=assigned_test_request.id).one()

        assert tr is not None
        assert tr.symptom is not None
        assert tr.doctor is not None
        assert tr.lab is not None
        assert tr.test_type is not None
        assert tr.doctor.user.name == "House"
        assert tr.lab.name == "TestLab Inc."

    def test_test_request_results_relationship(self, test_db, test_result):
        """Verify the one-to-many relationship between TestRequest and TestResults."""
        result = test_db.query(TestResults).filter_by(id=test_result.id).one()

        # Test relationship from result to request
        assert result.test_request is not None
        assert result.test_request.id == test_result.test_request_id

        # Test back-population from request to result
        parent_request = result.test_request
        assert len(parent_request.test_results) == 1
        assert parent_request.test_results[0].id == result.id
        assert (
            parent_request.test_results[0].summary
            == "Patient's white blood cell count is elevated."
        )

    def test_appointment_uniqueness_constraint(
        self, test_db, scheduled_appointment, patient_user_with_gp
    ):
        """
        Tests the unique constraint on (lab_staff_id, scheduled_at) for the Appointment model.
        """
        # The 'scheduled_appointment' fixture has already created one appointment.
        # Now, create a new appointment for the SAME staff member at the EXACT SAME time.
        new_appointment = Appointment(
            patient_id=patient_user_with_gp.id,
            lab_staff_id=scheduled_appointment.lab_staff_id,  # Same staff
            scheduled_at=scheduled_appointment.scheduled_at,  # Same time
            status="Scheduled",
        )
        test_db.add(new_appointment)

        # Committing this should fail due to the UniqueConstraint
        with pytest.raises(IntegrityError):
            test_db.commit()

    def test_appointment_relationship_and_status_update(
        self, test_db, scheduled_appointment
    ):
        """Verify appointment relationships and that symptom status is updated."""
        appt = test_db.query(Appointment).filter_by(id=scheduled_appointment.id).one()

        assert appt is not None
        assert appt.test_request is not None
        assert appt.lab_staff is not None

        # The fixture should have updated the symptom status
        symptom = appt.test_request.symptom
        assert symptom.status == SymptomStatus.WAITING
