from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.schemas.dashboard import DashboardAnalytics, KPIStats
from app.models.employee import Employee
from app.models.department import Department
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.seat import Seat
from app.models.seat_allocation import SeatAllocation
from app.services.auth_service import get_current_user
from app.repositories.employee_repo import EmployeeRepository

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])

@router.get("", response_model=DashboardAnalytics)
def get_dashboard_analytics(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now()
    today = now.date()
    thirty_days_ago = today - timedelta(days=30)
    six_months_ago = today - timedelta(days=180)

    # 1. Consolidated Seat KPIs in 1 fast query
    seat_stats = db.query(
        func.count(Seat.id).label("total"),
        func.sum(case((Seat.status == "Occupied", 1), else_=0)).label("occupied"),
        func.sum(case((Seat.status == "Available", 1), else_=0)).label("available"),
        func.sum(case((Seat.status == "Reserved", 1), else_=0)).label("reserved"),
        func.sum(case((Seat.status == "Maintenance", 1), else_=0)).label("maintenance"),
    ).first()

    total_seats = (seat_stats.total if seat_stats else 0) or 0
    occupied_seats = (seat_stats.occupied if seat_stats else 0) or 0
    available_seats = (seat_stats.available if seat_stats else 0) or 0
    reserved_seats = (seat_stats.reserved if seat_stats else 0) or 0
    maintenance_seats = (seat_stats.maintenance if seat_stats else 0) or 0

    # 2. Employee & Project counts
    total_employees = db.query(func.count(Employee.id)).filter(Employee.status == "Active").scalar() or 0
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    
    new_joiners_count = db.query(func.count(Employee.id)).filter(
        Employee.joining_date >= thirty_days_ago,
        Employee.status == "Active"
    ).scalar() or 0

    seat_utilization_rate = round((occupied_seats / total_seats) * 100, 2) if total_seats > 0 else 0.0

    kpis = KPIStats(
        total_employees=total_employees,
        total_projects=total_projects,
        total_seats=total_seats,
        occupied_seats=occupied_seats,
        available_seats=available_seats,
        reserved_seats=reserved_seats,
        maintenance_seats=maintenance_seats,
        seat_utilization_rate=seat_utilization_rate,
        new_joiners_count=new_joiners_count
    )

    # 2. Department Distribution (Top 10 departments by employee count)
    dept_dist_query = db.query(
        Department.name,
        func.count(Employee.id).label("emp_count")
    ).join(
        Employee, Employee.department_id == Department.id
    ).filter(
        Employee.status == "Active"
    ).group_by(
        Department.id
    ).order_by(
        func.count(Employee.id).desc()
    ).limit(10).all()

    department_distribution = [
        {"department": d[0], "count": d[1]} for d in dept_dist_query
    ]

    # 3. Project Distribution (Top 10 projects by employee occupancy)
    proj_dist_query = db.query(
        Project.name,
        func.count(ProjectMembership.id).label("emp_count")
    ).join(
        ProjectMembership, ProjectMembership.project_id == Project.id
    ).filter(
        ProjectMembership.is_active == True
    ).group_by(
        Project.id
    ).order_by(
        func.count(ProjectMembership.id).desc()
    ).limit(10).all()

    project_distribution = [
        {"project": p[0], "count": p[1]} for p in proj_dist_query
    ]

    # 4. Building Occupancy
    building_query = db.query(
        Seat.building,
        func.count(Seat.id).label("total"),
        func.sum(case((Seat.status == "Occupied", 1), else_=0)).label("occupied"),
        func.sum(case((Seat.status == "Available", 1), else_=0)).label("available")
    ).group_by(
        Seat.building
    ).all()

    building_occupancy = []
    for b in building_query:
        b_total = b.total or 0
        b_occupied = b.occupied or 0
        b_available = b.available or 0
        b_util = round((b_occupied / b_total) * 100, 2) if b_total > 0 else 0.0
        building_occupancy.append({
            "building": b.building,
            "total": b_total,
            "occupied": b_occupied,
            "available": b_available,
            "utilization": b_util
        })

    # 5. Monthly Allocation Trend (Last 6 Months)
    # We query allocations active or completed in the last 6 months
    allocations_in_6m = db.query(SeatAllocation.allocated_at).filter(
        SeatAllocation.allocated_at >= datetime.combine(six_months_ago, datetime.min.time())
    ).all()

    # Bucketing by month
    months_list = []
    for i in range(5, -1, -1):
        m_date = now - timedelta(days=i*30)
        months_list.append(m_date.strftime("%b"))

    month_counts = {m: 0 for m in months_list}
    for alloc in allocations_in_6m:
        m_str = alloc.allocated_at.strftime("%b")
        if m_str in month_counts:
            month_counts[m_str] += 1

    monthly_trend = [
        {"month": m, "allocations": month_counts[m]} for m in months_list
    ]

    # 6. New Joiners (Last 10 employees by joining date)
    joiners_query = db.query(
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
    ).filter(
        Employee.status == "Active"
    ).order_by(
        Employee.joining_date.desc(),
        Employee.id.desc()
    ).limit(10).all()

    new_joiners = []
    for emp, seat, proj in joiners_query:
        new_joiners.append({
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
        })

    return {
        "kpis": kpis,
        "department_distribution": department_distribution,
        "project_distribution": project_distribution,
        "building_occupancy": building_occupancy,
        "monthly_trend": monthly_trend,
        "new_joiners": new_joiners
    }
