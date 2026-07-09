import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.employee import Employee
from app.models.seat import Seat
from app.models.seat_allocation import SeatAllocation
from app.models.department import Department
from app.models.project import Project

class AIAssistantService:
    @staticmethod
    def process_query(db: Session, query_text: str) -> Dict[str, Any]:
        query = query_text.strip().lower()
        
        # 1. Pattern: "where is [Name] sitting?"
        m = re.search(r"where is\s+([\w\s'-]+)\s+sitting\??", query)
        if m:
            name = m.group(1).strip()
            return AIAssistantService._where_is_sitting(db, name)
            
        # 2. Pattern: "show vacant seats on floor [Number/Name]"
        m = re.search(r"(?:show\s+)?vacant\s+seats\s+on\s+(?:floor\s+)?(\d+|\w+)", query)
        if m:
            floor = m.group(1).strip()
            return AIAssistantService._vacant_seats_on_floor(db, floor)
            
        # 3. Pattern: "allocate a seat to [EMP123 / 123]"
        m = re.search(r"allocate\s+(?:a\s+)?seat\s+to\s+(?:employee\s+)?(emp\d+|\d+)", query)
        if m:
            emp_id_str = m.group(1).strip().upper()
            return AIAssistantService._allocate_seat_to_employee(db, emp_id_str)
            
        # 4. Pattern: "how many seats are available?"
        if "how many seats are available" in query or "available seats" in query or "vacant seats count" in query:
            return AIAssistantService._available_seats_count(db)
            
        # 5. Pattern: "show [Finance/Engineering] employees"
        m = re.search(r"show\s+([\w\s&]+)\s+employees", query)
        if m:
            dept_name = m.group(1).strip()
            return AIAssistantService._employees_in_department(db, dept_name)
            
        # Fallback if no patterns match
        return {
            "success": False,
            "text": "I didn't quite catch that. Try asking questions like:\n- 'Where is John sitting?'\n- 'Show vacant seats on Floor 2.'\n- 'Allocate a seat to EMP1004.'\n- 'How many seats are available?'\n- 'Show Finance employees.'",
            "type": "help",
            "data": None
        }

    @staticmethod
    def _where_is_sitting(db: Session, name: str) -> Dict[str, Any]:
        employees = db.query(Employee).filter(
            Employee.name.ilike(f"%{name}%"),
            Employee.status == "Active"
        ).all()
        
        if not employees:
            return {
                "success": False,
                "text": f"No active employee found matching '{name}'.",
                "type": "error",
                "data": None
            }
            
        if len(employees) > 1:
            emp_list = [{"id": e.id, "employee_id": e.employee_id, "name": e.name, "designation": e.designation} for e in employees]
            return {
                "success": True,
                "text": f"I found multiple employees matching '{name}'. Which one did you mean?",
                "type": "employee_list",
                "data": emp_list
            }
            
        employee = employees[0]
        # Find active seat allocation
        allocation = db.query(SeatAllocation).join(Seat).filter(
            SeatAllocation.employee_id == employee.id,
            SeatAllocation.is_active == True
        ).first()
        
        if not allocation:
            return {
                "success": True,
                "text": f"{employee.name} ({employee.employee_id}) does not currently have an assigned seat.",
                "type": "text",
                "data": {"employee_id": employee.id, "name": employee.name, "seat": None}
            }
            
        seat = allocation.seat
        return {
            "success": True,
            "text": f"{employee.name} ({employee.employee_id}) is sitting at seat {seat.seat_number} in {seat.building}, {seat.floor}, {seat.zone}.",
            "type": "seat_info",
            "data": {
                "employee_id": employee.id,
                "employee_name": employee.name,
                "seat_id": seat.id,
                "seat_number": seat.seat_number,
                "building": seat.building,
                "floor": seat.floor,
                "zone": seat.zone
            }
        }

    @staticmethod
    def _vacant_seats_on_floor(db: Session, floor_val: str) -> Dict[str, Any]:
        # Handle "2" -> "Floor 2"
        floor_search = floor_val
        if floor_val.isdigit():
            floor_search = f"Floor {floor_val}"
            
        seats = db.query(Seat).filter(
            Seat.floor.ilike(f"%{floor_search}%"),
            Seat.status == "Available"
        ).limit(30).all() # limit to avoid overloading
        
        if not seats:
            return {
                "success": True,
                "text": f"There are no vacant seats available on {floor_search}.",
                "type": "text",
                "data": []
            }
            
        seats_list = [{
            "id": s.id,
            "seat_number": s.seat_number,
            "building": s.building,
            "floor": s.floor,
            "zone": s.zone
        } for s in seats]
        
        return {
            "success": True,
            "text": f"Here are some vacant seats on {floor_search} (showing first {len(seats_list)}):",
            "type": "seat_list",
            "data": seats_list
        }

    @staticmethod
    def _allocate_seat_to_employee(db: Session, emp_id_str: str) -> Dict[str, Any]:
        # Normalize: e.g. "1045" -> "EMP1045"
        if emp_id_str.isdigit():
            emp_id_str = f"EMP{emp_id_str}"
            
        employee = db.query(Employee).filter(
            Employee.employee_id == emp_id_str,
            Employee.status == "Active"
        ).first()
        
        if not employee:
            return {
                "success": False,
                "text": f"Active employee with ID '{emp_id_str}' was not found.",
                "type": "error",
                "data": None
            }
            
        # Check active allocation
        existing_alloc = db.query(SeatAllocation).filter(
            SeatAllocation.employee_id == employee.id,
            SeatAllocation.is_active == True
        ).first()
        
        if existing_alloc:
            return {
                "success": False,
                "text": f"Employee {employee.name} ({employee.employee_id}) already occupies seat {existing_alloc.seat.seat_number}.",
                "type": "error",
                "data": {"seat_number": existing_alloc.seat.seat_number}
            }
            
        # Find nearest available seat.
        # Let's write a suggestion logic: try to find a seat in the same building where department employees sit.
        # For simplicity, let's grab the first available seat
        seat = db.query(Seat).filter(Seat.status == "Available").first()
        if not seat:
            return {
                "success": False,
                "text": "No available seats found in any building.",
                "type": "error",
                "data": None
            }
            
        # Allocate seat
        alloc = SeatAllocation(
            employee_id=employee.id,
            seat_id=seat.id,
            is_active=True
        )
        db.add(alloc)
        seat.status = "Occupied"
        db.commit()
        
        return {
            "success": True,
            "text": f"Successfully allocated seat {seat.seat_number} to {employee.name} ({employee.employee_id}).",
            "type": "allocation_success",
            "data": {
                "employee_name": employee.name,
                "employee_code": employee.employee_id,
                "seat_number": seat.seat_number,
                "building": seat.building,
                "floor": seat.floor,
                "zone": seat.zone
            }
        }

    @staticmethod
    def _available_seats_count(db: Session) -> Dict[str, Any]:
        count = db.query(func.count(Seat.id)).filter(Seat.status == "Available").scalar()
        total = db.query(func.count(Seat.id)).scalar()
        
        return {
            "success": True,
            "text": f"There are {count} available seats remaining out of {total} total seats ({round((count/total)*100, 2)}% vacant).",
            "type": "stats",
            "data": {
                "available": count,
                "total": total,
                "utilization": round(((total - count) / total) * 100, 2)
            }
        }

    @staticmethod
    def _employees_in_department(db: Session, dept_name: str) -> Dict[str, Any]:
        department = db.query(Department).filter(Department.name.ilike(f"%{dept_name}%")).first()
        if not department:
            return {
                "success": False,
                "text": f"Department '{dept_name}' not found.",
                "type": "error",
                "data": None
            }
            
        employees = db.query(Employee).filter(
            Employee.department_id == department.id,
            Employee.status == "Active"
        ).limit(50).all()
        
        if not employees:
            return {
                "success": True,
                "text": f"There are no active employees in the {department.name} department.",
                "type": "text",
                "data": []
            }
            
        emp_list = [{
            "id": e.id,
            "employee_id": e.employee_id,
            "name": e.name,
            "designation": e.designation,
            "email": e.email
        } for e in employees]
        
        return {
            "success": True,
            "text": f"Found {len(emp_list)} active employees in {department.name} (showing first 50):",
            "type": "employee_list",
            "data": emp_list
        }
