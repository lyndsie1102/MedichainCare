from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Symptom, RoleEnum, Consent, Patient, ConsentPurpose, Diagnosis, Doctor, MedicalLab, TestRequest, SymptomStatus, Referral, TestType
from schemas import SymptomOut, PatientOut, DiagnosisOut, PatientSymptomDetails, DoctorOut, DiagnosisCreate, LabAssignmentCreate, LabAssignmentOut, ReferralCreate, SymptomDetails, TestResultOut, MedicalLabs
from typing import List, Optional, Union
from .auth import verify_role
from datetime import datetime
from uuid import uuid4
import json

router = APIRouter()


@router.get("/doctor/me", response_model=DoctorOut)
def get_doctor_details(
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR)),
    db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor details not found")

    return DoctorOut(
        id=current_user.id,
        name=current_user.name,
        specialty=doctor.specialty
    )


@router.get("/doctors", response_model=List[DoctorOut])
def get_doctors(
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR)),
    db: Session = Depends(get_db)
):
    # Query Users with role DOCTOR and join Doctor table for specialty
    doctors = (
        db.query(User)
        .join(Doctor, Doctor.id == User.id)
        .filter(
            User.role == RoleEnum.DOCTOR,
            User.id != current_user.id
        )
        .all()
    )

    if not doctors:
        raise HTTPException(status_code=404, detail="No doctors found")

    # Return list of dicts matching DoctorOut model
    # Map User+Doctor to DoctorOut fields
    return [
        DoctorOut(
            id=doctor.id,
            name=doctor.name,
            specialty=doctor.doctor.specialty  # access Doctor via relationship or query join
        )
        for doctor in doctors
    ]

@router.get("/doctor-dashboard/", response_model=List[SymptomOut])
def get_doctor_dashboard(
    status: Optional[str] = None,  # Status filter added
    search: Optional[str] = None,
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR)),
    db: Session = Depends(get_db)
):
    symptoms_out = []

    # Base query for symptoms related to the current doctor
    base_query = db.query(Symptom).join(Patient, Patient.id == Symptom.patient_id)

    # Query for GP symptoms (GP for current doctor)
    gp_symptoms = base_query.filter(Patient.gp_id == current_user.id).all()

    # Query for referred symptoms (where current doctor is the referral doctor)
    referred_symptoms = db.query(Symptom).join(Consent).filter(
        Consent.doctor_id == current_user.id,
        Consent.consent_type == ConsentPurpose.REFERRAL,
        Consent.is_granted
    ).all()

    # Query for research symptoms (where current doctor is involved in research)
    research_symptoms = db.query(Symptom).join(Consent).filter(
        Consent.consent_type == ConsentPurpose.RESEARCH,
        Consent.is_granted
    ).all()

    # Combine all symptoms
    all_symptoms = gp_symptoms + referred_symptoms + research_symptoms

    # Apply status filter if provided
    if status:
        status = status.lower()  # Normalize to lowercase
        all_symptoms = [s for s in all_symptoms if s.status.lower() == status]

    # Sort symptoms by timestamp in descending order
    sorted_symptoms = sorted(all_symptoms, key=lambda s: s.timestamp, reverse=True)

    # Filter by search term if provided
    for symptom in sorted_symptoms:
        patient = db.query(Patient).filter(Patient.id == symptom.patient_id).first()
        user = db.query(User).filter(User.id == symptom.patient_id).first()

        if search:
            search_text = search.lower()
            # Filter symptoms by symptom description or patient name
            if search_text not in symptom.symptoms.lower() and (user.name is None or search_text not in user.name.lower()):
                continue

        if isinstance(symptom.image_paths, str):
            try:
                # Attempt to convert the string into a list of strings (if it's a JSON array string)
                image_paths = json.loads(symptom.image_paths)
                if not isinstance(image_paths, list):
                    image_paths = []
            except json.JSONDecodeError:
                image_paths = []  # If parsing fails, fall back to an empty list
        else:
            image_paths = symptom.image_paths or []

        # Determine consent for the current doctor (Referral or Research)
        consent_data = db.query(Consent).filter(
            Consent.symptom_id == symptom.id,
            Consent.doctor_id == current_user.id,
            Consent.is_granted
        ).first()

        # Prepare consent field value based on the found consent
        consent_type = consent_data.consent_type if consent_data else 'research'
        
        # Prepare the symptom data
        symptoms_out.append(SymptomOut(
            id=symptom.id,
            symptoms=symptom.symptoms,
            image_paths=image_paths,
            status=symptom.status,
            submitted_at=symptom.timestamp,
            patient=PatientOut(
                id=patient.id,
                name=user.name,
                age=user.age,
                gender=user.gender,
                phone=patient.phone_number,
                email=patient.email,
                address=patient.location
            ),
            consent=consent_type
        ))
    
    return symptoms_out

