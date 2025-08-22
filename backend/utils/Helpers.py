# Conditions to validate files uploaded
from fastapi import UploadFile

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "bmp"}
MAX_FILE_SIZE_MB = 5


def allowed_file(filename: str) -> bool:
    """Check if the file extension is allowed"""
    return filename.split(".")[-1].lower() in ALLOWED_EXTENSIONS


def check_file_size(file: UploadFile) -> bool:
    """Check if the file size is within the allowed limit"""
    return len(file.file.read()) <= MAX_FILE_SIZE_MB * 1024 * 1024
