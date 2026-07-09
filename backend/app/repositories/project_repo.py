from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime

from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.employee import Employee
from app.schemas.project import ProjectCreate, ProjectUpdate
from fastapi import HTTPException, status

class ProjectRepository:
    @staticmethod
    def get_by_id(db: Session, project_id: int) -> Optional[Dict[str, Any]]:
        # Fetch project with active memberships
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None

        # Fetch active members
        members_query = db.query(
            Employee.id.label("employee_id"),
            Employee.employee_id.label("emp_code"),
            Employee.name,
            Employee.email,
            Employee.designation,
            ProjectMembership.assigned_at
        ).join(
            ProjectMembership, ProjectMembership.employee_id == Employee.id
        ).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.is_active == True
        ).all()

        members = [
            {
                "employee_id": m.employee_id,
                "emp_code": m.emp_code,
                "name": m.name,
                "email": m.email,
                "designation": m.designation,
                "assigned_at": m.assigned_at.date() if m.assigned_at else None
            }
            for m in members_query
        ]

        return {
            "id": project.id,
            "name": project.name,
            "code": project.code,
            "description": project.description,
            "capacity": project.capacity,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "status": project.status,
            "current_occupancy": len(members),
            "members": members
        }

    @staticmethod
    def get_all(
        db: Session,
        search: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        # Fetch active project memberships count grouped by project
        occupancy_counts = db.query(
            ProjectMembership.project_id,
            func.count(ProjectMembership.id).label("count")
        ).filter(
            ProjectMembership.is_active == True
        ).group_by(
            ProjectMembership.project_id
        ).all()
        
        occ_map = {item.project_id: item.count for item in occupancy_counts}

        # Build projects query
        query = db.query(Project)
        
        if status_filter:
            query = query.filter(Project.status == status_filter)
            
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Project.name.ilike(search_filter),
                    Project.code.ilike(search_filter),
                    Project.description.ilike(search_filter)
                )
            )
            
        projects = query.order_by(Project.code.asc()).all()
        
        results = []
        for p in projects:
            results.append({
                "id": p.id,
                "name": p.name,
                "code": p.code,
                "description": p.description,
                "capacity": p.capacity,
                "start_date": p.start_date,
                "end_date": p.end_date,
                "status": p.status,
                "current_occupancy": occ_map.get(p.id, 0),
                "members": [] # members are loaded lazily on request by ID
            })
            
        return results

    @staticmethod
    def create(db: Session, schema: ProjectCreate) -> Project:
        db_project = Project(
            name=schema.name,
            code=schema.code,
            description=schema.description,
            capacity=schema.capacity,
            start_date=schema.start_date,
            end_date=schema.end_date,
            status=schema.status
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def update(db: Session, project_id: int, schema: ProjectUpdate) -> Optional[Project]:
        db_project = db.query(Project).filter(Project.id == project_id).first()
        if not db_project:
            return None
            
        update_data = schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_project, key, value)
            
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def delete(db: Session, project_id: int) -> bool:
        db_project = db.query(Project).filter(Project.id == project_id).first()
        if not db_project:
            return False
            
        # Release all memberships
        active_memberships = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.is_active == True
        ).all()
        for mem in active_memberships:
            mem.is_active = False
            mem.released_at = datetime.utcnow()
            
        db.delete(db_project)
        db.commit()
        return True

    @staticmethod
    def assign_employee(db: Session, project_id: int, employee_id: int) -> ProjectMembership:
        # Check project capacity
        project_details = ProjectRepository.get_by_id(db, project_id)
        if not project_details:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
            
        if project_details["current_occupancy"] >= project_details["capacity"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Project is already at maximum capacity"
            )
            
        # Verify employee is active
        employee = db.query(Employee).filter(Employee.id == employee_id, Employee.status == "Active").first()
        if not employee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active employee not found")

        # Check if already assigned actively to this project
        existing = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.employee_id == employee_id,
            ProjectMembership.is_active == True
        ).first()
        
        if existing:
            return existing

        # Assign
        membership = ProjectMembership(
            project_id=project_id,
            employee_id=employee_id,
            is_active=True,
            assigned_at=datetime.utcnow()
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
        return membership

    @staticmethod
    def remove_employee(db: Session, project_id: int, employee_id: int) -> bool:
        membership = db.query(ProjectMembership).filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.employee_id == employee_id,
            ProjectMembership.is_active == True
        ).first()
        
        if not membership:
            return False
            
        membership.is_active = False
        membership.released_at = datetime.utcnow()
        db.commit()
        return True
