from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ProjectMembership(Base):
    __tablename__ = "project_memberships"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    released_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, index=True, nullable=False)

    employee = relationship("Employee", back_populates="project_memberships")
    project = relationship("Project", back_populates="project_memberships")
