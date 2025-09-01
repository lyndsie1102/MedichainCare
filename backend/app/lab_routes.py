import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.orm import Session
from database import get_db
from models import (
    User,
    Symptom,
    RoleEnum,
    Patient,
    Doctor,
    TestRequest,
    SymptomStatus,
    TestResults,
    TestType,
    LabStaff,
    TestRequestStatus,
    AppointmentStatus,
    Appointment,
)
from schemas import DoctorOut, TestRequestOut, AppointmentSchedule
import os
import shutil
from typing import List, Optional
from .auth import verify_role
from datetime import datetime, date, time

router = APIRouter()


LAB_RESULT_DIR = "uploads/lab_results"

# Ensure directories exist
os.makedirs(LAB_RESULT_DIR, exist_ok=True)


@router.get("/lab-staff/me")
def get_lab_staff_details(
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
    db: Session = Depends(get_db),
):
    lab_staff = db.query(User).filter(User.id == current_user.id).first()

    if not lab_staff:
        raise HTTPException(status_code=404, detail="Lab staff details not found")

    return {"name": lab_staff.name}


@router.get("/test-requests", response_model=List[TestRequestOut])
def get_lab_dashboard(
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
    db: Session = Depends(get_db),
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
        if status.upper() in [
            TestRequestStatus.PENDING.value.upper(),
            TestRequestStatus.UPLOADED.value.upper(),
        ]:
            query = query.filter(
                TestRequest.status == TestRequestStatus(status.lower())
            )
        elif status.upper() in [
            AppointmentStatus.CANCELLED.value.upper(),
            AppointmentStatus.SCHEDULED.value.upper(),
        ]:
            query = query.filter(
                Appointment.status == AppointmentStatus(status.title())
            )

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
        patient = (
            db.query(Patient).filter_by(id=symptom.patient_id).first()
            if symptom
            else None
        )
        patient_user = (
            db.query(User).filter_by(id=patient.id).first() if patient else None
        )

        # Get appointments
        appointments = (
            db.query(Appointment).filter_by(test_request_id=test_request.id).all()
        )
        appointment = appointments[0] if appointments else None

        results.append(
            TestRequestOut(
                id=str(test_request.id),
                doctor=(
                    DoctorOut(
                        id=doctor.id,
                        name=doctor_user.name if doctor_user else "Unknown",
                        specialty=doctor.specialty if doctor else "Unknown",
                    )
                    if doctor
                    else None
                ),
                request_time=(
                    test_request.requested_at.isoformat()
                    if test_request.requested_at
                    else None
                ),
                patient_name=patient_user.name if patient_user else "Unknown",
                patient_age=patient_user.age if patient_user else None,
                test_type=test_type.name if test_type else "Unknown Test Type",
                status=test_request.status.value.title(),
                upload_token=test_request.upload_token,
                uploaded_result_path=test_request.uploaded_result_path,
                appointment_id=(
                    appointment.id if appointment and appointment.id else None
                ),
                appointment_status=(
                    appointment.status.value
                    if appointment and appointment.status
                    else None
                ),
                appointment_schedule=(
                    appointment.scheduled_at.isoformat()
                    if appointment and appointment.scheduled_at
                    else None
                ),
            )
        )

    return results


@router.post("/lab/upload/{token}")
def upload_lab_result(
    token: str,
    files: List[UploadFile] = File(...),  # Accepting multiple files
    summary: str = Form(None),
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
    db: Session = Depends(get_db),
):
    # Retrieve the test request based on the token
    assignment = db.query(TestRequest).filter_by(upload_token=token, status="pending").first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Invalid token")

    # List to store file paths
    uploaded_files = []

    # Save each file and generate file path
    for file in files:
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(LAB_RESULT_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Append file path to the uploaded files list
        uploaded_files.append({"name": file.filename, "path": file_path})

    # Create a new entry in the TestResults table for each uploaded file
    test_result = TestResults(
        test_request_id=assignment.id,
        files=uploaded_files,  # Storing multiple files in the 'files' field
        summary=summary,  # Optionally add a summary
        uploaded_at=datetime.utcnow(),
    )

    db.add(test_result)

    # Update the TestRequest table with the uploaded result file paths and time
    assignment.uploaded_result_path = uploaded_files[0][
        "path"
    ]  # You can choose how to represent the first file path
    assignment.uploaded_at = datetime.utcnow()
    assignment.symptom.status = SymptomStatus.TESTED
    assignment.status = TestRequestStatus.UPLOADED
    db.commit()

    return {
        "message": f"{len(files)} file(s) uploaded successfully.",
        "status": "Uploaded",
    }


@router.post("/appointments/{test_request_id}/schedule")
async def schedule_appointment(
    test_request_id: int,
    payload: AppointmentSchedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
):

    # Step 1: Check if the test request exists
    test_request = (
        db.query(TestRequest).filter(TestRequest.id == test_request_id).first()
    )
    if not test_request:
        raise HTTPException(status_code=404, detail="Test request not found")

    # Step 2: Combine date and time to form a datetime object
    try:
        # Combine date and time into a single string and convert to datetime object
        combined_datetime_str = f"{payload.date} {payload.time}"
        scheduled_at = datetime.strptime(combined_datetime_str, "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date or time format. Use 'YYYY-MM-DD' for date and 'HH:MM' for time.",
        )

    # Step 3: Check if the lab staff is already assigned to an appointment at the same time
    existing_lab_staff_appointment = (
        db.query(Appointment)
        .filter(
            Appointment.lab_staff_id
            == current_user.id,  # Check for the current lab staff
            Appointment.scheduled_at == scheduled_at,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .first()
    )

    if existing_lab_staff_appointment:
        raise HTTPException(
            status_code=409,
            detail="Lab staff is already scheduled for another appointment at this time",
        )

    # Step 4: If there's a cancelled appointment, reschedule it
    appointment = (
        db.query(Appointment)
        .filter(Appointment.test_request_id == test_request_id)
        .first()
    )
    if appointment and appointment.status == AppointmentStatus.CANCELLED:
        appointment.scheduled_at = scheduled_at
        appointment.status = AppointmentStatus.SCHEDULED
        db.commit()
        db.refresh(appointment)
        scheduled_time_str = appointment.scheduled_at.strftime("%Y-%m-%d %H:%M")
        return {
            "message": f"Appointment rescheduled successfully for {scheduled_time_str}"
        }

    # Step 5: Create the appointment
    new_appointment = Appointment(
        scheduled_at=scheduled_at,
        test_request_id=test_request_id,
        patient_id=test_request.symptom.patient_id,
        lab_staff_id=current_user.id,
        status=AppointmentStatus.SCHEDULED,
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    scheduled_time_str = new_appointment.scheduled_at.strftime("%Y-%m-%d %H:%M")

    # Step 5: Update the status of the associated symptom to 'WAITING FOR TEST'
    test_request.symptom.status = SymptomStatus.WAITING
    db.commit()

    return {"message": f"Appointment scheduled successfully for {scheduled_time_str}"}


# Cancel appointment API
@router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_role(RoleEnum.LAB_STAFF)),
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
    return {
        "message": f"Appointment with ID {appointment_id} has been cancelled successfully."
    }
