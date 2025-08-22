import uuid
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from jose import jwt
from database import get_db
from models import  TokenBlacklist
from schemas import LoginRequest
from .auth import authenticate_user, create_access_token, oauth2_scheme, SECRET_KEY, ALGORITHM
from datetime import datetime

router = APIRouter()

    
@router.post("/login")
def login(
    login_data: LoginRequest,  # This will now receive the parsed JSON body
    db: Session = Depends(get_db)
):

    # Authenticate user from the database
    user = authenticate_user(db, login_data.username, login_data.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Convert the frontend role (string) to the corresponding integer
    role_map = {
        "patient": 1,
        "doctor": 2,
        "lab": 3
    }

    # Get the integer value of the requested role
    requested_role = role_map.get(login_data.role.lower())  # Convert to lowercase to ensure case-insensitivity
    if requested_role is None:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    # Check if the role from the request matches the role of the user
    if user.role != requested_role:
        raise HTTPException(status_code=403, detail="Role mismatch: Invalid role for user")

    # Create access token with the correct role
    access_token = create_access_token(data={
        "sub": user.username, 
        "role": user.role,  
        "eth_address": user.eth_address, 
        "jti": str(uuid.uuid4())
    })
    
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



    
