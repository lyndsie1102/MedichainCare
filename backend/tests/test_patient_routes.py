import os
import json
import io
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models import Symptom, Consent, ConsentPurpose


def test_get_patient_details(client: TestClient, patient_auth_token: str, patient_user):
    response = client.get(
        "/patients/patient/me",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
    )
    assert (
        response.status_code == 200
    ), response.text  # Adding response.text helps in debugging
    data = response.json()
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")

    # Assert against the correct user object
    assert data["name"] == patient_user.name


def test_get_patient_details_unauthenticated(client: TestClient):
    """Test that unauthenticated users cannot access the endpoint."""
    response = client.get("/patients/patient/me")
    assert response.status_code == 401


def test_get_patient_details_wrong_role(client: TestClient, doctor_auth_token: str):
    """Test that a non-patient (e.g., doctor) cannot access the patient details endpoint."""
    response = client.get(
        "/patients/patient/me",
        headers={
            "Authorization": f"Bearer {doctor_auth_token}"
        },  # auth_token is for a doctor
    )
    assert response.status_code == 403
    assert (
        response.json()["detail"] == "User are not authorized to access this endpoint."
    )


def test_upload_image(client: TestClient):
    # Create a fake file in memory
    fake_file_content = b"fake-image-bytes"
    file_to_upload = ("test_image.jpg", io.BytesIO(fake_file_content), "image/jpeg")

    response = client.post("/patients/upload-image/", files={"files": file_to_upload})

    assert response.status_code == 200
    data = response.json()
    assert "image_paths" in data
    assert len(data["image_paths"]) == 1

    # Verify file was saved and clean up
    saved_path = data["image_paths"][0]
    assert os.path.exists(saved_path)
    os.remove(saved_path)


def test_submit_symptoms_success(
    client: TestClient,
    test_db: Session,
    details_patient_auth_token: str,
    patient_user_with_gp,
):
    """Test successfully submitting symptoms with required consents."""
    symptom_data = {
        "symptoms": "Headache and blurred vision",
        "image_paths": ["uploads/lab_images/fake_path.jpg"],
        "consent_type": {"treatment": True, "referral": True, "research": True},
    }
    response = client.post(
        "/patients/symptoms/",
        headers={"Authorization": f"Bearer {details_patient_auth_token}"},
        json=symptom_data,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Symptom submitted"
    assert "id" in data

    # Verify database records were created
    symptom_id = data["id"]
    db_symptom = test_db.query(Symptom).filter(Symptom.id == symptom_id).one()
    assert db_symptom.patient_id == patient_user_with_gp.id
    assert db_symptom.symptoms == "Headache and blurred vision"
    assert db_symptom.consent_treatment is True
    assert db_symptom.consent_research is True

    db_consents = test_db.query(Consent).filter(Consent.symptom_id == symptom_id).all()
    assert len(db_consents) == 2  # Treatment and Research
    consent_types = {c.consent_type for c in db_consents}
    assert ConsentPurpose.TREATMENT in consent_types
    assert ConsentPurpose.RESEARCH in consent_types


def test_submit_symptoms_missing_consent(client: TestClient, patient_auth_token: str):
    """Test that submitting symptoms fails if required consent is not given."""
    symptom_data = {
        "symptoms": "This should fail",
        "image_paths": [],
        "consent_type": {
            "treatment": False,  # Missing required consent
            "referral": True,
            "research": False,
        },
    }
    response = client.post(
        "/patients/symptoms/",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
        json=symptom_data,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Treatment consent is required."


def test_get_symptom_details_comprehensive(
    client: TestClient,
    patient_auth_token: str,
    symptom,
    diagnosis,
    test_request,
    appointment,
    test_result,
    gp_doctor,
    lab_staff_user,
    medical_lab,
    test_type,
):
    """Test getting full details for a symptom with associated data."""
    response = client.get(
        f"/patients/symptom/{symptom.id}",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == str(symptom.id)
    assert data["symptoms"] == symptom.symptoms
    assert data["lab_name"] == medical_lab.name
    assert data["lab_staff_name"] == lab_staff_user.name
    assert data["appointment_schedule"] == appointment.scheduled_at.isoformat()
    assert data["testType"] == test_type.name
    assert len(data["diagnoses"]) == 1
    assert data["diagnoses"][0]["analysis"] == diagnosis.diagnosis_content
    assert data["diagnoses"][0]["doctorName"] == f"Dr. {gp_doctor.name}"
    assert len(data["testResults"]) == 1
    assert data["testResults"][0]["summary"] == test_result.summary
    assert data["consent"]["treatment"] is True
    assert json.loads(symptom.image_paths) == data["images"]


def test_get_symptoms_history(
    client: TestClient, test_db: Session, patient_user, patient_auth_token: str
):
    """Test retrieving the symptom history for a patient, including filtering."""
    # Create symptoms for testing
    now = datetime.utcnow()
    s1 = Symptom(
        patient_id=patient_user.id,
        symptoms="Old symptom",
        status="Diagnosed",
        timestamp=now - timedelta(days=10),
    )
    s2 = Symptom(
        patient_id=patient_user.id,
        symptoms="New symptom",
        status="Pending",
        timestamp=now - timedelta(days=1),
    )
    s3 = Symptom(
        patient_id=patient_user.id,
        symptoms="Another pending",
        status="Pending",
        timestamp=now - timedelta(days=2),
    )
    test_db.add_all([s1, s2, s3])
    test_db.commit()

    # Case 1: Get all symptoms
    response = client.get(
        "/patients/symptoms-history/",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["symptoms"] == "New symptom"  # Check descending order by date

    # Case 2: Filter by status
    response = client.get(
        "/patients/symptoms-history/?status=Pending",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
    )
    assert response.status_code == 200
    assert len(response.json()) == 2

    # Case 3: Filter by date range
    start_date = (now - timedelta(days=5)).strftime("%Y-%m-%d")
    end_date = now.strftime("%Y-%m-%d")
    response = client.get(
        f"/patients/symptoms-history/?start_date={start_date}&end_date={end_date}",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert "Old symptom" not in [d["symptoms"] for d in data]

    # Case 4: Invalid date range
    response = client.get(
        f"/patients/symptoms-history/?start_date={end_date}&end_date={start_date}",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
    )
    assert response.status_code == 400
    assert "Start date cannot be later than the end date" in response.json()["detail"]

    # Case 5: Invalid date format (format error)
    invalid_date = "28-10-2023"
    response = client.get(
        f"/patients/symptoms-history/?start_date={invalid_date}",
        headers={"Authorization": f"Bearer {patient_auth_token}"},
    )

    # Assert that we get a 400 Bad Request error
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]
    assert "Please use YYYY-MM-DD" in response.json()["detail"]
