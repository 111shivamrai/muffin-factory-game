# 🔮 Pending Requests & Future Work

This document tracks items discussed, roadmap features, and potential future tasks for the Muffin Factory Game.

---

## 1. Roadmap & Potential Enhancements

### 1. Frontend Dynamic Chunk Code-Splitting for PDF Generator
- **Concept:** Dynamically import `jspdf` and `jspdf-autotable` in `reportPdfGenerator.ts` using `await import(...)` only when the user clicks "Generate PDF Report".
- **Benefit:** Reduces initial bundle size by ~775 kB, clearing the Vite build warning.
- **Files Involved:** `frontend/src/utils/reportPdfGenerator.ts`, `frontend/src/components/ReportsPanel.tsx`.
- **Status:** Low priority optimization; current bundle loads smoothly on modern connections.

### 2. Environment-Based Admin Credentials
- **Concept:** Shift initial admin credentials and default institutional licenses out of hardcoded seed arrays in `db.ts` and into secure environment variables (`INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`).
- **Files Involved:** `backend/src/db/db.ts`.
- **Status:** Recommended for future production hardening.

### 3. Strict Production CORS Whitelist
- **Concept:** Lock down CORS in `backend/src/server.ts` to only allow official domains (`https://muffin-factory-game.vercel.app`, `localhost:3000`) and remove permissive callback fallback.
- **Files Involved:** `backend/src/server.ts`.
- **Status:** Pending when custom school subdomains are finalized.

---

## 2. Completed Items Log (Do Not Re-Implement)

- ✅ **Purge 10-Minute Scenario Variants:** Removed intermediate and advanced 10-min variants across database, API, and frontend cards (Commit `777901c`).
- ✅ **Dynamic Preset Numbering:** Sequential dynamic numbering (1, 2, 3) for standard scenarios in lobby calibrator (Commit `04e871d`).
- ✅ **UI Contrast & Segmented Theme Toggle:** Replaced non-standard shades with accessible high-contrast colors and added light/dark theme switch (Commits `ac09937`, `aaa897b`).
- ✅ **Admin Arena Telemetry:** Removed fake demo seeds and mock graphs, displaying real arena lobbies and telemetry (Commit `1c8efa2`).
- ✅ **Session Lifecycle & Concluded Session View:** Resolved room unbinding (`leave_room`) and added post-game review screen (Commit `e66a739`).
- ✅ **Direct Scenario Config Editing:** Added "Edit Config" buttons on scenario cards with copy-customization (Commits `41f2794`, `b3e68db`).
- ✅ **Classroom Projector Board Separation:** Independent `/projector` window for dual-screen classroom display (Commit `7235625`).
- ✅ **Bankrupt Factory Recovery:** Instructor support tool to rescue bankrupt factories (`override_team_state`, Commit `7ce99e0`).
- ✅ **Single-Column Machine Modal:** Vertically stacked machine cards with lead times and capacity bottleneck integration (Commits `fed90a2`, `35fd203`, `14afc06`, `2cb8734`).
- ✅ **Image 2 Factory Live Feed Aspect Ratio:** Enforced `2.4` aspect ratio with dynamic height clamping preventing vertical scrolling (Commit `0361da4`).
- ✅ **Cumulative Customer Satisfaction (Fill Rate):** Updated `engine.ts` to compute fill rate over cumulative sales and demand (Commit `61b2707`).
- ✅ **Demand vs Sales Graph Data Alignment:** Replaced sales proxy with "Actual Daily Sales" mapped directly to `history.sales` (Commit `4b793b0`).
- ✅ **10-Day Advance Contract Window:** Clear notification badges and auto-close countdowns for contracts.
- ✅ **Spacious Horizontal Material Steppers:** Order Quantity and Reorder Point controls with discrete integer stepping.
- ✅ **Tab Session Isolation via sessionStorage:** Prevented cross-tab credential collisions between admin and student roles (Commit `bb20e33`).
