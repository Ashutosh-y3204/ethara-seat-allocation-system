import os
import sys
import random
from datetime import datetime, timedelta
from faker import Faker
from passlib.context import CryptContext
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import engine, Base, SessionLocal
from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.seat import Seat
from app.models.seat_allocation import SeatAllocation
from app.models.project_membership import ProjectMembership

fake = Faker()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_db():
    db = SessionLocal()
    try:
        print("Creating tables if they don't exist...")
        Base.metadata.create_all(bind=engine)

        print("Cleaning existing database records...")
        if str(engine.url).startswith("sqlite"):
            for table in ["project_memberships", "seat_allocations", "employees", "projects", "seats", "departments"]:
                db.execute(text(f"DELETE FROM {table};"))
        else:
            db.execute(text("TRUNCATE TABLE project_memberships, seat_allocations, employees, projects, seats, departments RESTART IDENTITY CASCADE;"))
        db.commit()

        # 1. Generate Departments (40)
        print("Generating 40 departments...")
        dept_names = [
            "Engineering", "Frontend Development", "Backend Development", "Mobile Engineering",
            "QA & Automation", "DevOps & Infrastructure", "Security & Compliance", "Data Science",
            "Machine Learning", "Product Management", "UI/UX Design", "Business Analytics",
            "Project Management Office", "Finance", "Accounting", "Legal", "Human Resources",
            "Talent Acquisition", "Employee Experience", "Marketing", "Growth Marketing",
            "Brand & Creative", "Public Relations", "Sales - Enterprise", "Sales - MidMarket",
            "Sales Operations", "Customer Support", "Customer Success", "Technical Support",
            "Solutions Architecture", "Professional Services", "R&D Labs", "Facilities & Ops",
            "Corporate Strategy", "Internal IT Support", "Data Platform", "Cloud Platform",
            "Content Strategy", "Social Media", "Localization"
        ]
        
        departments = []
        used_codes = set()
        for name in dept_names:
            code = "".join([w[0].upper() for w in name.split() if w.isalpha()])
            if len(code) < 3:
                while True:
                    candidate = f"{code}{random.randint(1, 99)}"
                    if candidate not in used_codes:
                        code = candidate
                        break
            else:
                code = code[:5]
                if code in used_codes:
                    i = 1
                    while f"{code[:3]}{i}" in used_codes:
                        i += 1
                    code = f"{code[:3]}{i}"
            used_codes.add(code)
            departments.append(Department(name=name, code=code))
        
        db.add_all(departments)
        db.commit()
        
        # Fetch department IDs
        db_departments = db.query(Department).all()
        dept_ids = [d.id for d in db_departments]
        print(f"Created {len(dept_ids)} departments.")

        # 2. Generate Projects (350)
        print("Generating 350 projects...")
        projects = []
        project_statuses = ["Active", "Completed", "Proposed"]
        project_weights = [0.8, 0.15, 0.05]
        
        for i in range(1, 351):
            name = f"Project {fake.catch_phrase()}"
            # Ensure unique name
            if any(p.name == name for p in projects):
                name = f"{name} {i}"
            code = f"PRJ-{i:03d}"
            capacity = random.randint(10, 80)
            start_date = fake.date_between(start_date="-2y", end_date="-1m")
            status = random.choices(project_statuses, weights=project_weights)[0]
            
            end_date = None
            if status == "Completed":
                end_date = start_date + timedelta(days=random.randint(90, 360))
            
            projects.append(Project(
                name=name,
                code=code,
                description=fake.paragraph(nb_sentences=2),
                capacity=capacity,
                start_date=start_date,
                end_date=end_date,
                status=status
            ))
        
        db.bulk_save_objects(projects)
        db.commit()
        db_projects = db.query(Project).all()
        project_ids = [p.id for p in db_projects]
        print(f"Created {len(project_ids)} projects.")

        # 3. Generate Seats (5,500)
        print("Generating 5,500 seats...")
        buildings = ["HQ Tower", "Innovation Lab", "Nexus Centre", "Apex Plaza"]
        floors = ["Floor 1", "Floor 2", "Floor 3", "Floor 4", "Floor 5"]
        zones = ["Zone A", "Zone B", "Zone C", "Zone D"]
        
        seats = []
        seat_count = 0
        total_needed = 5500
        
        # 4 buildings * 5 floors * 4 zones = 80 locations.
        # To get 5,500 seats, we need up to 70 seats per zone (80 * 70 = 5,600).
        for b in buildings:
            for f in floors:
                for z in zones:
                    for sn in range(1, 71):
                        if seat_count >= total_needed:
                            break
                        
                        building_code = b.split()[0][0]
                        floor_num = f.split()[1]
                        zone_letter = z.split()[1]
                        seat_number = f"{building_code}-{floor_num}-{zone_letter}-{sn:02d}"
                        
                        seats.append(Seat(
                            building=b,
                            floor=f,
                            zone=z,
                            seat_number=seat_number,
                            status="Available"
                        ))
                        seat_count += 1
        
        db.bulk_save_objects(seats)
        db.commit()
        db_seats = db.query(Seat).all()
        seat_ids = [s.id for s in db_seats]
        print(f"Created {len(seat_ids)} seats.")

        # 4. Generate Employees (5,000)
        print("Generating 5,000 employees...")
        # Pre-hash password for performance
        hashed_password = pwd_context.hash("password123")
        
        employees = []
        
        # Test Accounts
        # 1. Admin
        employees.append(Employee(
            employee_id="EMP1001",
            name="Admin User",
            email="admin@ethara.com",
            phone="+971501234567",
            password_hash=hashed_password,
            department_id=dept_ids[0],
            designation="System Administrator",
            joining_date=datetime.now().date() - timedelta(days=365),
            role="Admin",
            status="Active"
        ))
        
        # 2. HR
        employees.append(Employee(
            employee_id="EMP1002",
            name="HR Executive",
            email="hr@ethara.com",
            phone="+971507654321",
            password_hash=hashed_password,
            department_id=dept_ids[1],
            designation="HR Director",
            joining_date=datetime.now().date() - timedelta(days=200),
            role="HR",
            status="Active"
        ))

        # 3. Project Manager
        employees.append(Employee(
            employee_id="EMP1003",
            name="Project Manager User",
            email="pm@ethara.com",
            phone="+971501112223",
            password_hash=hashed_password,
            department_id=dept_ids[2],
            designation="Senior Program Manager",
            joining_date=datetime.now().date() - timedelta(days=150),
            role="Project Manager",
            status="Active"
        ))

        # 4. Standard Employee
        employees.append(Employee(
            employee_id="EMP1004",
            name="Regular Employee",
            email="employee@ethara.com",
            phone="+971503334445",
            password_hash=hashed_password,
            department_id=dept_ids[3],
            designation="Software Engineer",
            joining_date=datetime.now().date() - timedelta(days=50),
            role="Employee",
            status="Active"
        ))

        # Save test accounts to database first to ensure they exist
        db.add_all(employees)
        db.commit()

        # Seed the remaining 4,996 employees
        roles = ["Employee", "Project Manager", "HR"]
        role_weights = [0.92, 0.06, 0.02]
        
        designations = [
            "Software Engineer", "Senior Software Engineer", "Tech Lead", "Engineering Manager",
            "Frontend Engineer", "Backend Developer", "DevOps Engineer", "QA Specialist",
            "UI/UX Designer", "Product Manager", "Data Analyst", "Data Scientist",
            "HR Associate", "Talent Acquisition Specialist", "Finance Analyst"
        ]

        employee_batch = []
        for i in range(1005, 6001):
            name = fake.name()
            email = fake.unique.email()
            phone = fake.phone_number()
            dept_id = random.choice(dept_ids)
            designation = random.choice(designations)
            joining_date = fake.date_between(start_date="-3y", end_date="today")
            role = random.choices(roles, weights=role_weights)[0]
            status = random.choices(["Active", "Inactive"], weights=[0.97, 0.03])[0]

            employee_batch.append({
                "employee_id": f"EMP{i}",
                "name": name,
                "email": email,
                "phone": phone,
                "password_hash": hashed_password,
                "department_id": dept_id,
                "designation": designation,
                "joining_date": joining_date,
                "role": role,
                "status": status
            })
            
            if len(employee_batch) >= 1000:
                db.execute(
                    text("""
                        INSERT INTO employees (employee_id, name, email, phone, password_hash, department_id, designation, joining_date, role, status)
                        VALUES (:employee_id, :name, :email, :phone, :password_hash, :department_id, :designation, :joining_date, :role, :status)
                    """),
                    employee_batch
                )
                employee_batch = []
                print(f"Inserted {i - 1004} employees...")

        if employee_batch:
            db.execute(
                text("""
                    INSERT INTO employees (employee_id, name, email, phone, password_hash, department_id, designation, joining_date, role, status)
                    VALUES (:employee_id, :name, :email, :phone, :password_hash, :department_id, :designation, :joining_date, :role, :status)
                """),
                employee_batch
            )
        
        db.commit()
        db_employees = db.query(Employee).all()
        employee_ids = [emp.id for emp in db_employees if emp.status == "Active"]
        print(f"Created {len(db_employees)} total employees ({len(employee_ids)} active).")

        # 5. Allocate Seats to Employees (~90% occupancy)
        # 90% of 5,500 seats is 4,950.
        # We will allocate seats to 4,950 active employees.
        print("Allocating seats to achieve ~90% utilization...")
        utilization_count = 4950
        allocated_employees = random.sample(employee_ids, min(utilization_count, len(employee_ids)))
        allocated_seats = seat_ids[:len(allocated_employees)]
        
        allocations = []
        now = datetime.now()
        
        for emp_id, seat_id in zip(allocated_employees, allocated_seats):
            allocations.append(SeatAllocation(
                employee_id=emp_id,
                seat_id=seat_id,
                allocated_at=now - timedelta(days=random.randint(10, 100)),
                is_active=True
            ))
            
        db.bulk_save_objects(allocations)
        
        # Bulk update seat status to occupied
        for seat in db_seats[:len(allocated_employees)]:
            seat.status = "Occupied"
            
        # Distribute remaining 550 seats into Available, Reserved, and Maintenance
        remaining_seats = db_seats[len(allocated_employees):]
        for idx, seat in enumerate(remaining_seats):
            if idx < 100:
                seat.status = "Reserved"
            elif idx < 150:
                seat.status = "Maintenance"
            else:
                seat.status = "Available"
                
        db.commit()
        print("Seat allocations created successfully.")

        # Create some seat allocation history logs (released allocations)
        print("Generating historical seat allocation logs...")
        history_allocations = []
        historical_employees = random.sample(employee_ids, 200)
        historical_seats = random.sample(seat_ids, 200)
        
        for i in range(200):
            alloc_time = now - timedelta(days=random.randint(120, 200))
            release_time = alloc_time + timedelta(days=random.randint(30, 90))
            history_allocations.append(SeatAllocation(
                employee_id=historical_employees[i],
                seat_id=historical_seats[i],
                allocated_at=alloc_time,
                released_at=release_time,
                is_active=False
            ))
            
        db.bulk_save_objects(history_allocations)
        db.commit()
        print("Historical allocations created.")

        # 6. Map Employees to Projects (Project Memberships)
        print("Mapping employees to projects...")
        project_memberships = []
        
        # Retrieve active projects
        active_project_ids = [p.id for p in db_projects if p.status == "Active"]
        
        # Map active employees to random projects without exceeding capacity
        project_caps = {p.id: p.capacity for p in db_projects}
        project_occupancy = {p.id: 0 for p in db_projects}
        
        for emp_id in employee_ids:
            # ~85% of active employees are on a project
            if random.random() < 0.85:
                # Find projects that have capacity remaining
                available_projects = [pid for pid in active_project_ids if project_occupancy[pid] < project_caps[pid]]
                if not available_projects:
                    break
                
                proj_id = random.choice(available_projects)
                project_memberships.append(ProjectMembership(
                    employee_id=emp_id,
                    project_id=proj_id,
                    assigned_at=now - timedelta(days=random.randint(10, 90)),
                    is_active=True
                ))
                project_occupancy[proj_id] += 1
                
        db.bulk_save_objects(project_memberships)
        db.commit()
        print("Project memberships successfully mapped.")
        print("Database Seeding Completed Successfully!")

    except Exception as e:
        print(f"Error during database seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
