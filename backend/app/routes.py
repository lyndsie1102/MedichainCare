from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Patient, User
from schemas import PatientCreate, PatientOut, UserCreate, UserOut

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/patients", response_model=PatientOut)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    db_patient = Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.get("/patients", response_model=list[PatientOut])
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).all()

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
    return {"message": "Login successful", "user": {"username": db_user.username, "role": db_user.role}}
