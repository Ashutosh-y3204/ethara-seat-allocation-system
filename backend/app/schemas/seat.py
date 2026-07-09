from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class SeatBase(BaseModel):
    building: str
    floor: str
    zone: str
    seat_number: str
    status: str = "Available" # Available, Occupied, Reserved, Maintenance

class SeatCreate(SeatBase):
    pass

class SeatUpdate(BaseModel):
    building: Optional[str] = None
    floor: Optional[str] = None
    zone: Optional[str] = None
    seat_number: Optional[str] = None
    status: Optional[str] = None

class SeatOut(SeatBase):
    id: int
    assigned_employee_id: Optional[int] = None
    assigned_employee_name: Optional[str] = None
    assigned_employee_code: Optional[str] = None

    class Config:
        from_attributes = True

class AllocateSeatRequest(BaseModel):
    employee_id: int

class SeatHistoryOut(BaseModel):
    id: int
    employee_id: int
    employee_code: str
    employee_name: str
    allocated_at: datetime
    released_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True
