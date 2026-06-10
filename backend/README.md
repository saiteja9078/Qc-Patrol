# QC Patrol Record System — Backend

FastAPI backend for QCパトロール記録（組立工程）TQD-002付表.

## Prerequisites
- Python 3.11+
- PostgreSQL 15+

## Setup

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create the virtual environment
python -m venv venv

# 3. Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy environment file and fill in values
cp .env.example .env
# Edit .env with your database URL, JWT secret, and SMTP settings

# 6. Run database migrations
alembic upgrade head

# 7. Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

## Environment Variables

See `.env.example` for all required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET_KEY` — Long random string for JWT signing
- `SMTP_*` — Email/SMTP credentials for OTP emails
- `FRONTEND_ORIGIN` — Frontend URL for CORS

## Key Endpoints

| Route | Description |
|---|---|
| `POST /api/auth/register` | Register new user (sends OTP) |
| `POST /api/auth/verify-email` | Verify email with OTP |
| `POST /api/auth/login` | Login (returns JWT + refresh cookie) |
| `POST /api/auth/forgot-password` | Send password reset OTP |
| `POST /api/auth/reset-password` | Reset password with OTP |
| `GET /api/records/` | List patrol records (paginated, filterable by date) |
| `POST /api/records/` | Create new record |
| `GET /api/records/{id}` | Get record detail |
| `PUT /api/records/{id}` | Update record |
| `DELETE /api/records/{id}` | Soft-delete record |
| `GET /api/export/pdf/{id}` | Export single record as PDF |
| `GET /api/export/pdf/bulk?date=` | Export all records for a date |
| `GET /api/records/stream?date=` | SSE stream for realtime updates |
