# Wellness Counseling Centre Management System (WCCMS) - CUAP

A secure, university-grade Electronic Mental Health Record (EMHR) and Counseling management system designed for the Central University of Andhra Pradesh (CUAP).

---

## Technical Stack

* **Frontend:** React + Next.js (App Router) + TypeScript + Tailwind CSS + Recharts
* **Backend:** Node.js + Express + TypeScript
* **Database:** PostgreSQL (with a fail-proof SQLite automatic file-based database fallback)
* **Authentication:** JWT with Two-Factor OTP security controls
* **Security & Privacy:** Column-level AES-256-GCM database encryption (HIPAA ready), strict RBAC guards, and IP audit trails.

---

## Quick Start (Local Run)

### 1. Install Dependencies
Run the installation command in the root folder of the project to bootstrap all client and server npm modules concurrently:
```bash
npm run install:all
```

### 2. Launch Development Servers
Launch both the Express API server (on port `5000`) and the Next.js Client portal (on port `3000`) simultaneously with a single command:
```bash
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`** to view the application portal.

---

## Credentials & 2FA Flow

### 1. Admin Login
* **Username:** `admin`
* **Password:** `2026`

### 2. How to pass 2FA (OTP)
When you submit credentials, the system initiates Two-Factor Verification.
Since this is running locally, the OTP code is printed directly to the **Server Log Console** (the terminal window where you ran `npm run dev`):
```text
======================================================
 [2FA SIMULATOR] OTP Code for ADMIN: 384759 
 Expiration: 5 minutes (16:35:12)
======================================================
```
Copy the 6-digit code and submit it in the secondary login prompt to unlock the session.

---

## Key Advanced Modules

### 1. Assistive AI Copilot Engine
On the Provider (Counselor) Portal SOAP notes screen, a dedicated **AI Clinical Assist** tab is available:
* **Suicide/Self-harm Risk Scanner:** Scans complaints and session notes against clinical distress triggers. Raises red banner warnings if keywords (such as "self-harm", "end my life") match.
* **SOAP Note Formatter:** Synthesizes raw complaints into structured Subjective, Objective, Assessment, and Plan notes.
* **ICD-11 / DSM-5-TR Suggestions:** Runs symptom mappings to recommend potential clinical diagnostic categories.
* **Treatment Suggestion Agent:** Suggests CBT exercises, breathing techniques, and homework sheets depending on the diagnosed condition.

### 2. HIPAA Cryptography
Clinical notes (SOAP, history, formulations, family files) are automatically encrypted with AES-256-GCM prior to being saved to the database. These records are decrypted on request authorization.

### 3. Mental State Exam Logs
Counselors can record and store multiple structured MSE checklists per client over time. The dashboard displays a comparative progress panel showing chronological adjustments in appearance, affect, and risk.

### 4. Graphing & Outcome Tracking
When students complete PHQ-9 (Depression screening) or GAD-7 (Anxiety screening) surveys, the portal records the calculated scores and renders a chronological progress line graph via Recharts.

---

## Production / Docker Deployments

For PostgreSQL production deployments:
1. Fire up database containers via Docker Compose:
   ```bash
   docker-compose up -d
   ```
2. Open `backend/.env` and update configuration variables:
   ```env
   DB_TYPE=postgres
   DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/wccms
   ```
3. Boot the backend server. The migrations script will automatically run table indices, schemas, and seed default admin accounts.
