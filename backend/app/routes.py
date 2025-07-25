from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, FastAPI
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
from models import User, Symptom, RoleEnum, Consent, Patient, ConsentPurpose, Diagnosis, Doctor, MedicalLab, TestRequest, SymptomStatus, Referral, TestResults, TestType
from schemas import UserCreate, UserOut, SymptomCreate, SymptomOut, ConsentOut, PatientOut, DiagnosisOut, PatientSymptomDetails, DoctorOut, DiagnosisCreate, MedicalLabs, LabAssignmentCreate, LabAssignmentOut, ReferralCreate, SymptomHistory
from fastapi.security import OAuth2PasswordRequestForm
import os
import shutil
from typing import List, Optional
from .auth import authenticate_user, create_access_token, get_password_hash, verify_role
from datetime import datetime
from uuid import uuid4

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


@router.post("/upload-image/")
def upload_image(file: UploadFile = File(...)):
    file_location = f"{PATIENT_IMAGE_DIR}/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"image_path": file_location}


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
        image_path=symptom.image_path,
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


@router.get("/symptoms-history/", response_model=List[SymptomHistory])
def get_symptom_history(
    current_user: User = Depends(verify_role(RoleEnum.PATIENT)), 
    db: Session = Depends(get_db)):
    symptoms = db.query(Symptom).filter(Symptom.patient_id == current_user.id).order_by(Symptom.timestamp.desc()).all()
    
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
            image_path=s.image_path,
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
            image_path=[symptom.image_path] if symptom.image_path else [],
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


@router.get("/symptom_details/{symptom_id}", response_model=PatientSymptomDetails)
def get_full_symptom_record(symptom_id: int, current_user: User = Depends(verify_role(RoleEnum.DOCTOR)), db: Session = Depends(get_db)):
    # Fetch symptom
    symptom = db.query(Symptom).filter(Symptom.id == symptom_id).first()
    if not symptom:
        raise HTTPException(status_code=404, detail="Symptom not found")

    # Fetch patient info
    patient = db.query(Patient).filter(Patient.id == symptom.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user = db.query(User).filter(User.id == patient.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Initialize consent booleans from the Symptom model itself
    consent_out = ConsentOut(
        treatment=symptom.consent_treatment,
        referral=symptom.consent_referral,
        research=symptom.consent_research
    )

    # Fetch diagnoses for the symptom
    diagnoses = db.query(Diagnosis).filter(Diagnosis.symptom_id == symptom.id).all()
    diagnosis_list = []

    for diag in diagnoses:
        doctor_user = (
            db.query(User)
            .join(Doctor, Doctor.id == User.id)
            .filter(User.id == diag.doctor_id)
            .first()
        )

        diagnosis_list.append(
            DiagnosisOut(
                id=str(diag.id),
                doctorId=str(diag.doctor_id),
                doctorName=doctor_user.name if doctor_user else "Unknown Doctor",
                analysis=diag.diagnosis_content,
                createdAt=diag.timestamp
            )
        )

    # Fetch TestRequest for the symptom
    test_request = db.query(TestRequest).filter(TestRequest.symptom_id == symptom.id).first()

    test_result_out = []
    if test_request:
        # Fetch all test results associated with this TestRequest
        test_results = db.query(TestResults).filter(TestResults.test_request_id == test_request.id).all()

        # Loop through test results and prepare the response
        for result in test_results:
            test_result_out.append({
                "uploadedAt": result.uploaded_at,
                "files": [
                    {"name": file["file_name"], "url": file["file_url"]} 
                    for file in result.files
                ],
                "summary": result.summary
            })

    # Fetch the test type associated with the request
    test_type_name = None
    if test_request:
        test_type = db.query(TestType).filter(TestType.id == test_request.test_type_id).first()
        if test_type:
            test_type_name = test_type.name

    return PatientSymptomDetails(
        id=str(symptom.id),
        patient=PatientOut(
            id=str(patient.id),
            name=user.name,
            age=user.age,
            gender=user.gender,
            phone=patient.phone_number,
            email=patient.email,
            address=patient.location
        ),
        symptoms=symptom.symptoms,
        testType=test_type_name,
        testResults=test_result_out,
        images=[symptom.image_path] if symptom.image_path else [],
        submittedAt=symptom.timestamp,
        status=symptom.status,
        diagnoses=diagnosis_list,
        consent=consent_out
    )



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