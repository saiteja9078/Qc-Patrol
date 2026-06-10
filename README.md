# QC Patrol Record System (ＱＣパトロール記録システム)

A full-stack web application to digitize and manage **ＱＣパトロール記録（組立工程）** — replacing the paper form **TQD-002付表**.

## Architecture

```
qc-patrol-app/
├── backend/     ← Python FastAPI + PostgreSQL + WeasyPrint PDF
└── frontend/    ← React 18 + Vite + Tailwind CSS
```

The two services communicate only over HTTP (REST API + SSE).

## Features

- 🔐 Email + password authentication with JWT + refresh token rotation
- 📧 Email OTP for registration verification and password reset
- 📋 Full patrol record management (create, view, edit, soft-delete)
- 📅 Date-based filtering, sorted by time of entry
- 📄 PDF export exactly matching TQD-002付表 layout (WeasyPrint)
- ⚡ Realtime list updates via Server-Sent Events (SSE)
- 💾 Auto-save draft to localStorage every 30 seconds

## Quick Start with Docker Compose

```bash
# 1. Copy and configure backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your SMTP credentials and JWT secret

# 2. Start all services
docker-compose up --build

# Services:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Ensure VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 + FastAPI (async) |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| Database | PostgreSQL 15 |
| Migrations | Alembic |
| Auth | JWT (python-jose) + passlib bcrypt |
| Email | fastapi-mail (SMTP) |
| PDF | WeasyPrint + Jinja2 |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| State | Zustand + TanStack Query v5 |
| Realtime | Server-Sent Events (SSE) |
