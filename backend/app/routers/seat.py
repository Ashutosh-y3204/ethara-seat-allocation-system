from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.schemas.seat import SeatCreate, SeatUpdate, SeatOut, AllocateSeatRequest, SeatHistoryOut
from app.repositories.seat_repo import SeatRepository
from app.services.seat_allocation_service import SeatAllocationService
from app.models.employee import Employee
from app.services.auth_service import get_current_user, RoleChecker

router = APIRouter(prefix="/api/seats", tags=["Seat Management"])

@router.get("", response_model=List[SeatOut])
def get_seats(
    search: Optional[str] = Query(None),
    building: Optional[str] = Query(None),
    floor: Optional[str] = Query(None),
    zone: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return SeatRepository.get_all(db, search, building, floor, zone, status)

@router.get("/layout-metadata")
def get_layout_metadata(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return SeatRepository.get_layout_metadata(db)

@router.get("/suggest/{employee_id}")
def suggest_seat(
    employee_id: int,
    current_user: Employee = Depends(RoleChecker(["Admin", "HR"])),
    db: Session = Depends(get_db)
):
    suggestion = SeatAllocationService.suggest_seat(db, employee_id)
    seat = suggestion["seat"]
    return {
        "seat_id": seat.id,
        "seat_number": seat.seat_number,
        "building": seat.building,
        "floor": seat.floor,
        "zone": seat.zone,
        "reason": suggestion["reason"]
    }

@router.get("/{id}", response_model=SeatOut)
def get_seat(
    id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    seat = SeatRepository.get_by_id(db, id)
    if not seat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seat not found"
        )
    return seat

@router.get("/{id}/history", response_model=List[SeatHistoryOut])
def get_seat_history(
    id: int,
    current_user: Employee = Depends(RoleChecker(["Admin", "HR"])),
    db: Session = Depends(get_db)
):
    history = SeatAllocationService.get_seat_history(db, id)
    
    # Map to schema
    output = []
    for h in history:
        output.append({
            "id": h.id,
            "employee_id": h.employee_id,
            "employee_code": h.employee.employee_id,
            "employee_name": h.employee.name,
            "allocated_at": h.allocated_at,
            "released_at": h.released_at,
            "is_active": h.is_active
        })
    return output

@router.post("", response_model=SeatOut, status_code=status.HTTP_201_CREATED)
def create_seat(
    schema: SeatCreate,
    current_user: Employee = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    from app.models.seat import Seat
    if db.query(Seat).filter(Seat.seat_number == schema.seat_number).first():
        raise HTTPException(status_code=400, detail="Seat number already exists")
        
    seat = SeatRepository.create(db, schema)
    return SeatRepository.get_by_id(db, seat.id)

@router.put("/{id}", response_model=SeatOut)
def update_seat(
    id: int,
    schema: SeatUpdate,
    current_user: Employee = Depends(RoleChecker(["Admin", "HR"])),
    db: Session = Depends(get_db)
):
    from app.models.seat import Seat
    seat_db = db.query(Seat).filter(Seat.id == id).first()
    if not seat_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat not found")

    if schema.seat_number:
        existing = db.query(Seat).filter(Seat.seat_number == schema.seat_number).first()
        if existing and existing.id != id:
            raise HTTPException(status_code=400, detail="Seat number already in use")

    SeatRepository.update(db, id, schema)
    return SeatRepository.get_by_id(db, id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_seat(
    id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = SeatRepository.delete(db, id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat not found")
    return

@router.post("/{id}/allocate", response_model=SeatOut)
def allocate_seat(
    id: int,
    schema: AllocateSeatRequest,
    current_user: Employee = Depends(RoleChecker(["Admin", "HR"])),
    db: Session = Depends(get_db)
):
    SeatAllocationService.allocate_seat(db, schema.employee_id, id)
    return SeatRepository.get_by_id(db, id)

@router.post("/{id}/release", response_model=SeatOut)
def release_seat(
    id: int,
    current_user: Employee = Depends(RoleChecker(["Admin", "HR"])),
    db: Session = Depends(get_db)
):
    SeatAllocationService.release_seat(db, id)
    return SeatRepository.get_by_id(db, id)
