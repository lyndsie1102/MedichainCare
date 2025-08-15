import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, FastAPI, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from jose import jwt
from database import SessionLocal, get_db
from models import User, Symptom, RoleEnum, Consent, Patient, ConsentPurpose, Diagnosis, Doctor, MedicalLab, TestRequest, SymptomStatus, Referral, TestResults, TestType, TokenBlacklist, LabStaff, TestRequestStatus, AppointmentStatus, Appointment
from schemas import UserCreate, UserOut, SymptomCreate, SymptomOut, ConsentOut, PatientOut, DiagnosisOut, PatientSymptomDetails, DoctorOut, DiagnosisCreate, MedicalLabs, LabAssignmentCreate, LabAssignmentOut, ReferralCreate, SymptomHistory, SymptomDetails, TestResultOut, TestRequestOut
from fastapi.security import OAuth2PasswordRequestForm
import os
import shutil
from typing import List, Optional, Union
from .auth import authenticate_user, create_access_token, get_password_hash, verify_role, oauth2_scheme, SECRET_KEY, ALGORITHM
from datetime import datetime, date, time, timedelta
from uuid import uuid4
from web3 import Web3

router = APIRouter()


LAB_RESULT_DIR = "uploads/lab_results"
PATIENT_IMAGE_DIR = "uploads/lab_images"

# Ensure directories exist
os.makedirs(LAB_RESULT_DIR, exist_ok=True)
os.makedirs(PATIENT_IMAGE_DIR, exist_ok=True)


web3 = Web3(Web3.HTTPProvider('http://127.0.0.1:7545'))



@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        hashed_password=hashed_password,
        role=user.role,
        name=user.name,
        gender=user.gender,
        age=user.age
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    # Query all users from the database
    users = db.query(User).all()
    if not users:
        raise HTTPException(status_code=404, detail="No users found")
    return users

    
@router.get("/patients", response_model=List[UserOut])
def get_patients(db: Session = Depends(get_db)):
    # Query all patients from the database
    patients = db.query(User).filter(User.role == RoleEnum.PATIENT).all()
    if not patients:
        raise HTTPException(status_code=404, detail="No patients found")
    return patients


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

@router.get("/lab-staff/me")
def get_lab_staff_details(
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
    db: Session = Depends(get_db)
):
    lab_staff = db.query(User).filter(User.id == current_user.id).first()
    
    if not lab_staff:
        raise HTTPException(status_code=404, detail="Lab staff details not found")
    
    return {"name": lab_staff.name}
    
    
@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.username, 
                                             "role": user.role, 
                                             "eth_address": user.eth_address, 
                                             "jti": str(uuid.uuid4())})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    jti = payload.get("jti")
    exp = payload.get("exp")
    expired_at = datetime.utcfromtimestamp(exp)

    # Save to blacklist
    blacklisted_token = TokenBlacklist(jti=jti, expired_at=expired_at)
    db.add(blacklisted_token)
    db.commit()

    return {"msg": "Successfully logged out"}


@router.post("/upload-image/")
def upload_image(files: list[UploadFile] = File(...)):
    saved_paths = []
    for file in files:
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = os.path.join(PATIENT_IMAGE_DIR, unique_filename)

        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_paths.append(str(file_location))

    return {"image_paths": saved_paths}


