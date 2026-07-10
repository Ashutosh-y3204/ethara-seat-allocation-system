"""
Optimized database seeding script.

Performance strategy (targets: remote PostgreSQL, e.g. Render):
  - Zero ORM object instantiation for bulk data (no Department(), Employee(), etc.
    piling up in the Session's identity map) -- we build plain dicts and insert
    them with SQLAlchemy Core `insert()`, which lets SQLAlchemy 2.x use its
    "insertmanyvalues" batching feature (multiple rows per round trip) on
    PostgreSQL instead of one INSERT per row.
  - Autoflush disabled on the session -- nothing implicitly flushes/round-trips
    while we build large batches in Python.
  - Status changes on seats are done with 4 set-based UPDATE ... WHERE
    statements instead of touching 5,500 ORM objects individually.
  - IDs needed for foreign keys are fetched with narrow, single-column
    SELECTs (Department.id, Project.id, ...) instead of `.all()` on full
    ORM objects.
  - Only a handful of `commit()` calls total (one per logical stage), instead
    of one per 1,000-row chunk -- each commit is a network round trip to a
    remote DB, so this alone removes ~10+ round trips.
  - Project-membership assignment is O(n) instead of O(employees * projects):
    we build a single pre-shuffled "slot pool" (each active project's id
    repeated `capacity` times), then just pop off it employee-by-employee.
    This guarantees capacity is respected without ever re-scanning or
    re-filtering a list of "available projects" inside the employee loop.
"""

import os
import sys
import random
from datetime import datetime, timedelta

from faker import Faker
from passlib.context import CryptContext
from sqlalchemy import text, insert, select

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

# Chunk size for multi-row INSERTs. Large enough to minimize round trips,
# small enough to keep a single statement's parameter count sane.
INSERT_CHUNK = 1000


def chunked(iterable, size):
    """Yield successive `size`-sized chunks from a list."""
    for i in range(0, len(iterable), size):
        yield iterable[i:i + size]


def bulk_insert(db, model, rows):
    """
    Insert `rows` (list[dict]) into `model`'s table using SQLAlchemy Core
    insert(), in INSERT_CHUNK-sized batches. On PostgreSQL, SQLAlchemy 2.x
    automatically rewrites each batch into a small number of multi-row
    INSERT ... VALUES (...), (...), ... statements (insertmanyvalues), which
    is dramatically faster over a network connection than one INSERT per row.
    """
    if not rows:
        return
    stmt = insert(model)
    for chunk in chunked(rows, INSERT_CHUNK):
        db.execute(stmt, chunk)


