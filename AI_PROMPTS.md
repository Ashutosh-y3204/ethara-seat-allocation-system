# AI Assistant Natural Language Prompts Guide

The Ethara seat management application features a built-in natural language query engine that interprets text commands and translates them directly to database operations.

No external APIs are required. It operates via regular expression tokenization and optimized SQLAlchemy queries.

---

## Supported Natural Language Prompts

| Intent | Query Example | SQLAlchemy Operation |
| :--- | :--- | :--- |
| **Locate Employee Desk** | `Where is John sitting?` | Performs a case-insensitive search on `Employee.name`. Matches the employee, finds their active `SeatAllocation`, and fetches `Seat.seat_number` with building, floor, and zone. |
| **Show Vacant Desks by Floor** | `Show vacant seats on Floor 2.` | Queries `Seat` entries where `Seat.floor` matches the digit/string and `Seat.status` equals `Available`. |
| **Reserve / Allocate Seat** | `Allocate seat to EMP1004.` | Locates `Employee` by code, verifies no duplicate active seat exists, finds first `Available` seat, maps them in `SeatAllocation`, and sets status to `Occupied`. |
| **Global Seat Inventory counts** | `How many seats are available?` | Queries `func.count(Seat.id)` filtered by `Seat.status == "Available"` and compares it with overall seat counts. |
| **Department Workers list** | `Show Finance employees.` | Filters `Department.name` matching "Finance", joins `Employee` table where status is "Active", and returns list of matches. |

---

## Technical Implementation details

The engine is encapsulated inside `AIAssistantService` (`backend/app/services/ai_assistant.py`) and exposed via the `/api/assistant` POST controller.

It parses queries using compiled case-insensitive regular expressions:

```python
# 1. Employee seat query
re.search(r"where is\s+([\w\s'-]+)\s+sitting\??", query)

# 2. Vacant floor seats
re.search(r"(?:show\s+)?vacant\s+seats\s+on\s+(?:floor\s+)?(\d+|\w+)", query)

# 3. Quick allocation
re.search(r"allocate\s+(?:a\s+)?seat\s+to\s+(?:employee\s+)?(emp\d+|\d+)", query)
```

The response returns a structured payload format:
*   `success`: Boolean success flag.
*   `text`: Friendly bot answer string.
*   `type`: Dynamic return type (`seat_info`, `seat_list`, `employee_list`, `allocation_success`, `stats`, `help`).
*   `data`: Dict or array containing records which the React frontend renders into dedicated widgets.
