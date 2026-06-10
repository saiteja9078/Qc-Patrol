# QC Patrol Record System — Frontend

React + Vite frontend for QCパトロール記録（組立工程）TQD-002付表.

## Prerequisites
- Node.js 20+
- npm 10+

## Setup

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Copy environment file and configure
cp .env.example .env
# Edit VITE_API_BASE_URL to point to your backend

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Build for Production

```bash
npm run build
```

Output will be in `dist/`.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL (e.g. `http://localhost:8000/api`) |

## Pages

| Route | Description |
|---|---|
| `/login` | Login page |
| `/register` | Registration with email OTP verification |
| `/forgot-password` | Password reset via OTP |
| `/dashboard` | Summary stats and recent records |
| `/records` | Records list with date filter and SSE realtime updates |
| `/records/new` | New patrol record form |
| `/records/:id` | Record detail view with PDF export |
| `/settings` | Account settings / change password |
