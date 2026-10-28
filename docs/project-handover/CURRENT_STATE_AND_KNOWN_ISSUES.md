# 📊 Current State & Known Issues

This document records the exact operational state of the codebase following the post-reset audit.

---

## 1. Build & Test Audit Results

| Component | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | `npm --prefix backend test` | ✅ **PASS (16/16)** | All simulation engine tests passing in 1.015s. |
| **Backend Build** | `npm --prefix backend run build` | ✅ **PASS** | TypeScript compilation (`tsc`) clean with zero errors. |
| **Frontend Production Build** | `npm --prefix frontend run build` | ✅ **PASS** | Vite production bundle generated in 2.83s with code splitting. |
| **Local Backend Runtime** | `node dist/server.js` | ✅ **PASS** | Health endpoint responded `{"status":"ok"}` on port 5001. |
| **Local API & Auth Flow** | `POST /api/auth/login` | ✅ **PASS** | Instructor login, room creation, and student join verified. |
| **Git Remote Sync** | `git status` | ✅ **CLEAN** | Clean working tree; `origin/main` synchronized. |

---

## 2. Feature Verification Status

| Feature / Subsystem | Verification Level | Status & Notes |
| :--- | :--- | :--- |
| **Deterministic Simulation Engine** | Fully Verified | Covered by 16 automated Jest test suites in `engine.test.ts`. |
| **Raw Material Steppers** | Locally Verified & Built | Horizontal steppers with discrete unit steps and instant debounced sync. |
| **Single-Column Machine Modal** | Locally Verified & Built | Clean single-column layout for Mixer, Oven, Icing, Packaging. |
| **Factory Feed Proportions** | Locally Verified & Built | Aspect ratio 2.4; dynamic height clamping preventing vertical scroll. |
| **4 Dashboard Report Cards** | Locally Verified & Built | Matches Image 2 canonical layout, typography, and modal triggers. |
| **Demand vs Sales Graph** | Locally Verified & Built | Series displays "Actual Daily Sales" mapped directly to `history.sales`. |
| **PDF Simulation Report** | Locally Verified & Built | Client-side jsPDF generator with full preview modal. |
| **Customer Satisfaction (Fill Rate)**| Fully Verified | Cumulative calculations verified across multi-day simulation runs. |
| **Multiplayer WebSockets** | Code Audited & Tested | Socket handler isolates teams by `roomId` and `teamId`; `leave_room` unbinds properly. |
| **6-Step Scenario Wizard** | Code Audited & Built | All 6 steps fully functional: Info, Contracts, Demand schedule, Lead times, Machines, Stars. |
| **Dynamic Numbering for Presets** | Verified | Presets dynamically numbered 1, 2, 3; 10-minute variants completely purged. |
| **Dual-Screen Projector Board** | Code Audited & Built | Dedicated `/projector` window for auditorium display. |

---

## 3. Security Findings & Audit Observations

During the comprehensive repository audit, the following security and design patterns were documented:

1. **Hardcoded Credentials in Seed Data (`backend/src/db/db.ts`):**
   - Default admin credentials: `aryajain1906@gmail.com` with password `@Aryajain19`.
   - Default instructor account: `instructor@factory.com` with password `muffin123`.
   - Default operator account: `operator@factory.com` with password `muffin123`.
   - *Recommendation:* Move default admin seed credentials to environment variables (`ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`) in production environments.

2. **Default JWT Secret Fallback:**
   - Fallback string `'super_secret_key_muffin_mega_factory_2026'` is present in `auth.ts`, `middleware.ts`, and `socketHandler.ts`.
   - *Production Guard:* Ensure `JWT_SECRET` is always set in the Render environment settings.

3. **Auto-Provisioning Bypasses (`backend/src/routes/auth.ts`):**
   - Certain email patterns (`*shivam*`, `3shivamrai@gmail.com`, `1shivam@gmail.com`) trigger automatic instructor account provisioning.
   - *Note:* Maintained as an intentional founder access convenience; must not be removed without explicit founder approval.

4. **Plaintext Instructor Password in Licenses:**
   - In `backend/src/routes/licenses.ts`, `instructorPassword` is stored in plaintext on the license record for admin display.
   - *Recommendation:* Hash before storage or display one-time generation credentials upon license creation.

---

## 4. Known Limitations & Non-Breaking Observations

1. **Vite Chunk Size Notice:**
   - `dist/assets/vendor-pdf-Bs8TK07w.js` is ~775 kB uncompressed (~238 kB gzipped) due to bundled `jspdf` and `jspdf-autotable`.
   - *Status:* Expected for comprehensive client-side PDF export libraries. Can be dynamically imported in future optimization passes.

2. **Dual-Mode Database Fallback:**
   - In local development without a running PostgreSQL instance, `db.ts` uses a local JSON file (`data/db.json`). State resets if the JSON file is deleted.
   - In production (Render), ensure `DATABASE_URL` is set to PostgreSQL for persistent storage.

3. **Permissive Development CORS:**
   - `server.ts` currently allows all origins via callback fallback to support Vercel preview deployments and local development simultaneously. Domain restriction can be enabled when required.
