import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Symptom, RoleEnum, Consent, Patient, ConsentPurpose, Diagnosis, Doctor, MedicalLab, TestRequest, TestResults, TestType, LabStaff, Appointment
from schemas import SymptomCreate, ConsentOut, DiagnosisOut, SymptomHistory, SymptomDetails, TestResultOut
import os
import shutil
from typing import List, Optional
from .auth import verify_role
from datetime import datetime
from uuid import uuid4
import json

router = APIRouter()
PATIENT_IMAGE_DIR = "uploads/lab_images"
os.makedirs(PATIENT_IMAGE_DIR, exist_ok=True)




@router.get("/patient/me")
def get_patient_details(
    current_user: User = Depends(verify_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    # Query the Patient table and join with the User table
    patient = db.query(User).filter(User.id == current_user.id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient details not found")
    
    # Return patient name (from the User table)
    return {"name": patient.name}


@router.post("/upload-image/")
async def upload_image(files: List[UploadFile] = File(...)):
    saved_paths = []

    for file in files:
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = os.path.join(PATIENT_IMAGE_DIR, unique_filename)

        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_paths.append(file_location)  # Store the file path in the list

    # Return image paths as a comma-separated string
    return {"image_paths": saved_paths}


@router.post("/symptoms/")
def submit_symptoms(
    symptom: SymptomCreate,
    current_user: User = Depends(verify_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):

    # Enforce required consents
    if not symptom.consent_type.treatment:
        raise HTTPException(status_code=400, detail="Treatment consent is required.")
    if not symptom.consent_type.referral:
        raise HTTPException(status_code=400, detail="Referral consent is required.")

    # Check if image_paths is a string and split it, if necessary
    if isinstance(symptom.image_paths, str):
        image_paths = symptom.image_paths.split(",")  # Convert to list of paths
    else:
        image_paths = symptom.image_paths or []  # Ensure it's an empty list if None

    # Serialize the list of image paths into a JSON string
    image_paths_str = json.dumps(image_paths)  # Convert list to JSON string

    # Create Symptom record
    new_symptom = Symptom(
        patient_id=current_user.id,
        symptoms=symptom.symptoms,
        image_paths=image_paths_str,  # Store the JSON string in the database
        consent_treatment=True,
        consent_referral=True,
        consent_research=symptom.consent_type.research or False, 
    )
    db.add(new_symptom)
    db.commit()
    db.refresh(new_symptom)

    # Create treatment consent (for GP)
    patient_record = db.query(Patient).filter(Patient.id == current_user.id).first()
    treatment_consent = Consent(
        patient_id=current_user.id,
        symptom_id=new_symptom.id,
        doctor_id=patient_record.gp_id,  # GP ID if available; adjust if GP is different
        consent_type=ConsentPurpose.TREATMENT,
        is_granted=True,
        granted_at=datetime.utcnow(),
    )
    db.add(treatment_consent)

    # Create research consent if granted
    if symptom.consent_type.research:
        research_consent = Consent(
            patient_id=current_user.id,
            symptom_id=new_symptom.id,
            doctor_id=None,
            consent_type=ConsentPurpose.RESEARCH,
            is_granted=True,
            granted_at=datetime.utcnow(),
        )
        db.add(research_consent)

    db.commit()
    return {"message": "Symptom submitted", "id": new_symptom.id}


@router.get("/symptom/{symptom_id}")
def get_symptom_details(
    symptom_id: int,
    current_user: User = Depends(verify_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    # Fetch the symptom based on the symptom ID
    symptom = db.query(Symptom).filter(Symptom.id == symptom_id).first()
    if not symptom:
        raise HTTPException(status_code=404, detail="Symptom not found")

    # Get all diagnoses related to the symptom from different doctors
    diagnoses = (
        db.query(Diagnosis)
        .filter(Diagnosis.symptom_id == symptom_id)
        .all()
    )

    diagnosis_responses = []
    for diagnosis in diagnoses:
        doctor = db.query(Doctor).filter(Doctor.id == diagnosis.doctor_id).first()
        if doctor:
            doctor_name = doctor.user.name  # Access the User object associated with the Doctor
        else:
            doctor_name = "Unknown Doctor"

        diagnosis_responses.append({
            "doctorName": f"Dr. {doctor_name}",
            "analysis": diagnosis.diagnosis_content,
            "createdAt": diagnosis.timestamp
        })

    # Get all test requests related to the symptom
    test_requests = (
        db.query(TestRequest)
        .filter(TestRequest.symptom_id == symptom_id)
        .all()
    )

    # Initialize variables for lab and appointment info
    lab_name = None
    lab_staff_name = None
    appointment_schedule = None
    lab_location = None

    if test_requests:
        # Get the most recent test request
        latest_test_request = max(test_requests, key=lambda x: x.requested_at)
        
        # Get lab information
        lab = db.query(MedicalLab).filter_by(id=latest_test_request.lab_id).first()
        lab_name = lab.name if lab else None
        lab_location = lab.location if lab else None
        
        # Get appointment information for this test request
        appointment = db.query(Appointment).filter_by(test_request_id=latest_test_request.id).first()
        
         # Check if appointment_schedule exists before returning lab-related info
        if appointment and appointment.scheduled_at:
            appointment_schedule = appointment.scheduled_at
            # Get lab staff information
            lab_staff = db.query(LabStaff).filter_by(id=appointment.lab_staff_id).first()
            if lab_staff:
                lab_staff_user = db.query(User).filter_by(id=lab_staff.id).first()
                lab_staff_name = lab_staff_user.name if lab_staff_user else None

    if appointment_schedule is None:
        lab_name = None
        lab_location = None
        lab_staff_name = None

    test_results_responses = []
    test_type_name = None
    for test_request in test_requests:
        # Get the test type for each test request
        test_type = db.query(TestType).filter(TestType.id == test_request.test_type_id).first()
        if test_type:
            test_type_name = test_type.name  # Assuming we only need to store one test type name for the symptom

        test_results = db.query(TestResults).filter(TestResults.test_request_id == test_request.id).all()

        for test_result in test_results:
            # Construct the files list
            files_info = []
            for file in test_result.files:
                files_info.append({
                    "name": file.get("name", "Unknown"),
                    "url": file.get("url", "")
                })

            # Append the test result
            test_results_responses.append({
                "uploadedAt": test_result.uploaded_at,
                "files": files_info,  # List of file details
                "summary": test_result.summary
            })

    # Consent details directly from the Symptom model
    consent_data = {
        "treatment": symptom.consent_treatment,
        "referral": symptom.consent_referral,
        "research": symptom.consent_research
    }

    image_paths = symptom.image_paths

    # If it's a string, convert it to a list using json.loads
    if isinstance(image_paths, str):
        try:
            image_paths = json.loads(image_paths)
        except json.JSONDecodeError:
            image_paths = []  # Handle invalid JSON case, if needed

    # Prepare the response data
    symptom_detail = {
        "id": str(symptom.id),  # Convert ID to string (UUID or integer as needed)
        "symptoms": symptom.symptoms,
        "lab_name": lab_name,
        "lab_staff_name": lab_staff_name,
        "lab_location": lab_location,
        "appointment_schedule": appointment_schedule,
        "testType": test_type_name,  # Include test type if found
        "testResults": test_results_responses,
        "images": image_paths,  # Return images if available
        "submittedAt": symptom.timestamp,
        "diagnoses": diagnosis_responses,
        "consent": consent_data
    }

    return symptom_detail


@router.get("/symptoms-history/", response_model=List[SymptomHistory])
def get_symptom_history(
    current_user: User = Depends(verify_role(RoleEnum.PATIENT)), 
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):

    # Validate date range, if both start_date and end_date are provided
    if start_date and end_date:
        # Convert the strings to datetime objects for comparison
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        
        if start_date_obj > end_date_obj:
            raise HTTPException(
                status_code=400,
                detail="Start date cannot be later than the end date.")

    query = db.query(Symptom).filter(Symptom.patient_id == current_user.id)

    if status and status != "all":
        query = query.filter(Symptom.status == status)

    if start_date:
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
        start_date_obj = start_date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Symptom.timestamp >= start_date_obj)
    if end_date:
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        end_date_obj = end_date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.filter(Symptom.timestamp <= end_date_obj)

    symptoms = query.order_by(Symptom.timestamp.desc()).all()
    
    result = []
    for s in symptoms:
        # Fetch consents related to this symptom
        consents = db.query(Consent).filter(Consent.symptom_id == s.id).all()
        
        # Collect consent types for the symptom (only those that are granted)
        consent_types = [consent.consent_type for consent in consents if consent.is_granted]
        
        if s.image_paths:
            try:
                # Check if it's a valid JSON, otherwise treat it as a comma-separated string
                if s.image_paths.startswith("[") and s.image_paths.endswith("]"):
                # It's a JSON array
                    image_paths = json.loads(s.image_paths)
                else:
                # It's a comma-separated string, split it into a list
                    image_paths = s.image_paths.split(",")
            except json.JSONDecodeError:
                # Handle the error, maybe log or raise an exception if needed
                print(f"Error decoding JSON for image_paths: {s.image_paths}")
        
        # Add symptom data along with consent types
        result.append(SymptomHistory(
            id=s.id,
            symptoms=s.symptoms,
            image_paths=image_paths,
            status=s.status,
            submitted_at=s.timestamp,
            consents=consent_types  # Pass the consent types
        ))

    return result