# 🛡️ Owner Requirements & Non-Negotiables

This document encapsulates the direct instructions, operating constraints, and working preferences established by the project owners, **Shivam Rai** and **Arya Jain**. Every contributor or AI pair programmer must adhere strictly to these principles.

---

## 1. Core Philosophy: This is a Real Startup Project
The **Muffin Factory Game** is not a toy demo, prototype, or tutorial project. It is an active business simulation platform deployed live and used in educational / academic settings.
- **Do not break deployed games:** Code changes must be backward-compatible with active rooms and sessions.
- **Zero Hallucination:** Never claim a feature is working or verified unless you ran the build, executed tests, or inspected the rendered UI.
- **No Mock Replacements:** Never replace live game state, simulation data, or working calculations with fake static data or placeholder components.

---

## 2. Non-Negotiable Rules

### Rule 1: Preserve Working Game Logic
Unless the owner explicitly asks to change a game rule, equation, or parameter:
- Do NOT modify the simulation engine (`backend/src/simulation/engine.ts`).
- Do NOT change production formulas, bottleneck calculations, capacity logic, or lead times.
- Do NOT change demand generation, pricing, sales allocations, or holding cost formulas.
- Do NOT alter financial calculations, bankruptcy checks, or academic scoring rubrics.
- Do NOT alter WebSocket communication contracts, event payloads, or room isolation.

### Rule 2: Minimal & Targeted Changes
- Modify only the exact components or files required to fulfill the task.
- Do not refactor surrounding code or re-architect working modules just because "it could be written differently".
- Avoid sweeping styling rewrites. Preserve existing design tokens, typography, and color palettes.

### Rule 3: Visual & Proportional Preservation
- **Dashboard Source of Truth:** The dashboard layout in `docs/project-handover/assets/dashboard_reference_image2_truth.png` is the canonical design.
- The **Factory Floor Live Feed** must remain large, prominent, and visually impressive. It must maintain its natural aspect ratio (`2.4`) and must never be compressed into a narrow strip (as happened in the rejected Image 1).
- The 4 bottom-right report cards (**Performance Analytics**, **Reports & Analytics**, **Academic Performance**, **Generate PDF Report**) must maintain balanced dimensions (`100px - 105px`), clear typography, and crisp badges.
- The entire dashboard must fit standard laptop and desktop screens (1280x720, 1366x768, 1440x900, 1920x1080) without vertical page scrollbars.

### Rule 4: Action-Oriented Working Style
- The owner expects the assistant to inspect the actual code, make the changes, run tests, verify the build, and report concrete results.
- Do not stop after presenting an outline or plan when given an implementation prompt. Implement the change and provide the verified outcome.

---

## 3. Data Protection & Git Hygiene
- **Never commit secrets:** Never commit `.env`, passwords, JWT secrets, database connection strings with credentials, or personal access tokens.
- **Clean Git History:** Write descriptive, conventional commit messages (e.g., `fix(ui): ...`, `feat(simulation): ...`).
- **Never force push:** Never use `git push --force` on `main` or overwrite remote commits.
- **Always verify build:** Run `npm --prefix backend test`, `npm --prefix backend run build`, and `npm --prefix frontend run build` before pushing.
