# AI Prompt Documentation

# Ethara Seat Allocation & Project Mapping System

## Overview

The Ethara Seat Allocation & Project Mapping System includes an AI-powered natural language assistant that enables users to interact with the application using plain English queries.

The assistant interprets predefined natural language commands, identifies the user's intent using regular expressions, executes optimized SQLAlchemy database queries, and returns structured JSON responses for rendering in the React frontend.

This implementation is fully rule-based and does not rely on external AI services.

---

# AI Architecture

User Query

↓

React Frontend

↓

POST /api/assistant

↓

AIAssistantService

↓

Regex Intent Detection

↓

SQLAlchemy Database Queries

↓

PostgreSQL Database

↓

Structured JSON Response

↓

Frontend Widgets

---

# Supported Natural Language Prompts

| User Intent | Example Prompt | Backend Action |
|-------------|----------------|----------------|
| Find employee seat | Where is John sitting? | Search employee → Active allocation → Seat details |
| Find available seats | Show vacant seats on Floor 2 | Filter available seats by floor |
| Allocate seat | Allocate seat to EMP1004 | Allocate first available seat |
| Seat statistics | How many seats are available? | Count seats grouped by status |
| Department employees | Show Finance employees | Join Department and Employee tables |

---

# Supported Query Patterns

## Employee Seat

```
Where is John sitting?
Where is Rahul sitting?
```

Regex

```python
re.search(
    r"where is\s+([\w\s'-]+)\s+sitting\??",
    query,
    re.IGNORECASE
)
```

---

## Vacant Seats

```
Show vacant seats on Floor 3
Show vacant seats on Floor 2
```

Regex

```python
re.search(
    r"(?:show\s+)?vacant\s+seats\s+on\s+(?:floor\s+)?(\d+|\w+)",
    query,
    re.IGNORECASE
)
```

---

## Seat Allocation

```
Allocate seat to EMP1004
Allocate seat to employee EMP1234
```

Regex

```python
re.search(
    r"allocate\s+(?:a\s+)?seat\s+to\s+(?:employee\s+)?(emp\d+|\d+)",
    query,
    re.IGNORECASE
)
```

---

# Business Rules

The assistant follows these rules:

- One employee can have only one active seat allocation.
- One seat can only be assigned to one active employee.
- Occupied seats cannot be allocated again.
- Reserved seats cannot be allocated.
- Maintenance seats cannot be allocated.
- Seat allocation updates both the SeatAllocation and Seat tables.
- Only active employees are eligible for allocation.
- Database consistency is maintained for every allocation.

---

# Backend Components

Natural language processing is implemented inside

```
backend/app/services/ai_assistant.py
```

The API endpoint is exposed through

```
POST /api/assistant
```

Database access uses

- SQLAlchemy ORM
- PostgreSQL
- Optimized filtering and joins

---

# Response Format

Every request returns a structured JSON response.

Example

```json
{
  "success": true,
  "type": "seat_info",
  "text": "John is sitting at H-3-B-24.",
  "data": {
    "seat_number": "H-3-B-24",
    "building": "HQ Tower",
    "floor": "Floor 3",
    "zone": "Zone B"
  }
}
```

---

# Response Types

The assistant supports the following response categories.

| Type | Description |
|------|-------------|
| seat_info | Employee seat information |
| seat_list | Available seats |
| employee_list | Employees within a department |
| allocation_success | Successful seat allocation |
| stats | Dashboard statistics |
| help | Help message |

---

# Example Queries

```
Where is John sitting?

Show vacant seats on Floor 2

Allocate seat to EMP1004

How many seats are available?

Show Finance employees
```

---

# Technology Stack

Frontend

- React
- Tailwind CSS
- Axios

Backend

- FastAPI
- SQLAlchemy
- PostgreSQL

Authentication

- JWT Authentication

Deployment

- Render
- Vercel

---

# Limitations

Current implementation uses rule-based intent matching.

It supports predefined commands and does not perform free-form conversational reasoning.

Unsupported queries return a friendly help response instead of generating incorrect information.

---

# Future Improvements

- LLM integration (Groq/OpenAI)
- Semantic search
- Conversational memory
- Voice commands
- Intelligent seat recommendations
- Natural language analytics
- Multi-language support

---

# Conclusion

The AI Assistant provides a lightweight, fast, and deterministic natural language interface for the Ethara Seat Allocation & Project Mapping System. By combining regex-based intent detection with optimized SQLAlchemy queries, it delivers accurate responses while maintaining database integrity and application performance.