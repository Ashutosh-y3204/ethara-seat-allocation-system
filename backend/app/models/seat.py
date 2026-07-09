from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Seat(Base):
    __tablename__ = "seats"

    id = Column(Integer, primary_key=True, index=True)
    building = Column(String, index=True, nullable=False)
    floor = Column(String, index=True, nullable=False)
    zone = Column(String, index=True, nullable=False)
    seat_number = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="Available", nullable=False) # Available, Occupied, Reserved, Maintenance

    seat_allocations = relationship("SeatAllocation", back_populates="seat", cascade="all, delete-orphan")
