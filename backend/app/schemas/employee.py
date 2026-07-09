from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional, List
from app.schemas.department import DepartmentOut

class EmployeeBase(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    department_id: int
    designation: str
    joining_date: date
    role: str = "Employee" # Admin, HR, Employee, Project Manager
    status: str = "Active" # Active, Inactive

class EmployeeCreate(EmployeeBase):
    password: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    joining_date: Optional[date] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    department: DepartmentOut
    assigned_seat: Optional[str] = None
    assigned_project: Optional[str] = None

    class Config:
        from_attributes = True

class EmployeePaginated(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: List[EmployeeOut]
