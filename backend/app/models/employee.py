from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    designation = Column(String, nullable=False)
    joining_date = Column(Date, nullable=False)
    role = Column(String, default="Employee", nullable=False) # Admin, HR, Employee, Project Manager
    status = Column(String, default="Active", nullable=False) # Active, Inactive

    department = relationship("Department", back_populates="employees")
    seat_allocations = relationship("SeatAllocation", back_populates="employee", cascade="all, delete-orphan")
    project_memberships = relationship("ProjectMembership", back_populates="employee", cascade="all, delete-orphan")
