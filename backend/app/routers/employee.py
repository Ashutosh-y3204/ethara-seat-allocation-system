from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeePaginated
from app.schemas.department import DepartmentOut
from app.repositories.employee_repo import EmployeeRepository
from app.models.employee import Employee
from app.models.department import Department
from app.services.auth_service import get_current_user, RoleChecker

router = APIRouter(prefix="/api/employees", tags=["Employee Management"])

@router.get("", response_model=EmployeePaginated)
def get_employees(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("employee_id"),
    sort_order: str = Query("asc"),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total, items = EmployeeRepository.get_all_paginated(
        db, page, size, search, department_id, status, sort_by, sort_order
    )
    pages = (total + size - 1) // size
    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
        "items": items
    }

@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(
    db: Session = Depends(get_db)
):
    return db.query(Department).order_by(Department.name.asc()).all()

@router.get("/{id}", response_model=EmployeeOut)
def get_employee(
    id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = EmployeeRepository.get_by_id(db, id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
        
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

@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    schema: EmployeeCreate,
    current_user: Employee = Depends(RoleChecker(["Admin", "HR"])),
    db: Session = Depends(get_db)
):
    # Verify email uniqueness
    if EmployeeRepository.get_by_email(db, schema.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee with this email already exists"
        )
        
    # Verify code uniqueness
    if EmployeeRepository.get_by_emp_code(db, schema.employee_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee with this Employee ID already exists"
        )
        
    emp = EmployeeRepository.create(db, schema)
    result = EmployeeRepository.get_by_id(db, emp.id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create employee")
        
    emp_db, seat, proj = result
    return {
        "id": emp_db.id,
        "employee_id": emp_db.employee_id,
        "name": emp_db.name,
        "email": emp_db.email,
        "phone": emp_db.phone,
        "department_id": emp_db.department_id,
        "designation": emp_db.designation,
        "joining_date": emp_db.joining_date,
        "role": emp_db.role,
        "status": emp_db.status,
        "department": emp_db.department,
        "assigned_seat": seat,
        "assigned_project": proj
    }

@router.put("/{id}", response_model=EmployeeOut)
def update_employee(
    id: int,
    schema: EmployeeUpdate,
    current_user: Employee = Depends(RoleChecker(["Admin", "HR"])),
    db: Session = Depends(get_db)
):
    # Check if exists
    result = EmployeeRepository.get_by_id(db, id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )

    # Validate email/code changes uniqueness
    if schema.email:
        existing = EmployeeRepository.get_by_email(db, schema.email)
        if existing and existing.id != id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use by another employee"
            )

    updated_emp = EmployeeRepository.update(db, id, schema)
    result_updated = EmployeeRepository.get_by_id(db, updated_emp.id)
    emp_db, seat, proj = result_updated
    return {
        "id": emp_db.id,
        "employee_id": emp_db.employee_id,
        "name": emp_db.name,
        "email": emp_db.email,
        "phone": emp_db.phone,
        "department_id": emp_db.department_id,
        "designation": emp_db.designation,
        "joining_date": emp_db.joining_date,
        "role": emp_db.role,
        "status": emp_db.status,
        "department": emp_db.department,
        "assigned_seat": seat,
        "assigned_project": proj
    }

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    id: int,
    current_user: Employee = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    success = EmployeeRepository.delete(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return
