# IETP Management System — Full Stack

- `backend/` — Django REST API (this is your existing backend, untouched except nothing was changed here).
- `frontend/` — React/Vite dashboard, rewired to call the Django API instead of Supabase. All mock data is gone.

## Order to run things in

1. Backend first. Follow `backend/SETUP.md` (create venv, install requirements,
   set up Postgres, `.env`, migrate, createsuperuser, `runserver`).
2. Frontend second. `cd frontend`, `npm i`, `npm run dev`. It already points
   at `http://127.0.0.1:8000/api` in `.env`.
3. Log in with the superuser you created (role `admin`), or create student/advisor
   accounts from the Admin dashboard's User Management tab.

See `frontend/README.md` for details on how the integration is wired.
