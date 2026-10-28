# 📜 Development History & Key Decisions

This document summarizes the chronological progress, architectural milestones, and specific bug fixes made during the development of Muffin Factory Game.

---

## 1. Major Architectural Decisions

1. **Deterministic Backend Engine (`engine.ts`):**
   - **Decision:** All simulation math, daily ticks, capacity calculations, inventory consumption, and financial debits execute exclusively on the server in `runSimDay()`.
   - **Rationale:** Prevents client-side desynchronization, cheating, and non-reproducible scoring across multiplayer cohorts.

2. **In-Memory + PostgreSQL Hybrid Database (`db.ts`):**
   - **Decision:** The database adapter initializes PostgreSQL when `DATABASE_URL` is provided, but automatically falls back to an in-memory/JSON data store for local developer testing or offline simulation.
   - **Rationale:** Allows complete zero-setup local onboarding without needing a live local PostgreSQL instance.

3. **Pure SVG/CSS Factory Visualization (`FactoryVisualization.tsx`):**
   - **Decision:** Replaced heavy canvas/WebGL libraries with standard SVG and hardware-accelerated CSS animations for the factory live feed.
   - **Rationale:** Ensures flawless 60 FPS performance on Chromebooks, mobile devices, and low-spec student laptops.

4. **Multiplayer Isolation via Socket.IO Rooms:**
   - **Decision:** Teams are isolated within specific room namespaces (`room_${roomId}` and `team_${teamId}`).
   - **Rationale:** Prevents cross-room state contamination while allowing real-time instructor telemetry and student team coordination.

5. **Session Isolation per Browser Tab (`sessionStorage`):**
   - **Decision:** Migrated client-side auth tokens from shared `localStorage` to `sessionStorage` (commit `bb20e33`).
   - **Rationale:** Prevents cross-tab admin / instructor / student credential pollution when testing multiple roles in adjacent browser tabs.

---

## 2. Chronological Log of Fixes & Commits

### Commit `777901c` (2026-10-27) — Purge 10-Minute Scenario Variants
- Purged temporary 10-minute scenario variants (`scenario_intermediate_10min_preset`, `scenario_advanced_10min_preset`) from `db.ts`, scenario API route filtering, and Instructor Dashboard calibrator cards.
- Restored focus strictly to the 3 canonical presets: **Beginner**, **Intermediate**, and **Advanced**, alongside instructor-created custom scenarios.

### Commit `04e871d` (2026-10-27) — Sequential Dynamic Numbering for Standard Presets
- Updated scenario cards in the Instructor lobby calibrator to display clean, dynamic numeric badges (1, 2, 3) for standard scenarios.

### Commits `ac09937`, `37eafb7`, `aaa897b`, `9bd0494` (2026-10-27) — UI Text Contrast & Professional Theme Toggle
- Replaced non-standard Tailwind shade utilities with accessible high-contrast colors across both light and dark modes.
- Added a professional segmented theme toggle (Light / Dark) accessible across all portals.
- Polished text readability, borders, and button states in active session rooms and the lobby creator.

### Commit `14d4f27` (2026-10-27) — Remove Admin Email Placeholder
- Sanitized `AdminLoginPage.tsx` to remove personal email references from placeholder attributes, replacing them with generic `admin@factory.com`.

### Commit `1c8efa2` (2026-10-27) — Real Arena Lobbies & Telemetry in Admin Portal
- Removed static placeholder graphs and mock welcome banners from `AdminDashboard.tsx`.
- Purged fake demo seeds (e.g., mock Harvard / Stanford / MIT demo data) so that only genuine database licenses, active arena lobbies, and live system audit logs appear.

### Commit `e66a739` (2026-10-27) — End Session Lifecycle & Concluded Session View
- Resolved simulation cleanup on room termination by unbinding Socket.IO room listeners (`leave_room` event in `socketHandler.ts`).
- Added a dedicated "Concluded Session" review state on the client so teams can review their post-game reports without getting abruptly disconnected.

### Commits `41f2794` & `b3e68db` (2026-10-26) — Direct Scenario Configuration Editing
- Added a direct "Edit Config" button on every preset and custom scenario card in the Instructor Dashboard.
- Allowed instructors to duplicate any standard preset as a copy and customize parameters across all 6 wizard steps.

### Commit `b8f918b` (2026-10-26) — Cloud Sync Indicator & Central DB Refresh
- Added cloud synchronization status badges in the Super Admin dashboard.
- Added postinstall build script to backend `package.json` for seamless zero-downtime deployment on Render.

### Commit `7235625` (2026-10-26) — Projector Board Window Separation
- Implemented dedicated window launch (`/projector`) for classroom dual-screen projection, allowing professors to present real-time factory leaderboards on the auditorium screen while maintaining control on their laptop.

### Commit `7ce99e0` (2026-10-21) — Bankrupt Factory Instructor Support & Recovery
- Added explicit instructor recovery controls (`override_team_state` socket action).
- Instructors can inject relief capital or reset inventory/cash to revive a bankrupt student team, restoring active production state.

### Commits `fed90a2`, `35fd203`, `14afc06`, `2cb8734` (2026-10-20) — Factory Floor Modal Polish
- Refined single-column vertical machine cards in `MachinePanel.tsx`.
- Eliminated text wrapping on packaging machine lead times and stepper controls.
- Corrected operating capacity display to reflect the true factory bottleneck across all 4 machine stations.
- Restored enlarged utilization gauge circles and clarified status indicators.

### Commit `0361da4` (2026-10-20) — Preservation of Image 2 Factory Live Feed Aspect Ratio
- Restored `aspect-ratio: 2.4` and dynamic height clamping in `FactoryVisualization.css`:
  ```css
  aspect-ratio: 2.4;
  min-height: 180px;
  max-height: min(380px, calc(100vh - 425px));
  ```
- Fixed card heights (`100px - 105px`) in `ReportsPanel.tsx` matching Image 2 canonical layout.

### Commit `61b2707` (2026-10-16) — Cumulative Customer Satisfaction (Fill Rate)
- Updated `engine.ts` to compute `fillRate` as cumulative units sold divided by cumulative market demand:
  $$\text{fillRate} = \frac{\sum \text{sales}}{\sum \text{demand}} \times 100$$
- Verified with multi-day Jest regression tests.

### Commit `4b793b0` (2026-10-16) — Analytics Actual Sales Series & Contract Notifications
- Replaced ambiguous "Sales Proxy" series with "Actual Daily Sales" mapped directly to `history.sales`.
- Added 10-day advance notice window for wholesale contract offers before expiration.
- Added instant client-side PDF report preview modal.

### Commit `bb20e33` (2026-10-15) — Tab Session Isolation via sessionStorage
- Separated authentication tokens per browser tab using `sessionStorage` instead of `localStorage` to prevent cross-tab session contamination between admin, instructor, and student operator accounts.
