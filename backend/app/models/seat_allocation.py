from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class SeatAllocation(Base):
    __tablename__ = "seat_allocations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    seat_id = Column(Integer, ForeignKey("seats.id"), nullable=False)
    allocated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    released_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, index=True, nullable=False)

    employee = relationship("Employee", back_populates="seat_allocations")
    seat = relationship("Seat", back_populates="seat_allocations")