@router.get("/medical-labs", response_model=List[MedicalLabs])
def get_medical_labs(db: Session = Depends(get_db), current_user: User = Depends(verify_role(RoleEnum.DOCTOR))):
    labs = db.query(MedicalLab).all()

    # Convert specialties string to list for each lab
    results = []
    for lab in labs:
        results.append(
            MedicalLabs(
                id=lab.id,
                name=lab.name,
                location=lab.location,
                specialties=lab.specialties.split(',')  # convert CSV to list
            )
        )
    return results 



@router.get("/test-types/")
def get_test_types(db: Session = Depends(get_db), current_user: User = Depends(verify_role(RoleEnum.DOCTOR))):
    test_types = db.query(TestType).all()
    if not test_types:
        raise HTTPException(status_code=404, detail="No test types found")
    
    return [{"id": tt.id, "name": tt.name} for tt in test_types]



@router.get("/symptom_details/{symptom_id}", response_model=Union[PatientSymptomDetails, SymptomDetails])
def get_symptom_details(
    symptom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR))
):
    symptom = db.query(Symptom).filter(Symptom.id == symptom_id).first()
    if not symptom:
        raise HTTPException(status_code=404, detail="Symptom not found")
    
    # Initialize images with an empty list if symptom.image_paths is None or empty
    # Ensure image_paths is a list, even if it's a stringified list
    images = symptom.image_paths
    if isinstance(images, str):
        # Check if it's a stringified empty list ('[]')
        if images.strip() == '[]':
            images = []
        else:
            try:
                # Attempt to convert stringified list to a proper list
                images = json.loads(images)  # Parses the string to a list
                if not isinstance(images, list):  # Ensure it's a list
                    images = []
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid format for image paths")

    # Ensure images is a list (even if empty)
    if not isinstance(images, list):
        images = []
    print(f"image path {symptom.image_paths}")

    patient = db.query(Patient).filter(Patient.id == symptom.patient_id).first()
    user = db.query(User).filter(User.id == symptom.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()


    # Check if GP
    is_gp = patient.gp_id == current_user.id

    # Check if referred doctor
    referral = db.query(Referral).filter(
        Referral.symptom_id == symptom.id,
        Referral.referral_doctor_id == doctor.id
    ).first()
    is_referred_doctor = referral is not None

    # Check for a specific RESEARCH consent record for THIS doctor
    research_consent = db.query(Consent).filter(
        Consent.symptom_id == symptom.id,
        Consent.doctor_id == current_user.id,
        Consent.consent_type == ConsentPurpose.RESEARCH,
        Consent.is_granted
    ).first()
    has_research_consent = research_consent is not None

    if is_gp:
        # Full access
        return PatientSymptomDetails(
            id=str(symptom.id),
            patient=PatientOut(
                id=patient.id,
                name=user.name,
                age=user.age,
                gender=user.gender,
                phone=patient.phone_number,
                email=patient.email,
                address=patient.location
            ),
            symptoms=symptom.symptoms,
            testType=_get_test_type(db, symptom.id),
            testResults=_get_test_results(db, symptom.id),
            images=images,
            submittedAt=symptom.timestamp,
            status=symptom.status,
            diagnoses=_get_diagnoses(db, symptom.id),
            consent='treatment'
        )
    
    elif is_referred_doctor:
        return PatientSymptomDetails(
            id=str(symptom.id),
            patient=PatientOut(
                id=patient.id,
                name=user.name,
                age=user.age,
                gender=user.gender,
                phone=patient.phone_number,
                email=patient.email,
                address=patient.location
            ),
            symptoms=symptom.symptoms,
            testType=_get_test_type(db, symptom.id),
            testResults=_get_test_results(db, symptom.id),
            images=images,
            submittedAt=symptom.timestamp,
            status=symptom.status,
            diagnoses=_get_diagnoses(db, symptom.id),
            consent='referral'
        )
    
    elif has_research_consent:
        # Research-only access
        return PatientSymptomDetails(
            id=str(symptom.id),
            patient=PatientOut(
                id=patient.id,
                name=user.name,
                age=user.age,
                gender=user.gender,
                phone=patient.phone_number,
                email=patient.email,
                address=patient.location
            ),
            symptoms=symptom.symptoms,
            testType=_get_test_type(db, symptom.id),
            testResults=_get_test_results(db, symptom.id),
            images=images,
            submittedAt=symptom.timestamp,
            status=symptom.status,
            diagnoses=_get_diagnoses(db, symptom.id),
            consent='research'
        )
    
    else:
        raise HTTPException(status_code=403, detail="You are not authorized to view this symptom.")

# === Helper Functions ===

def _get_test_type(db: Session, symptom_id: int) -> str:
    request = db.query(TestRequest).filter(TestRequest.symptom_id == symptom_id).first()
    if request:
        test_type = db.query(TestType).filter(TestType.id == request.test_type_id).first()
        return test_type.name if test_type else None
    return None

def _get_test_results(db: Session, symptom_id: int) -> List[TestResultOut]:
    request = db.query(TestRequest).filter(TestRequest.symptom_id == symptom_id).first()
    results = []
    if request:
        for result in request.test_results:
            files = result.files if isinstance(result.files, list) else []
            results.append(TestResultOut(
                uploadedAt=result.uploaded_at,
                files=files,
                summary=result.summary
            ))
    return results

def _get_diagnoses(db: Session, symptom_id: int) -> List[DiagnosisOut]:
    diagnoses = db.query(Diagnosis).filter(Diagnosis.symptom_id == symptom_id).all()
    output = []
    for diag in diagnoses:
        doctor_user = db.query(User).filter(User.id == diag.doctor_id).first()
        output.append(DiagnosisOut(
            doctorName=doctor_user.name if doctor_user else "Unknown",
            analysis=diag.diagnosis_content,
            createdAt=diag.timestamp
        ))
    return output



@router.post("/create_diagnosis/")
def create_diagnosis(
    diagnosis_data: DiagnosisCreate,
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR)),
    db: Session = Depends(get_db)
):
    # Check if the symptom exists
    symptom = db.query(Symptom).filter(Symptom.id == diagnosis_data.symptom_id).first()
    if not symptom:
        raise HTTPException(status_code=404, detail="Symptom not found")
    # Create diagnosis
    new_diagnosis = Diagnosis(
        symptom_id=diagnosis_data.symptom_id,
        patient_id=diagnosis_data.patient_id,
        doctor_id=current_user.id,
        diagnosis_content=diagnosis_data.diagnosis_content,
        timestamp=datetime.utcnow()  # Make sure the column is named `created_at`
    )

    db.add(new_diagnosis)

    # Optional: update symptom status
    symptom.status = "Diagnosed"

    db.commit()
    db.refresh(new_diagnosis)

    doctor = db.query(User).filter(User.id == current_user.id).first()

    return {"message": "Diagnosis created.", 
            "diagnosis": {
            "id": str(new_diagnosis.id),
            "doctorId": str(doctor.id),
            "doctorName": doctor.name,
            "analysis": new_diagnosis.diagnosis_content,
            "createdAt": new_diagnosis.timestamp
        }}


