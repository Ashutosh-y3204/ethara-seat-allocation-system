from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.employee import Employee
from app.models.seat import Seat
from app.models.seat_allocation import SeatAllocation
from app.models.department import Department
from fastapi import HTTPException, status

class SeatAllocationService:
    @staticmethod
    def allocate_seat(db: Session, employee_id: int, seat_id: int) -> SeatAllocation:
        # Check if employee exists and is active
        employee = db.query(Employee).filter(Employee.id == employee_id, Employee.status == "Active").first()
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active employee not found")

        # Check if seat exists and is available
        seat = db.query(Seat).filter(Seat.id == seat_id).first()
        if not seat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat not found")
        if seat.status != "Available":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Seat is not available for allocation. Current status: {seat.status}"
            )

        # Rule 1: One active seat per employee. Release existing active seat allocation first.
        existing_allocations = db.query(SeatAllocation).filter(
            SeatAllocation.employee_id == employee_id,
            SeatAllocation.is_active == True
        ).all()
        for alloc in existing_allocations:
            alloc.is_active = False
            alloc.released_at = datetime.utcnow()
            alloc.seat.status = "Available"

        # Rule 2: No duplicate allocations. Ensure seat does not have other active allocations (fail-safe).
        seat_active_allocs = db.query(SeatAllocation).filter(
            SeatAllocation.seat_id == seat_id,
            SeatAllocation.is_active == True
        ).all()
        for s_alloc in seat_active_allocs:
            s_alloc.is_active = False
            s_alloc.released_at = datetime.utcnow()

        # Update seat status and create allocation record
        seat.status = "Occupied"
        new_allocation = SeatAllocation(
            employee_id=employee_id,
            seat_id=seat_id,
            is_active=True,
            allocated_at=datetime.utcnow()
        )
        db.add(new_allocation)
        db.commit()
        db.refresh(new_allocation)
        return new_allocation

    @staticmethod
    def release_seat(db: Session, seat_id: int) -> Optional[SeatAllocation]:
        # Find active allocation for this seat
        allocation = db.query(SeatAllocation).filter(
            SeatAllocation.seat_id == seat_id,
            SeatAllocation.is_active == True
        ).first()
        
        if not allocation:
            # If no active allocation but seat is occupied/reserved, just mark available
            seat = db.query(Seat).filter(Seat.id == seat_id).first()
            if seat:
                seat.status = "Available"
                db.commit()
            return None

        # Archive allocation
        allocation.is_active = False
        allocation.released_at = datetime.utcnow()
        
        # Reset seat status
        allocation.seat.status = "Available"
        db.commit()
        db.refresh(allocation)
        return allocation

    @staticmethod
    def suggest_seat(db: Session, employee_id: int) -> Dict[str, Any]:
        """
        Smart suggestion algorithm for New Joiners:
        Finds where other members of the employee's department are sitting
        and suggests the closest available seat to them.
        """
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

        # 1. Fetch buildings and floors where department colleagues are sitting
        colleague_locations = db.query(Seat.building, Seat.floor, Seat.zone, func.count(Seat.id).label("count")).join(
            SeatAllocation, SeatAllocation.seat_id == Seat.id
        ).join(
            Employee, Employee.id == SeatAllocation.employee_id
        ).filter(
            Employee.department_id == employee.department_id,
            SeatAllocation.is_active == True
        ).group_by(
            Seat.building, Seat.floor, Seat.zone
        ).order_by(
            func.count(Seat.id).desc()
        ).all()

        # 2. Try to find a seat matching the colleague coordinates starting with most concentrated zone
        for building, floor, zone, count in colleague_locations:
            suggested = db.query(Seat).filter(
                Seat.building == building,
                Seat.floor == floor,
                Seat.zone == zone,
                Seat.status == "Available"
            ).first()
            if suggested:
                return {
                    "seat": suggested,
                    "reason": f"Colleagues from your department ({employee.department.name}) are located here."
                }
            
            # Try same floor, any zone
            suggested = db.query(Seat).filter(
                Seat.building == building,
                Seat.floor == floor,
                Seat.status == "Available"
            ).first()
            if suggested:
                return {
                    "seat": suggested,
                    "reason": f"Same floor ({floor}) as department colleagues."
                }

        # 3. Fallback: Check if there's any seat in the department's most common building
        if colleague_locations:
            primary_building = colleague_locations[0][0]
            suggested = db.query(Seat).filter(
                Seat.building == primary_building,
                Seat.status == "Available"
            ).first()
            if suggested:
                return {
                    "seat": suggested,
                    "reason": f"Same building ({primary_building}) as department colleagues."
                }

        # 4. Final Fallback: Suggest the first available seat
        suggested = db.query(Seat).filter(Seat.status == "Available").first()
        if suggested:
            return {
                "seat": suggested,
                "reason": "Suggested general available seat (no department colleagues detected or their zones are full)."
            }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No available seats in the system."
        )

    @staticmethod
    def get_seat_history(db: Session, seat_id: int) -> List[SeatAllocation]:
        return db.query(SeatAllocation).filter(
            SeatAllocation.seat_id == seat_id
        ).order_by(SeatAllocation.allocated_at.desc()).all()