@router.post("/symptoms/")
def submit_symptoms(
    symptom: SymptomCreate,
    current_user: User = Depends(verify_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    print(f"current user: {current_user.id}")
    # Enforce required consents
    if not symptom.consent_type.treatment:
        raise HTTPException(status_code=400, detail="Treatment consent is required.")
    if not symptom.consent_type.referral:
        raise HTTPException(status_code=400, detail="Referral consent is required.")


    # Create Symptom record
    new_symptom = Symptom(
        patient_id=current_user.id,
        symptoms=symptom.symptoms,
        image_paths=symptom.image_paths,
        consent_treatment=True,
        consent_referral=True,
        consent_research = symptom.consent_type.research or False, 
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


@router.get("/symptom/{symptom_id}", response_model=SymptomDetails)
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

        diagnosis_responses.append(DiagnosisOut(
            doctorName=f"Dr. {doctor_name}",
            analysis=diagnosis.diagnosis_content,
            createdAt=diagnosis.timestamp
        ))

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

            # Append the TestResultOut response object
            test_results_responses.append(TestResultOut(
                uploadedAt=test_result.uploaded_at,
                files=files_info,  # List of file details
                summary=test_result.summary
            ))

    # Consent details directly from the Symptom model
    consent_data = ConsentOut(
        treatment=symptom.consent_treatment,
        referral=symptom.consent_referral,
        research=symptom.consent_research
    )

    # Prepare the response data
    symptom_detail = SymptomDetails(
        id=str(symptom.id),  # Convert ID to string (UUID or integer as needed)
        symptoms=symptom.symptoms,
        lab_name=lab_name,
        lab_staff_name=lab_staff_name,
        lab_location=lab_location,
        appointment_schedule=appointment_schedule,
        testType=test_type_name,  # Include test type if found
        testResults=test_results_responses,
        images=symptom.image_paths,  # Return images if available
        submittedAt=symptom.timestamp,
        diagnoses=diagnosis_responses,
        consent=consent_data
    )

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
        
        # Add symptom data along with consent types
        result.append(SymptomHistory(
            id=s.id,
            symptoms=s.symptoms,
            image_paths=s.image_paths,
            status=s.status,
            submitted_at=s.timestamp,
            consents=consent_types  # Pass the consent types
        ))

    return result


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
        Consent.is_granted == True
    ).all()

    # Query for research symptoms (where current doctor is involved in research)
    research_symptoms = db.query(Symptom).join(Consent).filter(
        Consent.consent_type == ConsentPurpose.RESEARCH,
        Consent.is_granted == True
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
        
        # Prepare the symptom data
        symptoms_out.append(SymptomOut(
            id=symptom.id,
            symptoms=symptom.symptoms,
            image_paths=symptom.image_paths if symptom.image_paths else [],
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
            )
        ))
    
    return symptoms_out

@router.get("/symptom_details/{symptom_id}", response_model=Union[PatientSymptomDetails, SymptomDetails])
def get_symptom_details(
    symptom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR))
):
    symptom = db.query(Symptom).filter(Symptom.id == symptom_id).first()
    if not symptom:
        raise HTTPException(status_code=404, detail="Symptom not found")

    patient = db.query(Patient).filter(Patient.id == symptom.patient_id).first()
    user = db.query(User).filter(User.id == symptom.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()

    if not all([patient, user, doctor]):
        raise HTTPException(status_code=404, detail="Related data not found")

    # Check if GP
    is_gp = patient.gp_id == current_user.id

    # Check if referred doctor
    referral = db.query(Referral).filter(
        Referral.symptom_id == symptom.id,
        Referral.referral_doctor_id == doctor.id
    ).first()
    is_referred_doctor = referral is not None

    # Permissions logic
    if not any([symptom.consent_treatment, symptom.consent_referral, symptom.consent_research]):
        raise HTTPException(status_code=403, detail="Access denied: no consents available.")

    if is_gp or is_referred_doctor:
        # ✅ Full access
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
            images=symptom.image_paths or [],
            submittedAt=symptom.timestamp,
            status=symptom.status,
            diagnoses=_get_diagnoses(db, symptom.id),
            consent=ConsentOut(
                treatment=symptom.consent_treatment,
                referral=symptom.consent_referral,
                research=symptom.consent_research
            )
        )

    elif symptom.consent_research:
        # ✅ Research-only access
        return SymptomDetails(
            id=str(symptom.id),
            symptoms=symptom.symptoms,
            testType=_get_test_type(db, symptom.id),
            testResults=_get_test_results(db, symptom.id),
            images=symptom.image_paths or [],
            submittedAt=symptom.timestamp,
            diagnoses=_get_diagnoses(db, symptom.id),
            consent=ConsentOut(
                treatment=symptom.consent_treatment,
                referral=symptom.consent_referral,
                research=symptom.consent_research
            )
        )

    raise HTTPException(status_code=403, detail="Access denied: not authorized.")


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


