# IETP Management System — Backend (Django + PostgreSQL)

This is the real backend, generated directly from `IETP_Database_Schema.docx`.
13 models, one per table, with the same field names, types, and relationships
as the schema doc. It's been tested end-to-end (migrations, JWT login,
role-scoped API responses) before being handed to you.

## 1. Install prerequisites (Windows)

**Python**
1. Download Python 3.12+ from https://www.python.org/downloads/windows/
2. Run the installer — **check "Add python.exe to PATH"** before clicking Install.
3. Verify in a new Command Prompt / PowerShell window:
   ```
   python --version
   pip --version
   ```

**PostgreSQL**
1. Download the installer from https://www.postgresql.org/download/windows/
2. Run it. When prompted:
   - Set a password for the `postgres` superuser — **remember this**, you'll need it.
   - Keep the default port `5432`.
   - Stack Builder popup at the end — you can skip it.
3. This also installs **pgAdmin 4**, a GUI for managing the database.

**Create the database**
Open pgAdmin (or use the SQL Shell / `psql` that came with the installer) and run:
```sql
CREATE DATABASE ietp_db;
```

## 2. Set up the Django project

Open Command Prompt / PowerShell in this folder (`ietp_backend_project`):

```powershell
# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## 3. Configure environment variables

Copy `.env.example` to `.env` in this same folder, then edit `.env`:
```
DB_PASSWORD=<the postgres password you set during install>
```
Leave the rest of the defaults unless you changed the DB name/port.

## 4. Run migrations and create your admin account

```powershell
python manage.py migrate
python manage.py createsuperuser
```
You'll be prompted for email, full name, role, and password — this becomes
your first login (use role `admin`).

## 5. Run the server

```powershell
python manage.py runserver
```
API is now live at `http://127.0.0.1:8000/api/`.
Django admin panel (visual DB browser): `http://127.0.0.1:8000/admin/`.

## API overview

**Auth**
- `POST /api/auth/login/` — body `{ "email": "...", "password": "..." }` → returns `access`, `refresh`, and `user` (includes `role`)
- `POST /api/auth/refresh/` — body `{ "refresh": "..." }` → returns a new `access` token
- All other endpoints require header `Authorization: Bearer <access_token>`

**Resources** (all under `/api/`, standard REST — `GET` list/detail, `POST` create, `PATCH`/`PUT` update, `DELETE`)
| Endpoint | Table |
|---|---|
| `/api/users/` | USER |
| `/api/users/me/` | current logged-in user |
| `/api/groups/` | PROJECT_GROUP |
| `/api/group-members/` | GROUP_MEMBER |
| `/api/advisor-assignments/` | ADVISOR_ASSIGNMENT |
| `/api/projects/` | PROJECT |
| `/api/submissions/` | SUBMISSION |
| `/api/documents/` | DOCUMENT |
| `/api/progress-logs/` | PROGRESS_LOG |
| `/api/feedback/` | FEEDBACK |
| `/api/evaluations/` | EVALUATION |
| `/api/archive/` | ARCHIVE |
| `/api/notifications/` | NOTIFICATION |
| `/api/audit-logs/` | AUDIT_LOG (admin read-only) |

**Role-based scoping is already built in:**
- Students only see groups/projects/submissions/logs tied to groups they belong to
- Advisors only see groups/projects they're assigned to
- Admins see everything
- Feedback can only be created by advisors/admins
- Audit logs are admin-only

## What's NOT done yet (next steps)

- The React frontend still uses the mock data files from earlier — it isn't calling this API yet
- No seed/demo data — the database is empty until you create users via `/admin/` or `createsuperuser`
- File uploads (`Document.file`, `Archive.report_file`) work but aren't hooked up to any storage service (fine for local dev, stored in `/media/`)
