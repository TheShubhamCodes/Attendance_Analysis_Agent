# Attendance Analysis Agent — Production Deployment Guide

This guide provides step-by-step instructions to deploy the **Attendance Analysis Agent** to production using **Render** (Backend API), **Vercel** (Frontend UI), and **Neon PostgreSQL** (Database).

---

## Architecture Overview

```
                   +---------------------------+
                   |       Vercel (Client)     |
                   | React + Vite SPA          |
                   | https://your-app.vercel.app|
                   +-------------+-------------+
                                 |
                                 | HTTPS / JSON API
                                 v
                   +---------------------------+
                   |       Render (Backend)    |
                   | Node.js / Express API     |
                   | https://your-api.onrender.com
                   +-------------+-------------+
                                 |
                   +-------------+-------------+
                   |                           |
        Prisma Queries (Pooled)      Prisma Migrations (Direct)
                   |                           |
                   v                           v
     +---------------------------+---------------------------+
     |     Neon PostgreSQL       |     Neon PostgreSQL       |
     |   PgBouncer Pooler Host   |   Direct Compute Host     |
     |   DATABASE_URL            |   DIRECT_URL              |
     +---------------------------+---------------------------+
```

---

## 1. Neon PostgreSQL Database Setup

1. Log in to [Neon Console](https://console.neon.tech).
2. Create a new project (or select your existing project):
   - **Database Name**: `neondb` (default)
   - **Role**: `neondb_owner` (default)
3. In your Neon Project Dashboard, navigate to **Connection Details**:
   - **Pooled connection string** (PgBouncer mode):
     Copy the connection string. It will look like:
     ```
     postgresql://neondb_owner:YOUR_PASSWORD@ep-cold-wind-axzlsiht-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
     *(Note: If Neon appends `&channel_binding=require`, keep `sslmode=require`)*
   - **Direct connection string** (Unpooled mode, under the **Connection string** dropdown, toggle "Direct"):
     ```
     postgresql://neondb_owner:YOUR_PASSWORD@ep-cold-wind-axzlsiht.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
4. Save both strings for the Render environment variables in Step 2.

---

## 2. Render Deployment (Backend API)

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (`Attendance_Analysis_Agent`).
4. Configure the service settings:

| Setting | Recommended Value | Notes |
| :--- | :--- | :--- |
| **Name** | `attendance-analysis-api` | Or your preferred service name |
| **Region** | Select closest region to your Neon DB (e.g. `Ohio (US East)`) | Reduces latency |
| **Root Directory** | `server` | Points Render directly to the backend |
| **Runtime** | `Node` | Standard Node.js environment |
| **Build Command** | `npm install && npm run build && npm run prisma:deploy` | Installs deps, generates Prisma client, and applies safe database migrations |
| **Start Command** | `npm start` | Runs `node src/server.js` |
| **Health Check Path** | `/api/health` or `/health` | Render automatically probes this to confirm zero-downtime deployment |

> **Alternative (Deploying from Root without changing Root Directory)**:
> - **Build Command**: `npm run render:build`
> - **Start Command**: `npm run render:start`

5. Add the following **Environment Variables** in the Render service:

| Variable Name | Value / Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production error handling & disables demo data wiping |
| `PORT` | `5000` *(Render sets this automatically)* | Backend binds to Render's dynamic port |
| `DATABASE_URL` | Neon **Pooled** Connection String | `postgresql://neondb_owner:pass@ep-pooler.aws.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | Neon **Direct** Connection String | `postgresql://neondb_owner:pass@ep-direct.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Strong random secret string (min 32 chars) | `3f8a92b17c6e4d5091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4` |
| `JWT_EXPIRES_IN` | Token duration | `7d` |
| `CORS_ORIGIN` | Your Vercel frontend URL(s) (comma-separated) | `https://attendance-analysis-agent.vercel.app` |

6. Click **Create Web Service**.
7. Once deployed, test the health check URL in your browser:
   ```
   https://attendance-analysis-api.onrender.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "online",
     "database": "connected",
     "service": "Attendance & Student Performance Agent API",
     "uptimeSeconds": 15,
     "timestamp": "2026-09-14T12:00:00.000Z",
     "environment": "production"
   }
   ```

---

## 3. Vercel Deployment (Frontend React Client)

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`Attendance_Analysis_Agent`).
4. Configure the project settings:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` (automatically detected) |
| **Root Directory** | `client` *(Click "Edit" and select `client`)* |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

5. Configure **Environment Variables**:

| Variable Name | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://your-backend-service.onrender.com/api` |

*(Note: The client auto-normalizes the URL, so both `https://...onrender.com` and `https://...onrender.com/api` work seamlessly).*

6. Click **Deploy**.
7. Single-Page Application (SPA) routing is handled automatically by [client/vercel.json](file:///c:/Users/Lenovo/OneDrive/Desktop/Attendance_Analysis_Agent/client/vercel.json). Refreshing any route (`/dashboard`, `/faculty`, `/student`, `/mentor`) will work without 404 errors.

---

## 4. Production Security & Safe Migrations

1. **Prisma Migrations**:
   - The initial migration baseline is committed at `server/prisma/migrations/0_init/migration.sql`.
   - Render executes `npm run prisma:deploy` during the build step. This runs `prisma migrate deploy` safely against Neon PostgreSQL without prompting or altering existing data.
2. **Demo Data Protection**:
   - `server/prisma/seed.js` is automatically blocked from running when `NODE_ENV=production`. Your production database records will never be wiped.
   - On initial boot, `server.js` initializes the default administrator account (`ADMIN001`) if no admin exists, so you can immediately log in to configure departments and accounts.
3. **Secrets & Git Protection**:
   - `.gitignore` ensures all `.env` files, local `node_modules`, `pg_data/`, and build artifacts are strictly excluded from git tracking.
   - `server/.env` has been untracked from git.
4. **CORS & Preview Domains**:
   - Production requests from your configured `CORS_ORIGIN` and automatic Vercel preview URLs (`*.vercel.app`) are allowed.
   - Development localhost URLs (`localhost:5173`, `127.0.0.1`) remain supported in development.

---

## 5. Local Development Quick Reference

To run the full stack locally:
```bash
# Terminal 1: Start Backend API (runs embedded-postgres if no local DB found)
npm --prefix server run dev

# Terminal 2: Start Frontend Client
npm --prefix client run dev

# Or run both concurrently from root:
npm start
```

Default local credentials (after initial local seed):
- **Admin**: Identifier: `ADMIN001`, Password: `Admin@1234`
- **HOD**: Identifier: `HOD001`, Password: `Hod@1234`
- **Faculty**: Identifier: `FAC001`, Password: `Faculty@123`
- **Student**: Identifier: `23CSE101`, Password: `Student@123`
- **Parent**: Identifier: `23CSE101`, Password: `Parent@123`
