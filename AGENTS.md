# Project Memory

## Context

SaludDigital enterprise architecture demo for a clinic. Monorepo with a FastAPI backend, PostgreSQL database, and React/Vite frontend. Docker Compose runs the full stack.

- `backend/`: FastAPI, SQLAlchemy, JWT auth, bcrypt passwords.
- `frontend/`: React 19, TypeScript, Vite, React Router, Axios.
- `database/init.sql`: schema, seed data, views, and BI user permissions.
- `ROLES_Y_PERMISOS_SaludDigital_DETALLADO.md`: detailed role and endpoint reference.
- `README.md`: setup, demo credentials, modules, and business rules.

## Run And Verify

Start or rebuild the stack:

```powershell
docker compose up -d --build
```

Rebuild a single service:

```powershell
docker compose up -d --build backend
docker compose up -d --build frontend
```

The backend and frontend containers do not mount source code. Rebuild after code changes; restarting alone does not deploy them.

Frontend checks:

```powershell
npm run lint
npm run build
```

Run these from `frontend/`.

Backend syntax check:

```powershell
..\.venv\Scripts\python.exe -m py_compile app\api\endpoints\admision.py app\schemas.py
```

Run from `backend/`. `python` is not on PATH; use `.venv\Scripts\python.exe`.

Local endpoints:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5433`

Demo credentials are documented in `README.md`. Do not duplicate secrets in this file.

## Implementation Notes

- Backend and database use `TZ=America/Bogota`.
- Patient appointment creation forces `estado="Agendada"` and ignores any other submitted state.
- Patient ownership comes from the JWT via `paciente_id_from_token`.
- Appointment dates must be strictly future. Timezone-aware datetimes compare against UTC; naive datetimes compare against server local time.
- `GET /admision/citas/mis-citas` returns only the authenticated patient's appointments.
- `PATCH /admision/citas/{id}/cancelar` sets `estado="Cancelada"`.
- `PATCH /admision/citas/{id}/reprogramar` accepts `{ "fecha": "..." }` and requires a future date.
- Cancel and reschedule allow `paciente`, `medico`, `cajero`, and `admin`. A patient may only manage their own appointments; other allowed roles may manage any appointment.
- Patient portal appointment actions use accessible custom modals in `PacienteDashboard.tsx`: Escape closes, backdrop closes, close button receives focus, and async feedback uses `role="status"`/`role="alert"`.
- The patient portal only shows cancel/reschedule actions for appointments where `isUpcoming(cita)` is true.

## Recent Work

Completed 2026-10-21:

- Added patient cancel/reschedule backend endpoints and `CitaReprogramar` schema.
- Added cancel confirmation and reschedule modal to the patient portal.
- Updated `README.md` and the detailed roles document for the new endpoints.
- Verified with backend compile, frontend lint/build, and live API calls:
  - create → reschedule → cancel succeeded;
  - past reschedule returned `400`;
  - managing another patient's appointment returned `403`;
  - test records were removed afterward.
- Rebuilt backend and frontend containers.

## Project Conventions

- Keep role checks server-side; frontend visibility is not authorization.
- Follow existing FastAPI endpoint style, SQLAlchemy session usage, and Spanish user-facing messages.
- Reuse existing CSS variables and components. Do not add a UI library for small changes.
- Use dedicated file tools for editing; avoid shell text commands for file changes.
- Do not commit unless explicitly requested.
