# 📊 Current State & Known Issues

This document records the exact operational state of the codebase at the time of handover.

---

## 1. Build & Test Audit Results

| Component | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | `npm --prefix backend test` | ✅ **PASS (14/14)** | All simulation engine tests passing in 0.704s. |
| **Backend Build** | `npm --prefix backend run build` | ✅ **PASS** | TypeScript compilation (`tsc`) clean with zero errors. |
| **Frontend Build** | `npm --prefix frontend run build` | ✅ **PASS** | Vite production bundle generated in 2.92s with code splitting. |
| **Git Remote Sync** | `git status` | ✅ **CLEAN** | Clean working tree; `origin/main` synchronized. |

---

## 2. Feature Verification Status

| Feature / Subsystem | Verification Level | Status & Notes |
| :--- | :--- | :--- |
| **Deterministic Engine** | Fully Verified | Covered by 14 automated Jest test suites. |
| **Raw Material Steppers** | Locally Verified & Built | Spacious horizontal controls with integer bounds. |
| **Single-Column Machine Modal** | Locally Verified & Built | Single-column rows for Mixer, Oven, Icing, Packaging. |
| **Factory Feed Proportions** | Locally Verified & Built | Aspect ratio 2.4; dynamic height clamping preventing page scrolling. |
| **4 Dashboard Report Cards** | Locally Verified & Built | Matches Image 2 typography, badges, and modal triggers. |
| **Demand vs Sales Graph** | Locally Verified & Built | Series displays "Actual Daily Sales" mapped to `history.sales`. |
| **PDF Simulation Report** | Locally Verified & Built | Client-side jsPDF generator with preview modal. |
| **Customer Satisfaction (Fill Rate)**| Fully Verified | Cumulative calculations verified by test suites. |
| **Multiplayer WebSockets** | Code Audited | Socket handler isolates teams by `roomId` and `teamId`. |

---

## 3. Known Limitations & Warnings

1. **Vite Chunk Size Warning:**
   - `dist/assets/vendor-pdf-wy0ZxbMe.js` is ~775 kB uncompressed (~238 kB gzipped) due to bundled `jspdf` and `jspdf-autotable`.
   - **Status:** Normal for client-side PDF export libraries. Can be further code-split dynamically via `import()` if desired in future optimization phases.
2. **Database Fallback:**
   - In local development without a running PostgreSQL database, `db.ts` uses an in-memory dictionary. Memory resets when the server restarts. In production (Render), ensure `DATABASE_URL` is configured for persistent state across restarts.
3. **CORS Configuration:**
   - Currently set to permissive origins in `server.ts` to allow Vercel previews and localhost dev. Ensure domain restrictions are tightened if corporate security audits require it.
