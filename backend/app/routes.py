from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, FastAPI
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
from models import User, Symptom, RoleEnum, Consent, Patient, ConsentPurpose, Diagnosis, Doctor
from schemas import UserCreate, UserOut, SymptomCreate, SymptomOut, ConsentOut, PatientOut, DiagnosisOut, PatientSymptomDetails, DoctorOut, DiagnosisCreate
from fastapi.security import OAuth2PasswordRequestForm
import os
import shutil
from typing import List, Optional
from .auth import authenticate_user, create_access_token, get_password_hash, verify_role
from datetime import datetime

router = APIRouter()


UPLOAD_DIR = "uploaded_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    # Get all other doctors except the current one
    doctors = db.query(User).filter(
        User.role == RoleEnum.DOCTOR,
        User.id != current_user.id
    ).all()

    if not doctors:
        raise HTTPException(status_code=404, detail="No doctors found")

    return doctors


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

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/upload-image/")
def upload_image(file: UploadFile = File(...)):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"image_path": file_location}


@router.post("/symptoms/")
def submit_symptoms(symptom: SymptomCreate, 
                    current_user: User = Depends(verify_role(RoleEnum.PATIENT)), 
                    db: Session = Depends(get_db)):
    patient_id = current_user.id
    print(f"Patient ID: {patient_id}")
    new_symptom = Symptom(
        patient_id=patient_id,
        symptoms=symptom.symptoms,
        image_path=symptom.image_path
    )
    print(f"New Symptom: {new_symptom}")
    db.add(new_symptom)
    db.commit()
    db.refresh(new_symptom)
    print(f"New Symptom Saved: ID={new_symptom.id}, Symptoms={new_symptom.symptoms}")

    for consent_type, is_given in symptom.consents.items():
        if is_given:
            new_consent = Consent(
                patient_id=patient_id,
                symptom_id=new_symptom.id,
                consent_type=consent_type,
                is_granted=True,
                granted_at=datetime.utcnow()
            )
            db.add(new_consent)
            print(f"New Consent: {new_consent}")
    db.commit()
    return {"message": "Symptom submitted", "id": new_symptom.id}


@router.get("/symptoms/history/{patient_id}", response_model=List[SymptomOut])
def get_symptom_history(patient_id: int, db: Session = Depends(get_db)):
    symptoms = db.query(Symptom).filter(Symptom.patient_id == patient_id).order_by(Symptom.timestamp.desc()).all()
    
    result = []
    for s in symptoms:
        # Fetch consents related to this symptom
        consents = db.query(Consent).filter(Consent.symptom_id == s.id).all()
        
        # Collect consent types for the symptom (only those that are granted)
        consent_types = [consent.consent_type for consent in consents if consent.is_granted]
        
        # Add symptom data along with consent types
        result.append(SymptomOut(
            id=s.id,
            symptoms=s.symptoms,
            image_path=s.image_path,
            status=s.status,
            date=s.timestamp.strftime("%Y-%m-%d"),
            time=s.timestamp.strftime("%H:%M"),
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

    for symptom in all_symptoms:
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

    # Fetch all consents related to this symptom
    consents = db.query(Consent).filter(Consent.symptom_id == symptom.id).all()
    consent_dict = {
        "treatment": any(c.is_granted and c.consent_type == ConsentPurpose.TREATMENT for c in consents),
        "referral": any(c.is_granted and c.consent_type == ConsentPurpose.REFERRAL for c in consents),
        "research": any(c.is_granted and c.consent_type == ConsentPurpose.RESEARCH for c in consents),
    }

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
        images=[symptom.image_path] if symptom.image_path else [],
        submittedAt=symptom.timestamp,
        status=symptom.status,
        diagnoses=diagnosis_list,
        consent=ConsentOut(**consent_dict)
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
