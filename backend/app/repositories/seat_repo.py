from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime

from app.models.seat import Seat
from app.models.seat_allocation import SeatAllocation
from app.models.employee import Employee
from app.schemas.seat import SeatCreate, SeatUpdate

class SeatRepository:
    @staticmethod
    def get_by_id(db: Session, seat_id: int) -> Optional[Dict[str, Any]]:
        seat = db.query(Seat).filter(Seat.id == seat_id).first()
        if not seat:
            return None

        # Fetch active occupant if occupied
        occupant_query = db.query(
            Employee.id.label("employee_id"),
            Employee.employee_id.label("employee_code"),
            Employee.name.label("employee_name")
        ).join(
            SeatAllocation, SeatAllocation.employee_id == Employee.id
        ).filter(
            SeatAllocation.seat_id == seat_id,
            SeatAllocation.is_active == True
        ).first()

        assigned_employee_id = occupant_query.employee_id if occupant_query else None
        assigned_employee_name = occupant_query.employee_name if occupant_query else None
        assigned_employee_code = occupant_query.employee_code if occupant_query else None

        return {
            "id": seat.id,
            "building": seat.building,
            "floor": seat.floor,
            "zone": seat.zone,
            "seat_number": seat.seat_number,
            "status": seat.status,
            "assigned_employee_id": assigned_employee_id,
            "assigned_employee_name": assigned_employee_name,
            "assigned_employee_code": assigned_employee_code
        }

    @staticmethod
    def get_all(
        db: Session,
        search: Optional[str] = None,
        building: Optional[str] = None,
        floor: Optional[str] = None,
        zone: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        # Fetch seats with active occupant details using a single outer join
        query = db.query(
            Seat,
            Employee.id.label("employee_id"),
            Employee.name.label("employee_name"),
            Employee.employee_id.label("employee_code")
        ).outerjoin(
            SeatAllocation, (SeatAllocation.seat_id == Seat.id) & (SeatAllocation.is_active == True)
        ).outerjoin(
            Employee, Employee.id == SeatAllocation.employee_id
        )

        if building:
            query = query.filter(Seat.building == building)
        if floor:
            query = query.filter(Seat.floor == floor)
        if zone:
            query = query.filter(Seat.zone == zone)
        if status:
            query = query.filter(Seat.status == status)

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Seat.seat_number.ilike(search_filter),
                    Seat.building.ilike(search_filter),
                    Seat.floor.ilike(search_filter),
                    Seat.zone.ilike(search_filter),
                    Employee.name.ilike(search_filter),
                    Employee.employee_id.ilike(search_filter)
                )
            )

        results = query.order_by(Seat.seat_number.asc()).all()

        mapped_seats = []
        for s, emp_id, emp_name, emp_code in results:
            mapped_seats.append({
                "id": s.id,
                "building": s.building,
                "floor": s.floor,
                "zone": s.zone,
                "seat_number": s.seat_number,
                "status": s.status,
                "assigned_employee_id": emp_id,
                "assigned_employee_name": emp_name,
                "assigned_employee_code": emp_code
            })

        return mapped_seats

    @staticmethod
    def create(db: Session, schema: SeatCreate) -> Seat:
        db_seat = Seat(
            building=schema.building,
            floor=schema.floor,
            zone=schema.zone,
            seat_number=schema.seat_number,
            status=schema.status
        )
        db.add(db_seat)
        db.commit()
        db.refresh(db_seat)
        return db_seat

    @staticmethod
    def update(db: Session, seat_id: int, schema: SeatUpdate) -> Optional[Seat]:
        db_seat = db.query(Seat).filter(Seat.id == seat_id).first()
        if not db_seat:
            return None

        update_data = schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_seat, key, value)

        db.commit()
        db.refresh(db_seat)
        return db_seat

    @staticmethod
    def delete(db: Session, seat_id: int) -> bool:
        db_seat = db.query(Seat).filter(Seat.id == seat_id).first()
        if not db_seat:
            return False

        # Release active allocations
        active_allocs = db.query(SeatAllocation).filter(
            SeatAllocation.seat_id == seat_id,
            SeatAllocation.is_active == True
        ).all()
        for alloc in active_allocs:
            alloc.is_active = False
            alloc.released_at = datetime.utcnow()

        db.delete(db_seat)
        db.commit()
        return True

    @staticmethod
    def get_layout_metadata(db: Session) -> Dict[str, List[str]]:
        # Help UI build drop downs dynamically
        buildings = db.query(Seat.building).distinct().all()
        floors = db.query(Seat.floor).distinct().all()
        zones = db.query(Seat.zone).distinct().all()

        return {
            "buildings": sorted([b[0] for b in buildings if b[0]]),
            "floors": sorted([f[0] for f in floors if f[0]]),
            "zones": sorted([z[0] for z in zones if z[0]])
        }