def seed_db():
    db = SessionLocal()
    # Nothing here relies on autoflush-triggered visibility mid-transaction;
    # disabling it avoids surprise flush round trips while batches are built.
    db.autoflush = False

    try:
        print("Creating tables if they don't exist...")
        Base.metadata.create_all(bind=engine)

        print("Cleaning existing database records...")
        if str(engine.url).startswith("sqlite"):
            for table in ["project_memberships", "seat_allocations", "employees", "projects", "seats", "departments"]:
                db.execute(text(f"DELETE FROM {table};"))
        else:
            db.execute(text(
                "TRUNCATE TABLE project_memberships, seat_allocations, employees, "
                "projects, seats, departments RESTART IDENTITY CASCADE;"
            ))
        db.commit()

        # ------------------------------------------------------------------
        # 1. Departments (40)
        # ------------------------------------------------------------------
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

        department_rows = []
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
            department_rows.append({"name": name, "code": code})

        bulk_insert(db, Department, department_rows)
        db.commit()

        # Narrow SELECT -- only the column we actually need.
        dept_ids = db.execute(select(Department.id)).scalars().all()
        print(f"Created {len(dept_ids)} departments.")

        # ------------------------------------------------------------------
        # 2. Projects (350)
        # ------------------------------------------------------------------
        print("Generating 350 projects...")
        project_rows = []
        project_statuses = ["Active", "Completed", "Proposed"]
        project_weights = [0.8, 0.15, 0.05]
        seen_names = set()

        for i in range(1, 351):
            name = f"Project {fake.catch_phrase()}"
            if name in seen_names:
                name = f"{name} {i}"
            seen_names.add(name)

            code = f"PRJ-{i:03d}"
            capacity = random.randint(10, 80)
            start_date = fake.date_between(start_date="-2y", end_date="-1m")
            status = random.choices(project_statuses, weights=project_weights)[0]

            end_date = None
            if status == "Completed":
                end_date = start_date + timedelta(days=random.randint(90, 360))

            project_rows.append({
                "name": name,
                "code": code,
                "description": fake.paragraph(nb_sentences=2),
                "capacity": capacity,
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
            })

        bulk_insert(db, Project, project_rows)
        db.commit()

        # Only pull the columns needed downstream (id, capacity, status).
        db_projects = db.execute(
            select(Project.id, Project.capacity, Project.status)
        ).all()
        project_ids = [p.id for p in db_projects]
        print(f"Created {len(project_ids)} projects.")

        # ------------------------------------------------------------------
        # 3. Seats (5,000)
        # ------------------------------------------------------------------
        print("Generating 5,000 seats...")
        buildings = ["HQ Tower", "Innovation Lab", "Nexus Centre", "Apex Plaza"]
        floors = ["Floor 1", "Floor 2", "Floor 3", "Floor 4", "Floor 5"]
        zones = ["Zone A", "Zone B", "Zone C", "Zone D"]

        seat_rows = []
        seat_count = 0
        total_needed = 5000

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

                        seat_rows.append({
                            "building": b,
                            "floor": f,
                            "zone": z,
                            "seat_number": seat_number,
                            "status": "Available",
                        })
                        seat_count += 1

        bulk_insert(db, Seat, seat_rows)
        db.commit()

        seat_ids = db.execute(select(Seat.id).order_by(Seat.id)).scalars().all()
        print(f"Created {len(seat_ids)} seats.")

        # ------------------------------------------------------------------
        # 4. Employees (5,000 total, including 4 fixed test accounts)
        # ------------------------------------------------------------------
        print("Generating 5,000 employees...")
        hashed_password = pwd_context.hash("password123")

        employee_rows = [
            {
                "employee_id": "EMP1001",
                "name": "Admin User",
                "email": "admin@ethara.com",
                "phone": "+971501234567",
                "password_hash": hashed_password,
                "department_id": dept_ids[0],
                "designation": "System Administrator",
                "joining_date": datetime.now().date() - timedelta(days=365),
                "role": "Admin",
                "status": "Active",
            },
            {
                "employee_id": "EMP1002",
                "name": "HR Executive",
                "email": "hr@ethara.com",
                "phone": "+971507654321",
                "password_hash": hashed_password,
                "department_id": dept_ids[1],
                "designation": "HR Director",
                "joining_date": datetime.now().date() - timedelta(days=200),
                "role": "HR",
                "status": "Active",
            },
            {
                "employee_id": "EMP1003",
                "name": "Project Manager User",
                "email": "pm@ethara.com",
                "phone": "+971501112223",
                "password_hash": hashed_password,
                "department_id": dept_ids[2],
                "designation": "Senior Program Manager",
                "joining_date": datetime.now().date() - timedelta(days=150),
                "role": "Project Manager",
                "status": "Active",
            },
            {
                "employee_id": "EMP1004",
                "name": "Regular Employee",
                "email": "employee@ethara.com",
                "phone": "+971503334445",
                "password_hash": hashed_password,
                "department_id": dept_ids[3],
                "designation": "Software Engineer",
                "joining_date": datetime.now().date() - timedelta(days=50),
                "role": "Employee",
                "status": "Active",
            },
        ]

        roles = ["Employee", "Project Manager", "HR"]
        role_weights = [0.92, 0.06, 0.02]

        designations = [
            "Software Engineer", "Senior Software Engineer", "Tech Lead", "Engineering Manager",
            "Frontend Engineer", "Backend Developer", "DevOps Engineer", "QA Specialist",
            "UI/UX Designer", "Product Manager", "Data Analyst", "Data Scientist",
            "HR Associate", "Talent Acquisition Specialist", "Finance Analyst"
        ]

        for i in range(1005, 6001):
            employee_rows.append({
                "employee_id": f"EMP{i}",
                "name": fake.name(),
                "email": fake.unique.email(),
                "phone": fake.phone_number(),
                "password_hash": hashed_password,
                "department_id": random.choice(dept_ids),
                "designation": random.choice(designations),
                "joining_date": fake.date_between(start_date="-3y", end_date="today"),
                "role": random.choices(roles, weights=role_weights)[0],
                "status": random.choices(["Active", "Inactive"], weights=[0.97, 0.03])[0],
            })

        bulk_insert(db, Employee, employee_rows)
        db.commit()

        db_employees = db.execute(select(Employee.id, Employee.status)).all()
        employee_ids = [e.id for e in db_employees if e.status == "Active"]
        print(f"Created {len(db_employees)} total employees ({len(employee_ids)} active).")

        # ------------------------------------------------------------------
        # 5. Seat Allocations (~90% utilization -> 4,500 active allocations)
        # ------------------------------------------------------------------
        print("Allocating seats to achieve ~90% utilization...")
        utilization_count = 4500
        allocated_employees = random.sample(
            employee_ids, min(utilization_count, len(employee_ids))
        )
        allocated_seats = seat_ids[:len(allocated_employees)]

        now = datetime.now()

        allocation_rows = [
            {
                "employee_id": emp_id,
                "seat_id": seat_id,
                "allocated_at": now - timedelta(days=random.randint(10, 100)),
                "released_at": None,
                "is_active": True,
            }
            for emp_id, seat_id in zip(allocated_employees, allocated_seats)
        ]

        bulk_insert(db, SeatAllocation, allocation_rows)

        occupied = len(allocated_employees)

        # Set-based status updates instead of per-object ORM writes.
        db.execute(
            text("UPDATE seats SET status='Occupied' WHERE id <= :occupied"),
            {"occupied": occupied},
        )
        db.execute(
            text("UPDATE seats SET status='Reserved' WHERE id > :occupied AND id <= :reserved"),
            {"occupied": occupied, "reserved": occupied + 100},
        )
        db.execute(
            text("UPDATE seats SET status='Maintenance' WHERE id > :reserved AND id <= :maintenance"),
            {"reserved": occupied + 100, "maintenance": occupied + 150},
        )
        db.execute(
            text("UPDATE seats SET status='Available' WHERE id > :maintenance"),
            {"maintenance": occupied + 150},
        )

        db.commit()
        print("Seat allocations created successfully.")

        # ------------------------------------------------------------------
        # 6. Historical Seat Allocations (200)
        # ------------------------------------------------------------------
        print("Generating historical seat allocation logs...")

        historical_employees = random.sample(employee_ids, 200)
        historical_seats = random.sample(seat_ids, 200)

        history_rows = []
        for i in range(200):
            alloc_time = now - timedelta(days=random.randint(120, 200))
            release_time = alloc_time + timedelta(days=random.randint(30, 90))
            history_rows.append({
                "employee_id": historical_employees[i],
                "seat_id": historical_seats[i],
                "allocated_at": alloc_time,
                "released_at": release_time,
                "is_active": False,
            })

        bulk_insert(db, SeatAllocation, history_rows)
        db.commit()
        print("Historical allocations created.")

        # ------------------------------------------------------------------
        # 7. Project Memberships (~85% of active employees)
        # ------------------------------------------------------------------
        print("Mapping employees to projects...")

        # Build a single pre-shuffled pool of "slots": each active project's
        # id appears exactly `capacity` times. Popping sequentially from this
        # pool assigns employees to projects while respecting capacity,
        # without ever rescanning/filtering a list per employee (O(n) total
        # instead of O(employees * projects)).
        slot_pool = []
        for p in db_projects:
            if p.status == "Active":
                slot_pool.extend([p.id] * p.capacity)
        random.shuffle(slot_pool)

        membership_rows = []
        slot_index = 0
        pool_size = len(slot_pool)

        for emp_id in employee_ids:
            if random.random() >= 0.85:
                continue
            if slot_index >= pool_size:
                break

            membership_rows.append({
                "employee_id": emp_id,
                "project_id": slot_pool[slot_index],
                "assigned_at": now - timedelta(days=random.randint(10, 90)),
                "is_active": True,
            })
            slot_index += 1

        bulk_insert(db, ProjectMembership, membership_rows)
        db.commit()

        print("Project memberships successfully mapped.")
        print("Database Seeding Completed Successfully!")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()