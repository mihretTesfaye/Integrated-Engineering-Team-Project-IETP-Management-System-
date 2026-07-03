# IETP Management System — Frontend

React + Vite dashboard for the IETP Management System. This talks to the
real Django backend (see the `ietp_backend_project` folder next to this one)
over its REST API — there's no Supabase and no mock data left in here.

## Running the code

1. Install dependencies:
   ```
   npm i
   ```
2. Copy `.env.example` to `.env` if you haven't already (it already points at
   `http://127.0.0.1:8000/api`, which matches the Django dev server default).
3. Make sure the Django backend is running first (see its own `SETUP.md`) —
   this app has nothing to show until that API is up.
4. Start the dev server:
   ```
   npm run dev
   ```
5. Log in with an account created on the backend (e.g. the superuser you made
   with `python manage.py createsuperuser`, or any account an admin creates
   from the Admin dashboard's "User Management" tab).

## How the integration works

- `src/app/lib/api.ts` — the only place that talks to the network. Handles
  JWT storage, automatic token refresh on 401s, and typed helpers for every
  backend resource (users, groups, projects, submissions, documents,
  progress logs, feedback, evaluations, archive, notifications).
- `src/app/context/AuthContext.tsx` — logs in against `/api/auth/login/`,
  keeps the current user in memory, and rehydrates the session on refresh if
  a token is already stored.
- `src/app/App.tsx` — renders the Student, Advisor, or Admin dashboard based
  on the logged-in user's role (returned by the backend), instead of the old
  click-through preview.
- Each dashboard fetches its own data on mount and calls the API directly for
  every action (submitting updates, logging milestones, uploading files,
  approving proposals, entering scores, creating groups/users, publishing to
  the archive, etc). Nothing is hardcoded.

## CORS note

The backend's `CORS_ALLOWED_ORIGINS` already includes `http://localhost:5173`
(the Vite dev server default), so this should work out of the box for local
development.