router.get("/doctor/submissions", response_model=List[SymptomOut])
def get_submissions(status: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Symptom)

    if status:
        query = query.filter(Symptom.status == status)

    symptoms = query.all()
    results = []

    for symptom in symptoms:
        patient = db.query(Patient).filter(Patient.id == symptom.patient_id).first()
        user = db.query(User).filter(User.id == symptom.patient_id).first()
        consents = db.query(Consent).filter(Consent.symptom_id == symptom.id).all()

        consent_data = {
            "treatment": any(c.is_granted and c.consent_type == ConsentPurpose.TREATMENT for c in consents),
            "referral": any(c.is_granted and c.consent_type == ConsentPurpose.REFERRAL for c in consents),
            "research": any(c.is_granted and c.consent_type == ConsentPurpose.RESEARCH for c in consents),
        }

        diagnosis = db.query(Diagnosis).filter(Diagnosis.symptom_id == symptom.id).first()

        # Apply keyword filtering (if search is passed)
        if search:
            search_text = search.lower()
            if search_text not in symptom.symptoms.lower() and (user.name is None or search_text not in user.name.lower()):
                continue

        results.append(SymptomOut(
            id=symptom.id,
            symptoms=symptom.symptoms,
            image_paths=[symptom.image_path] if symptom.image_path else [],
            status=symptom.status,
            submitted_at=symptom.timestamp,
            consent=ConsentOut(**consent_data),
            patient=PatientOut(
                id=patient.id,
                name=user.name,
                age=patient.age,
                gender=patient.gender,
                phone=patient.phone_number,
                email=patient.email,
                address=patient.location
                )
            ))
    return results


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


@router.get("/test-requests", response_model=List[TestRequestOut])
def get_lab_dashboard(
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
    db: Session = Depends(get_db)
):
    # Get lab staff information
    lab_staff = db.query(LabStaff).filter_by(id=current_user.id).first()
    if not lab_staff:
        raise HTTPException(status_code=404, detail="Lab staff not found")
    
    # Build query with manual joins since relationships aren't defined
    query = (
        db.query(TestRequest)
        .filter(TestRequest.lab_id == lab_staff.lab_id)
        .join(Symptom, Symptom.id == TestRequest.symptom_id)
        .join(Doctor, Doctor.id == TestRequest.doctor_id)
        .join(TestType, TestType.id == TestRequest.test_type_id)
        .outerjoin(Appointment, Appointment.test_request_id == TestRequest.id)
    )
    
    # Apply filters
    if status:
        # Check if status is for TestRequest or Appointment
        if status.upper() in [TestRequestStatus.PENDING.value.upper(), TestRequestStatus.UPLOADED.value.upper()]:
            query = query.filter(TestRequest.status == TestRequestStatus(status.lower()))
        elif status.upper() in [AppointmentStatus.CANCELLED.value.upper(), AppointmentStatus.SCHEDULED.value.upper()]:
            query = query.filter(Appointment.status == AppointmentStatus(status.title()))
    
    if start_date:
        # Convert start_date (date) to datetime at the start of the day
        start_datetime = datetime.combine(start_date, time.min)
        query = query.filter(TestRequest.requested_at >= start_datetime)
    
    if end_date:
        # Convert end_date (date) to datetime at the end of the day
        end_datetime = datetime.combine(end_date, time.max)
        query = query.filter(TestRequest.requested_at <= end_datetime)

    # Sort by requested_at in descending order
    query = query.order_by(TestRequest.requested_at.desc())
    
    # Execute query
    test_requests = query.all()
    
    results = []
    for test_request in test_requests:
        # Get related data manually since relationships aren't defined
        symptom = db.query(Symptom).filter_by(id=test_request.symptom_id).first()
        doctor = db.query(Doctor).filter_by(id=test_request.doctor_id).first()
        doctor_user = db.query(User).filter_by(id=doctor.id).first() if doctor else None
        test_type = db.query(TestType).filter_by(id=test_request.test_type_id).first()
        
        # Get patient information
        patient = db.query(Patient).filter_by(id=symptom.patient_id).first() if symptom else None
        patient_user = db.query(User).filter_by(id=patient.id).first() if patient else None
        
        # Get appointments
        appointments = db.query(Appointment).filter_by(test_request_id=test_request.id).all()
        appointment = appointments[0] if appointments else None
        
        results.append(TestRequestOut(
            id=str(test_request.id),
            doctor=DoctorOut(
                id=doctor.id,
                name=doctor_user.name if doctor_user else "Unknown",
                specialty=doctor.specialty if doctor else "Unknown"
            ) if doctor else None,
            request_time=test_request.requested_at.isoformat() if test_request.requested_at else None,
            patient_name=patient_user.name if patient_user else "Unknown",
            patient_age=patient_user.age if patient_user else None,
            test_type=test_type.name if test_type else "Unknown Test Type",
            status=test_request.status.value.title(),
            upload_token=test_request.upload_token,
            uploaded_result_path=test_request.uploaded_result_path,
            appointment_id=appointment.id if appointment and appointment.id else None,
            appointment_status=appointment.status.value if appointment and appointment.status else None,
            appointment_schedule=appointment.scheduled_at.isoformat() if appointment and appointment.scheduled_at else None
        ))
    
    return results

