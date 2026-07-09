from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, AssignEmployeeRequest
from app.repositories.project_repo import ProjectRepository
from app.models.employee import Employee
from app.services.auth_service import get_current_user, RoleChecker

router = APIRouter(prefix="/api/projects", tags=["Project Management"])

@router.get("", response_model=List[ProjectOut])
def get_projects(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ProjectRepository.get_all(db, search, status)

@router.get("/{id}", response_model=ProjectOut)
def get_project(
    id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = ProjectRepository.get_by_id(db, id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    schema: ProjectCreate,
    current_user: Employee = Depends(RoleChecker(["Admin", "Project Manager"])),
    db: Session = Depends(get_db)
):
    # Ensure unique name and code
    existing = db.query(Employee).filter(Employee.name == schema.name).first() # wait, query Project instead!
    # Let's write the query correctly
    from app.models.project import Project
    if db.query(Project).filter(Project.name == schema.name).first():
        raise HTTPException(status_code=400, detail="Project with this name already exists")
    if db.query(Project).filter(Project.code == schema.code).first():
        raise HTTPException(status_code=400, detail="Project with this code already exists")
        
    project = ProjectRepository.create(db, schema)
    # Re-fetch with occupant counts
    return ProjectRepository.get_by_id(db, project.id)

@router.put("/{id}", response_model=ProjectOut)
def update_project(
    id: int,
    schema: ProjectUpdate,
    current_user: Employee = Depends(RoleChecker(["Admin", "Project Manager"])),
    db: Session = Depends(get_db)
):
    from app.models.project import Project
    project_db = db.query(Project).filter(Project.id == id).first()
    if not project_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if schema.name:
        existing = db.query(Project).filter(Project.name == schema.name).first()
        if existing and existing.id != id:
            raise HTTPException(status_code=400, detail="Project name is already in use")

    if schema.code:
        existing = db.query(Project).filter(Project.code == schema.code).first()
        if existing and existing.id != id:
            raise HTTPException(status_code=400, detail="Project code is already in use")

    ProjectRepository.update(db, id, schema)
    return ProjectRepository.get_by_id(db, id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    id: int,
    current_user: Employee = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    success = ProjectRepository.delete(db, id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return

@router.post("/{id}/assign", response_model=ProjectOut)
def assign_employee(
    id: int,
    schema: AssignEmployeeRequest,
    current_user: Employee = Depends(RoleChecker(["Admin", "Project Manager", "HR"])),
    db: Session = Depends(get_db)
):
    ProjectRepository.assign_employee(db, id, schema.employee_id)
    return ProjectRepository.get_by_id(db, id)

@router.post("/{id}/remove/{employee_id}", response_model=ProjectOut)
def remove_employee(
    id: int,
    employee_id: int,
    current_user: Employee = Depends(RoleChecker(["Admin", "Project Manager", "HR"])),
    db: Session = Depends(get_db)
):
    success = ProjectRepository.remove_employee(db, id, employee_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee is not actively assigned to this project"
        )
    return ProjectRepository.get_by_id(db, id)
