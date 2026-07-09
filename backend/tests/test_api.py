import os
import sys
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.database import Base, get_db
from app.models.employee import Employee
from app.models.department import Department
from app.models.seat import Seat
from app.services.auth_service import hash_password, create_access_token
from app.services.ai_assistant import AIAssistantService

# Use an in-memory SQLite database for fast unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the dependency database session
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Add dummy department
    dept = Department(id=1, name="Test Department", code="TD")
    db.add(dept)
    
    # Add dummy admin
    admin = Employee(
        id=1,
        employee_id="EMP9999",
        name="Test Admin",
        email="testadmin@ethara.com",
        phone="+971000",
        password_hash=hash_password("adminpassword"),
        department_id=1,
        designation="Tester",
        joining_date=date(2026, 1, 1),
        role="Admin",
        status="Active"
    )
    db.add(admin)
    
    # Add dummy seat
    seat = Seat(id=1, building="HQ", floor="Floor 1", zone="Zone A", seat_number="H-1-A-01", status="Available")
    db.add(seat)
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)
    db.close()

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_success():
    response = client.post("/api/auth/login", json={
        "email": "testadmin@ethara.com",
        "password": "adminpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "Admin"

def test_login_failure():
    response = client.post("/api/auth/login", json={
        "email": "testadmin@ethara.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_ai_assistant_rules():
    db = TestingSessionLocal()
    
    # Test seat vacant count query
    res = AIAssistantService.process_query(db, "how many seats are available?")
    assert res["success"] is True
    assert res["type"] == "stats"
    assert res["data"]["available"] == 1
    
    # Test employee department lookup
    res_dept = AIAssistantService.process_query(db, "show Test Department employees")
    assert res_dept["success"] is True
    assert res_dept["type"] == "employee_list"
    assert len(res_dept["data"]) == 1
    
    # Test unhandled questions
    res_help = AIAssistantService.process_query(db, "Who is the CEO?")
    assert res_help["success"] is False
    assert res_help["type"] == "help"

    db.close()
