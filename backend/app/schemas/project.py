from pydantic import BaseModel
from datetime import date
from typing import Optional, List

class ProjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    capacity: int = 50
    start_date: date
    end_date: Optional[date] = None
    status: str = "Active" # Active, Completed, Proposed

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    capacity: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None

class ProjectMemberOut(BaseModel):
    employee_id: int
    emp_code: str
    name: str
    email: str
    designation: str
    assigned_at: date

class ProjectOut(ProjectBase):
    id: int
    current_occupancy: int = 0
    members: List[ProjectMemberOut] = []

    class Config:
        from_attributes = True

class AssignEmployeeRequest(BaseModel):
    employee_id: int
