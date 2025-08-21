import pytest
from fastapi.testclient import TestClient
from main import app
from database import Base, engine, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import (User, Doctor, Patient, MedicalLab, LabStaff, Appointment, Symptom, 
                    Diagnosis, Consent, TestRequest, Referral, TestType, TestResults, 
                    TokenBlacklist, SymptomStatus, GenderEnum, RoleEnum, ConsentPurpose,
                    TestRequestStatus, AppointmentStatus)
from app.auth import create_access_token
from datetime import timedelta

# Create a testing database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# Set up the testing database session
@pytest.fixture(scope="module")
def db_session():
    # Create a new engine and bind it to Base
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)

    # Create a new session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    yield db
    db.close()

# Provide the client for testing
@pytest.fixture(scope="module")
def client(db_session):
    # Inject the test db session into the app
    def override_get_db():
        return db_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    return client

# Mock authentication token for tests
@pytest.fixture()
def fake_token():
    # Simulating a JWT token for testing
    user_data = {"sub": "testuser", "role": "doctor"}  # Adjust to your model
    return create_access_token(data=user_data, expires_delta=timedelta(hours=1))