@router.post("/lab/upload/{token}")
def upload_lab_result(
    token: str, 
    files: List[UploadFile] = File(...),  # Accepting multiple files
    summary: str = Form(None),
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
    db: Session = Depends(get_db)
):

    # Retrieve the test request based on the token
    assignment = db.query(TestRequest).filter_by(upload_token=token).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Invalid token")
    
    # List to store file paths
    uploaded_files = []
    
    # Save each file and generate file path
    for file in files:
        file_path = os.path.join(LAB_RESULT_DIR, f"{assignment.id}_{file.filename}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Append file path to the uploaded files list
        uploaded_files.append({"name": file.filename, "path": file_path})
    
    # Create a new entry in the TestResults table for each uploaded file
    test_result = TestResults(
        test_request_id=assignment.id,
        files=uploaded_files,  # Storing multiple files in the 'files' field
        summary=summary,  # Optionally add a summary
        uploaded_at=datetime.utcnow()
    )
    
    db.add(test_result)

    # Update the TestRequest table with the uploaded result file paths and time
    assignment.uploaded_result_path = uploaded_files[0]["path"]  # You can choose how to represent the first file path
    assignment.uploaded_at = datetime.utcnow()
    assignment.symptom.status = SymptomStatus.TESTED
    assignment.status = TestRequestStatus.UPLOADED
    db.commit()

    return {"message": f"{len(files)} file(s) uploaded successfully.", "status": "Uploaded"}


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


@router.get("/test-types/")
def get_test_types(db: Session = Depends(get_db), current_user: User = Depends(verify_role(RoleEnum.DOCTOR))):
    test_types = db.query(TestType).all()
    if not test_types:
        raise HTTPException(status_code=404, detail="No test types found")
    
    return [{"id": tt.id, "name": tt.name} for tt in test_types]


@router.post("/appointments/{test_request_id}/schedule")
async def schedule_appointment(test_request_id: int, 
                               date: str,  # Accept the date in string format
                               time: str,  # Accept the time in string format
                               db: Session = Depends(get_db), 
                               current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF))):

    # Step 1: Check if the test request exists
    test_request = db.query(TestRequest).filter(TestRequest.id == test_request_id).first()
    if not test_request:
        raise HTTPException(status_code=404, detail="Test request not found")

    # Step 2: Combine date and time to form a datetime object
    try:
        # Combine date and time into a single string and convert to datetime object
        combined_datetime_str = f"{date} {time}"
        scheduled_at = datetime.strptime(combined_datetime_str, "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date or time format. Use 'YYYY-MM-DD' for date and 'HH:MM' for time.")
    
    # Step 3: Check if the lab staff is already assigned to an appointment at the same time
    existing_lab_staff_appointment = db.query(Appointment).filter(
        Appointment.lab_staff_id == current_user.id,  # Check for the current lab staff
        Appointment.scheduled_at == scheduled_at,
        Appointment.status != AppointmentStatus.CANCELLED
    ).first()
    
    if existing_lab_staff_appointment:
        raise HTTPException(status_code=409, detail="Lab staff is already scheduled for another appointment at this time")

    # Step 4: Create the appointment
    new_appointment = Appointment(
        scheduled_at=scheduled_at,
        test_request_id=test_request_id,
        patient_id=test_request.symptom.patient_id,
        lab_staff_id=current_user.id,
        status=AppointmentStatus.SCHEDULED
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    scheduled_time_str = new_appointment.scheduled_at.strftime("%Y-%m-%d %H:%M")

    # Step 5: Update the status of the associated symptom to 'WAITING FOR TEST'
    test_request.symptom.status = SymptomStatus.WAITING
    db.commit()

    return {"message": f"Appointment scheduled successfully for {scheduled_time_str}"}

#Cancel appointment API
@router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF))
):
    # Step 1: Fetch the appointment by its ID
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Step 2: Check if the appointment is already cancelled
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")
    
    # Step 3: Update the status to CANCELLED and set the cancellation time
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancelled_at = datetime.utcnow()

    # Step 4: Update the status of the associated symptom to 'PENDING'
    test_request = appointment.test_request  # Access the related TestRequest
    if test_request and test_request.symptom:
        test_request.symptom.status = SymptomStatus.PENDING
        db.commit()  # Commit the changes to the symptom status
    
    # Commit changes to the database
    db.commit()
    db.refresh(appointment)
    
    # Step 4: Return a success message
    return {"message": f"Appointment with ID {appointment_id} has been cancelled successfully."}
    
