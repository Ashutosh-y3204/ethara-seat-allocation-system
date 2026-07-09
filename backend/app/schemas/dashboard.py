from pydantic import BaseModel
from typing import List, Dict, Any
from app.schemas.employee import EmployeeOut

class KPIStats(BaseModel):
    total_employees: int
    total_projects: int
    total_seats: int
    occupied_seats: int
    available_seats: int
    reserved_seats: int
    maintenance_seats: int
    seat_utilization_rate: float
    new_joiners_count: int

class DepartmentDistribution(BaseModel):
    department: str
    count: int

class ProjectDistribution(BaseModel):
    project: str
    count: int

class BuildingOccupancy(BaseModel):
    building: str
    total: int
    occupied: int
    available: int
    utilization: float

class MonthlyAllocationTrend(BaseModel):
    month: str
    allocations: int

class DashboardAnalytics(BaseModel):
    kpis: KPIStats
    department_distribution: List[DepartmentDistribution]
    project_distribution: List[ProjectDistribution]
    building_occupancy: List[BuildingOccupancy]
    monthly_trend: List[MonthlyAllocationTrend]
    new_joiners: List[EmployeeOut]
