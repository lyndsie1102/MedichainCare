from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import models
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from models import User, RoleEnum, TokenBlacklist
from database import get_db
from typing import Union, List
import os
from dotenv import load_dotenv

load_dotenv(".env")
# Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3600

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str) -> User:
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if not user:
        return None

    # Verify the password first
    if not verify_password(password, user.hashed_password):
        return None

    return user


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4()),
        })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        jti = payload.get("jti")
        if username is None or jti is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if jti is blacklisted
        blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first()
        if blacklisted:
            raise HTTPException(status_code=401, detail="Token has been revoked")
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


#Verify if the user is authenticated and has the required role.
def verify_role(required_roles: Union[RoleEnum, List[RoleEnum]]):
    # If a single role is passed, make it a list
    if isinstance(required_roles, RoleEnum):
        required_roles = [required_roles]
        
    def role_dependency(current_user: User = Depends(get_current_user)):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if the user's role is in the list of required roles
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User are not authorized to access this endpoint."
            )
        
        return current_user
    return role_dependency