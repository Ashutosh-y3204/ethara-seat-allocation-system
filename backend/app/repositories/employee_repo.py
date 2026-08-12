from typing import Optional, Tuple, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
from datetime import datetime

from app.models.employee import Employee
from app.models.department import Department
from app.models.seat_allocation import SeatAllocation
from app.models.seat import Seat
from app.models.project_membership import ProjectMembership
from app.models.project import Project
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.auth_service import hash_password

class EmployeeRepository:
    @staticmethod
    def get_by_id(db: Session, employee_id: int) -> Optional[tuple[Employee, Optional[str], Optional[str]]]:
        # Return employee and their active seat and active project
        result = db.query(
            Employee,
            Seat.seat_number.label("assigned_seat"),
            Project.name.label("assigned_project")
        ).outerjoin(
            SeatAllocation, (SeatAllocation.employee_id == Employee.id) & (SeatAllocation.is_active == True)
        ).outerjoin(
            Seat, Seat.id == SeatAllocation.seat_id
        ).outerjoin(
            ProjectMembership, (ProjectMembership.employee_id == Employee.id) & (ProjectMembership.is_active == True)
        ).outerjoin(
            Project, Project.id == ProjectMembership.project_id
        ).filter(Employee.id == employee_id).first()

        return result

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.email == email).first()

    @staticmethod
    def get_by_emp_code(db: Session, employee_id: str) -> Optional[Employee]:
        return db.query(Employee).filter(Employee.employee_id == employee_id).first()

    @staticmethod
    def get_all_paginated(
        db: Session,
        page: int = 1,
        size: int = 10,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        status: Optional[str] = None,
        sort_by: str = "employee_id",
        sort_order: str = "asc"
    ) -> Tuple[int, List[Dict[str, Any]]]:
        # Build query
        query = db.query(
            Employee,
            Seat.seat_number.label("assigned_seat"),
            Project.name.label("assigned_project")
        ).outerjoin(
            SeatAllocation, (SeatAllocation.employee_id == Employee.id) & (SeatAllocation.is_active == True)
        ).outerjoin(
            Seat, Seat.id == SeatAllocation.seat_id
        ).outerjoin(
            ProjectMembership, (ProjectMembership.employee_id == Employee.id) & (ProjectMembership.is_active == True)
        ).outerjoin(
            Project, Project.id == ProjectMembership.project_id
        )

        # Filters
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        if status:
            query = query.filter(Employee.status == status)

        # Search
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Employee.name.ilike(search_filter),
                    Employee.email.ilike(search_filter),
                    Employee.employee_id.ilike(search_filter),
                    Employee.designation.ilike(search_filter)
                )
            )

        # Sorting
        sort_column = getattr(Employee, sort_by, Employee.employee_id)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Fast total count on Employee table without computing expensive 4-table outer joins
        count_query = db.query(func.count(Employee.id))
        if department_id:
            count_query = count_query.filter(Employee.department_id == department_id)
        if status:
            count_query = count_query.filter(Employee.status == status)
        if search:
            search_filter = f"%{search}%"
            count_query = count_query.filter(
                or_(
                    Employee.name.ilike(search_filter),
                    Employee.email.ilike(search_filter),
                    Employee.employee_id.ilike(search_filter),
                    Employee.designation.ilike(search_filter)
                )
            )
        total = count_query.scalar() or 0

        # Pagination for the current page
        offset = (page - 1) * size
        results = query.offset(offset).limit(size).all()

        # Map to structured dictionary lists
        items = []
        for emp, seat, proj in results:
            # Pydantic is configured with from_attributes, so we can mock or construct objects
            emp_dict = {
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
            items.append(emp_dict)

        return total, items

    @staticmethod
    def create(db: Session, schema: EmployeeCreate) -> Employee:
        # Hashing password
        raw_password = schema.password or "password123"
        hashed = hash_password(raw_password)
        
        db_employee = Employee(
            employee_id=schema.employee_id,
            name=schema.name,
            email=schema.email,
            phone=schema.phone,
            password_hash=hashed,
            department_id=schema.department_id,
            designation=schema.designation,
            joining_date=schema.joining_date,
            role=schema.role,
            status=schema.status
        )
        db.add(db_employee)
        db.commit()
        db.refresh(db_employee)
        return db_employee

    @staticmethod
    def update(db: Session, employee_id: int, schema: EmployeeUpdate) -> Optional[Employee]:
        db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not db_employee:
            return None
            
        update_data = schema.model_dump(exclude_unset=True)
        
        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = hash_password(update_data.pop("password"))
        elif "password" in update_data:
            update_data.pop("password")
            
        for key, value in update_data.items():
            setattr(db_employee, key, value)
            
        db.commit()
        db.refresh(db_employee)
        return db_employee

    @staticmethod
    def delete(db: Session, employee_id: int) -> bool:
        db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not db_employee:
            return False
            
        # Before deleting or disabling, release seats & project memberships
        # Seat release
        active_seat = db.query(SeatAllocation).filter(
            SeatAllocation.employee_id == employee_id,
            SeatAllocation.is_active == True
        ).first()
        if active_seat:
            active_seat.is_active = False
            active_seat.released_at = datetime.utcnow()
            active_seat.seat.status = "Available"
            
        # Project release
        active_projs = db.query(ProjectMembership).filter(
            ProjectMembership.employee_id == employee_id,
            ProjectMembership.is_active == True
        ).all()
        for member in active_projs:
            member.is_active = False
            member.released_at = datetime.utcnow()

        db.delete(db_employee)
        db.commit()
        return True
