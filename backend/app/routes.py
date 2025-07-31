import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, FastAPI
from sqlalchemy.orm import Session
from jose import jwt
from database import SessionLocal, get_db
from models import User, Symptom, RoleEnum, Consent, Patient, ConsentPurpose, Diagnosis, Doctor, MedicalLab, TestRequest, SymptomStatus, Referral, TestResults, TestType, TokenBlacklist
from schemas import UserCreate, UserOut, SymptomCreate, SymptomOut, ConsentOut, PatientOut, DiagnosisOut, PatientSymptomDetails, DoctorOut, DiagnosisCreate, MedicalLabs, LabAssignmentCreate, LabAssignmentOut, ReferralCreate, SymptomHistory, SymptomDetails, TestResultOut
from fastapi.security import OAuth2PasswordRequestForm
import os
import shutil
from typing import List, Optional, Union
from .auth import authenticate_user, create_access_token, get_password_hash, verify_role, oauth2_scheme, SECRET_KEY, ALGORITHM
from datetime import datetime

router = APIRouter()


LAB_RESULT_DIR = "uploads/lab_results"
PATIENT_IMAGE_DIR = "uploads/lab_images"

# Ensure directories exist
os.makedirs(LAB_RESULT_DIR, exist_ok=True)
os.makedirs(PATIENT_IMAGE_DIR, exist_ok=True)



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


    
@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
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
    status: Optional[str] = None, search: Optional[str] = None,
    current_user: User = Depends(verify_role(RoleEnum.DOCTOR)),
    db: Session = Depends(get_db)
):
    symptoms_out = []

    # Query for symptoms related to the current doctor as a GP, referred doctor, and research symptoms
    gp_symptoms = (
        db.query(Symptom)
        .select_from(Symptom)
        .join(Patient, Patient.id == Symptom.patient_id)
        .filter(Patient.gp_id == current_user.id)
        .all()
    )
    referred_symptoms = db.query(Symptom).join(Consent).filter(
        Consent.doctor_id == current_user.id,
        Consent.consent_type == ConsentPurpose.REFERRAL,
        Consent.is_granted == True
    ).all()
    research_symptoms = db.query(Symptom).join(Consent).filter(
        Consent.consent_type == ConsentPurpose.RESEARCH,
        Consent.is_granted == True
    ).all()

    # Combine all symptoms
    all_symptoms = {s.id: s for s in gp_symptoms + referred_symptoms + research_symptoms}.values()

    sorted_symptoms = sorted(all_symptoms, key=lambda s: s.timestamp, reverse=True)
    for symptom in sorted_symptoms:
        patient = db.query(Patient).filter(Patient.id == symptom.patient_id).first()
        user = db.query(User).filter(User.id == symptom.patient_id).first()
        if search:
            search_text = search.lower()
            if search_text not in symptom.symptoms.lower() and (user.name is None or search_text not in user.name.lower()):
                continue
        
        # Prepare the symptom data once (common for all cases)
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

    if not symptom or not lab:
        raise HTTPException(status_code=404, detail="Symptom or Lab not found")
    
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
        upload_token=str(uuid4())
    )
    db.add(assignment)

    # Update symptom status to UNDER_REVIEW
    symptom.status = SymptomStatus.UNDER_REVIEW


    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/dashboard/{lab_id}")
def get_lab_dashboard(lab_id: int, 
                      current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
                      db: Session = Depends(get_db)):
    assignments = (
        db.query(TestRequest)
        .filter_by(lab_id=lab_id)
        .join(Symptom)
        .all()
    )

    results = []
    for assign in assignments:
        patient = db.query(User).filter_by(id=assign.symptom.patient_id).first()
        results.append({
            "patient_name": patient.name,
            "email": patient.email,
            "phone": patient.phone_number,
            "location": patient.location,
            "upload_token": assign.upload_token,
            "upload_url": f"/lab/upload/{assign.upload_token}",
            "status": "Uploaded" if assign.uploaded_result_path else "Pending"
        })

    return results


@router.get("/upload/{token}")
def get_upload_info(token: str,
                    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
                    db: Session = Depends(get_db)):
    assignment = db.query(TestRequest).filter_by(upload_token=token).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Invalid token")
    
    patient = db.query(User).filter_by(id=assignment.symptom.patient_id).first()

    return {
        "patient_name": patient.name,
        "email": patient.email,
        "phone": patient.phone_number,
        "location": patient.location
    }


@router.post("/upload/{token}")
def upload_lab_result(
    token: str, 
    files: List[UploadFile] = File(...),  # Accepting multiple files
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
        summary=None,  # Optionally add a summary
        uploaded_at=datetime.utcnow()
    )
    
    db.add(test_result)

    # Update the TestRequest table with the uploaded result file paths and time
    assignment.uploaded_result_path = uploaded_files[0]["path"]  # You can choose how to represent the first file path
    assignment.uploaded_at = datetime.utcnow()
    
    db.commit()

    return {"message": f"{len(files)} file(s) uploaded successfully."}


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