@router.post("/refer")
def refer_symptom(
    referral_data: ReferralCreate,
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR)),
    db: Session = Depends(get_db)
):
    # 1. Verify symptom exists
    symptom = db.query(Symptom).filter(Symptom.id == referral_data.symptom_id).first()
    if not symptom:
        raise HTTPException(status_code=404, detail="Symptom not found")

    # 2. Verify referral doctor exists
    referral_doc = db.query(Doctor).filter(Doctor.id == referral_data.referral_doctor_id).first()
    if not referral_doc:
        raise HTTPException(status_code=404, detail="Referral doctor not found")

    # 3. Ensure referral consent is granted before proceeding
    if not symptom.consent_referral:
        raise HTTPException(status_code=403, detail="Referral consent not granted by patient.")

    # 4. Create referral record
    new_referral = Referral(
        symptom_id=symptom.id,
        referral_doctor_id=referral_data.referral_doctor_id,
        referred_at=datetime.utcnow()
    )
    db.add(new_referral)

    # 5. Create referral consent record
    referral_consent = Consent(
        patient_id=symptom.patient_id,
        symptom_id=symptom.id,
        doctor_id=referral_data.referral_doctor_id,
        consent_type=ConsentPurpose.REFERRAL,
        is_granted=True,
        granted_at=datetime.utcnow()
    )
    db.add(referral_consent)

    # 6. Update symptom status
    symptom.status = SymptomStatus.REFERRED

    db.commit()

    return {
        "message": "Symptom successfully referred",
        "referral_id": new_referral.id
    }


@router.post("/assign-lab/", response_model=LabAssignmentOut)
def assign_lab(
    payload: LabAssignmentCreate,
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR)),
    db: Session = Depends(get_db)
):
    symptom = db.query(Symptom).filter_by(id=payload.symptom_id).first()
    lab = db.query(MedicalLab).filter_by(id=payload.lab_id).first()
    test_type = db.query(TestType).filter_by(id=payload.test_type_id).first()

    if not symptom or not lab or not test_type:
        raise HTTPException(status_code=404, detail="Symptom or Lab or Test type not found")
    
    # ✅ Only allow assignment if symptom is in pending or referred state
    if symptom.status not in [SymptomStatus.PENDING, SymptomStatus.REFERRED]:
        raise HTTPException(
            status_code=400,
            detail="Only pending or referred symptoms can be assigned to labs"
        )
    
    assignment = TestRequest(
        symptom_id=payload.symptom_id,
        lab_id=payload.lab_id,
        doctor_id=current_user.id,  # Use the current doctor's ID
        test_type_id=test_type.id,
        upload_token=str(uuid4())
    )
    db.add(assignment)

    # Update symptom status to Tested
    symptom.status = SymptomStatus.ASSIGNED

    db.commit()
    db.refresh(assignment)
    return assignment