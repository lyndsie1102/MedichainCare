from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, FastAPI
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Symptom
from schemas import UserCreate, UserOut, SymptomCreate, SymptomOut
import os
import shutil
from typing import List



router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

UPLOAD_DIR = "uploaded_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter_by(username=user.username, password=user.password).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid Credentials")
    return {"message": "Login successful", "user": {"id": db_user.id, "username": db_user.username, "role": db_user.role}}

@router.post("/upload-image/")
def upload_image(file: UploadFile = File(...)):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"image_path": file_location}


@router.post("/symptoms/")
def submit_symptomsdef(symptom: SymptomCreate, db: Session = Depends(get_db)):
    new_symptom = Symptom(
        patient_id=symptom.patient_id,
        symptoms=symptom.symptoms,
        image_path=symptom.image_path
    )
    db.add(new_symptom)
    db.commit()
    db.refresh(new_symptom)
    return {"message": "Symptom submitted", "id": new_symptom.id}

@router.get("/symptoms/history/{patient_id}", response_model=List[SymptomOut])
def get_symptom_history(patient_id: int, db: Session = Depends(get_db)):
    symptoms = db.query(Symptom).filter(Symptom.patient_id == patient_id).order_by(Symptom.timestamp.desc()).all()
    
    result = []
    for s in symptoms:
        result.append(SymptomOut(
            id=s.id,
            symptoms=s.symptoms,
            image_path=s.image_path,
            status=s.status,
            date=s.timestamp.strftime("%Y-%m-%d"),
            time=s.timestamp.strftime("%H:%M"),
            hasImage=bool(s.image_path)
        ))
    return result
