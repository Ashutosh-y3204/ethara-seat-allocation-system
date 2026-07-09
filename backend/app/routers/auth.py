from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.schemas.auth import (
    LoginRequest, TokenResponse, TokenRefreshRequest, RefreshTokenResponse, ForgotPasswordRequest
)
from app.schemas.employee import EmployeeCreate, EmployeeOut
from app.repositories.employee_repo import EmployeeRepository
from app.services.auth_service import (
    verify_password, create_access_token, create_refresh_token, decode_token, get_current_user
)
from app.models.employee import Employee

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def signup(schema: EmployeeCreate, db: Session = Depends(get_db)):
    # Check if email is unique
    existing_email = EmployeeRepository.get_by_email(db, schema.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee with this email already exists"
        )
        
    # Check if employee_id is unique
    existing_code = EmployeeRepository.get_by_emp_code(db, schema.employee_id)
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee with this Employee ID already exists"
        )
        
    employee = EmployeeRepository.create(db, schema)
    # Re-fetch with join fields
    result = EmployeeRepository.get_by_id(db, employee.id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create employee")
        
    emp, seat, proj = result
    return {
        "id": emp.id,
        "employee_id": emp.employee_id,
        "name": emp.name,
        "email": emp.email,
        "phone": emp.phone,
        "department_id": emp.department_id,
        "designation": emp.designation,
        "joining_date": emp.joining_date,
        "role": emp.role,
        "status": emp.status,
        "department": emp.department,
        "assigned_seat": seat,
        "assigned_project": proj
    }

@router.post("/login", response_model=TokenResponse)
def login(request_data: LoginRequest, db: Session = Depends(get_db)):
    employee = EmployeeRepository.get_by_email(db, request_data.email)
    if not employee or not verify_password(request_data.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if employee.status == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee account is deactivated"
        )

    # Fetch additional data for response
    result = EmployeeRepository.get_by_id(db, employee.id)
    seat = result[1] if result else None

    # Generate tokens
    user_claims = {"sub": employee.email, "role": employee.role}
    access_token = create_access_token(data=user_claims)
    refresh_token = create_refresh_token(data=user_claims)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": employee.role,
        "name": employee.name,
        "email": employee.email,
        "employee_id": employee.employee_id
    }

# Also support OAuth2 Form Data login for FastAPI docs (Swagger UI)
@router.post("/token", include_in_schema=False)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    employee = EmployeeRepository.get_by_email(db, form_data.username)
    if not employee or not verify_password(form_data.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_claims = {"sub": employee.email, "role": employee.role}
    access_token = create_access_token(data=user_claims)
    refresh_token = create_refresh_token(data=user_claims)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh(schema: TokenRefreshRequest):
    payload = decode_token(schema.refresh_token)
    email: Optional[str] = payload.get("sub")
    role: Optional[str] = payload.get("role")
    token_type: Optional[str] = payload.get("type")
    
    if email is None or role is None or token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    # Issue a new access token
    new_access_token = create_access_token(data={"sub": email, "role": role})
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@router.post("/forgot-password")
def forgot_password(schema: ForgotPasswordRequest, db: Session = Depends(get_db)):
    employee = EmployeeRepository.get_by_email(db, schema.email)
    # Return success even if email is not found to prevent user enumeration
    # In a real environment, send reset email
    return {"message": "If this email exists in our system, a password reset link has been sent."}

@router.get("/me", response_model=EmployeeOut)
def get_me(current_user: Employee = Depends(get_current_user), db: Session = Depends(get_db)):
    result = EmployeeRepository.get_by_id(db, current_user.id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User details not found")
        
    emp, seat, proj = result
    return {
        "id": emp.id,
        "employee_id": emp.employee_id,
        "name": emp.name,
        "email": emp.email,
        "phone": emp.phone,
        "department_id": emp.department_id,
        "designation": emp.designation,
        "joining_date": emp.joining_date,
        "role": emp.role,
        "status": emp.status,
        "department": emp.department,
        "assigned_seat": seat,
        "assigned_project": proj
    }
