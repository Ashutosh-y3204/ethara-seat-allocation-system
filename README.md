# Ethara Seat Allocation & Project Mapping System

Ethara is an enterprise-grade SaaS application designed to manage desk space allocation and project membership mappings for approximately 5,000 employees. Built with a clean Python FastAPI repository-service backend, React-Vite custom-themed Tailwind UI frontend, and a PostgreSQL database orchestrator.

---

## Folder Structure

```
seat-allocation/
├── backend/
│   ├── app/
│   │   ├── config/          # Settings and DB settings connection
│   │   ├── models/          # SQLAlchemy database models
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── repositories/    # Database queries (Repository pattern)
│   │   ├── services/        # Business logic rules (Auth, Suggestions, AI parsing)
│   │   ├── routers/         # REST API Controllers (endpoints)
│   │   ├── database.py      # Connection manager
│   │   └── main.py          # FastAPI application initialization
│   ├── alembic/             # Database migrations environment
│   ├── tests/               # Pytest tests
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── seed.py              # Custom Faker seeder (5k employees, 5.5k seats, 350 projects)
├── frontend/
│   ├── src/
│   │   ├── components/      # Common components (Sidebar layout, Route Guards)
│   │   ├── context/         # AuthContext state manager
│   │   ├── pages/           # Dashboard, Employees list, Projects list, Seats map, AI Chat, Profile settings
│   │   ├── services/        # Axios API configurations & automatic refresh interceptor
│   │   ├── App.jsx          # React router routes mapping
│   │   ├── index.css        # Global CSS design tokens
│   │   └── main.jsx
│   ├── index.html           # Document template with SEO metas
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml       # Orchestration file
└── README.md
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)
*   `DATABASE_URL`: Connection string. Default: `postgresql://postgres:postgrespassword@localhost:5432/ethara_db`
*   `JWT_SECRET`: Secret key for JWT hashing.
*   `JWT_ALGORITHM`: Alg name (Default: `HS256`).
*   `ACCESS_TOKEN_EXPIRE_MINUTES`: Access duration (Default: `30`).
*   `REFRESH_TOKEN_EXPIRE_DAYS`: Refresh token duration (Default: `7`).

### Frontend Configuration (`frontend/.env`)
*   `VITE_API_URL`: Root URL pointing to the FastAPI backend API. Default: `http://localhost:8000`

---

## Local Setup & Run Instructions

To boot up the entire stack (Database, Backend API, and Vite React Frontend) with live reload enabled:

1.  **Clone or navigate** to the project workspace directory.
2.  **Start docker services**:
    ```bash
    docker-compose up --build
    ```
3.  **Create migrations & seed the database**:
    To initialize tables and populate 5,000 employees, 350 projects, 5,500 seats, and 40 departments (approx. 90% occupancy):
    ```bash
    # Exec into backend container and run migrations/seeding
    docker-compose exec backend alembic revision --autogenerate -m "initial_schema"
    docker-compose exec backend alembic upgrade head
    docker-compose exec backend python seed.py
    ```
4.  **Open browser**:
    *   **Frontend SaaS dashboard**: [http://localhost:5173](http://localhost:5173)
    *   **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## User Authentication Access Credentials

Reviewers can use these preset logins to test the application features (password is `password123` for all):

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin@ethara.com` | `password123` |
| **HR Executive** | `hr@ethara.com` | `password123` |
| **Project Manager** | `pm@ethara.com` | `password123` |
| **Standard Employee** | `employee@ethara.com` | `password123` |

---

## Verification & Testing

To run the automated Python backend tests checking Auth endpoints, Seat Allocation block rules, and Assistant regex query matching:
```bash
docker-compose exec backend pytest
```

---

## Deployment Guidelines

### Frontend → Vercel
1.  Connect the `frontend/` subdirectory.
2.  Set Build command: `npm run build`. Output directory: `dist`.
3.  Add environment variable: `VITE_API_URL` pointing to Render.

### Backend → Render
1.  Connect the `backend/` directory.
2.  Set runtime: `Python`. Build Command: `pip install -r requirements.txt`.
3.  Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4.  Add environment variable: `DATABASE_URL` pointing to Railway.

### Database → Railway
1.  Spin up a PostgreSQL service.
2.  Export the DB URL and bind it in Render's configuration.
