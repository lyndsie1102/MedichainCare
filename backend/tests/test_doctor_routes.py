from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models import (
    User,
    Symptom,
    Diagnosis,
    TestRequest,
    SymptomStatus,
    MedicalLab,
    TestType,
)


def test_get_own_doctor_details(
    client: TestClient, gp_doctor: User, gp_auth_token: str
):
    """Test retrieving the current doctor's own details."""
    response = client.get(
        "/doctors/doctor/me", headers={"Authorization": f"Bearer {gp_auth_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == gp_doctor.id
    assert data["name"] == gp_doctor.name
    assert data["specialty"] == "General Medicine"


def test_get_list_of_other_doctors(
    client: TestClient, gp_doctor: User, specialist_doctor: User, gp_auth_token: str
):
    """Test retrieving a list of other doctors, excluding the current user."""
    response = client.get(
        "/doctors/doctors", headers={"Authorization": f"Bearer {gp_auth_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    # The current doctor (gp_doctor) should not be in the list
    assert gp_doctor.id not in [d["id"] for d in data]
    # The specialist doctor should be in the list
    assert specialist_doctor.id in [d["id"] for d in data]


def test_create_diagnosis_for_symptom(
    client: TestClient,
    test_db: Session,
    gp_doctor: User,
    gp_auth_token: str,
    symptom_for_gp: Symptom,
):
    """Test creating a diagnosis for a symptom."""
    diagnosis_data = {
        "symptom_id": symptom_for_gp.id,
        "patient_id": symptom_for_gp.patient_id,
        "diagnosis_content": "Initial diagnosis: Suspected angina.",
    }

    response = client.post(
        "/doctors/create_diagnosis/",
        json=diagnosis_data,
        headers={"Authorization": f"Bearer {gp_auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Diagnosis created."
    assert data["diagnosis"]["analysis"] == "Initial diagnosis: Suspected angina."

    # Verify in DB
    diagnosis_in_db = (
        test_db.query(Diagnosis)
        .filter(Diagnosis.symptom_id == symptom_for_gp.id)
        .first()
    )
    assert diagnosis_in_db is not None
    assert diagnosis_in_db.doctor_id == gp_doctor.id

    # Verify symptom status was updated
    test_db.refresh(symptom_for_gp)
    assert symptom_for_gp.status == SymptomStatus.DIAGNOSED


def test_assign_lab_to_symptom(
    client: TestClient,
    test_db: Session,
    gp_doctor: User,
    gp_auth_token: str,
    symptom_for_gp: Symptom,
    medical_lab: MedicalLab,
    test_type: TestType,
):
    """Test assigning a lab test for a symptom."""
    assignment_data = {
        "symptom_id": symptom_for_gp.id,
        "lab_id": medical_lab.id,
        "test_type_id": test_type.id,
    }

    response = client.post(
        "/doctors/assign-lab/",
        json=assignment_data,
        headers={"Authorization": f"Bearer {gp_auth_token}"},
    )

    assert response.status_code == 200

    # Verify in DB
    test_request_in_db = (
        test_db.query(TestRequest)
        .filter(TestRequest.symptom_id == symptom_for_gp.id)
        .first()
    )
    assert test_request_in_db is not None
    assert test_request_in_db.lab_id == medical_lab.id
    assert test_request_in_db.doctor_id == gp_doctor.id

    # Verify symptom status was updated
    test_db.refresh(symptom_for_gp)
    assert symptom_for_gp.status == SymptomStatus.ASSIGNED


def test_get_symptom_details_as_gp(
    client: TestClient, gp_auth_token: str, symptom_for_gp: Symptom
):
    """Test that a GP can get full details for their own patient's symptom."""
    response = client.get(
        f"/doctors/symptom_details/{symptom_for_gp.id}",
        headers={"Authorization": f"Bearer {gp_auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(symptom_for_gp.id)
    assert data["consent"] == "treatment"
    assert "patient" in data  # GP gets full patient info


def test_get_symptom_details_as_referred_doctor(
    client: TestClient, specialist_auth_token: str, referred_symptom: Symptom
):
    """Test that a specialist can get full details for a symptom referred to them."""
    response = client.get(
        f"/doctors/symptom_details/{referred_symptom.id}",
        headers={"Authorization": f"Bearer {specialist_auth_token}"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["id"] == str(referred_symptom.id)
    assert data["consent"] == "referral"


def test_get_symptom_details_unauthorized(
    client: TestClient, specialist_auth_token: str, symptom_for_gp: Symptom
):
    """Test that a doctor cannot access a symptom they have no relation to."""
    # The specialist has not been referred this specific symptom
    response = client.get(
        f"/doctors/symptom_details/{symptom_for_gp.id}",
        headers={"Authorization": f"Bearer {specialist_auth_token}"},
    )

    assert response.status_code == 403
    assert "You are not authorized to view this symptom" in response.json()["detail"]


def test_doctor_dashboard_as_gp(
    client: TestClient, gp_auth_token: str, referred_symptom: Symptom
):
    """Test the GP's dashboard, which should show their patient's symptoms."""
    response = client.get(
        "/doctors/doctor-dashboard/",
        headers={"Authorization": f"Bearer {gp_auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    symptom_ids = [s["id"] for s in data]
    assert referred_symptom.id in symptom_ids


def test_doctor_dashboard_as_specialist(
    client: TestClient, specialist_auth_token: str, referred_symptom: Symptom
):
    """Test the specialist's dashboard, which should only show referred symptoms."""
    response = client.get(
        "/doctors/doctor-dashboard/",
        headers={"Authorization": f"Bearer {specialist_auth_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    symptom_ids = [s["id"] for s in data]
    assert referred_symptom.id in symptom_ids


def test_get_medical_labs(
    client: TestClient, gp_auth_token: str, medical_lab: MedicalLab
):
    """Test retrieving the list of medical labs."""
    response = client.get(
        "/doctors/medical-labs", headers={"Authorization": f"Bearer {gp_auth_token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(lab["id"] == medical_lab.id for lab in data)
    # Check if specialties string was converted to a list
    assert isinstance(data[0]["specialties"], list)
