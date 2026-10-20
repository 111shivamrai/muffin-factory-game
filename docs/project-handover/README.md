# 🧁 Muffin Factory Game — Project Handover & Knowledge Base

Welcome to the **Muffin Factory Game** repository. This document is the starting point for any future developer or AI coding assistant (including Antigravity) picking up development on this project.

---

## 📌 Start Here: Essential Facts

- **Project Name:** Muffin Factory Game (Muffin Mega Factory)
- **Primary Live Deployed Website:** [https://muffin-factory-game.vercel.app/](https://muffin-factory-game.vercel.app/)
- **Backend API & WebSocket Server:** [https://muffin-factory-game.onrender.com](https://muffin-factory-game.onrender.com)
- **GitHub Repository:** [https://github.com/111shivamrai/muffin-factory-game](https://github.com/111shivamrai/muffin-factory-game)
- **Primary Branch:** `main`
- **Handover Verified Commit:** `0361da4` (and documentation checkpoint commit)
- **Core Technology Stack:**
  - **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, jsPDF + autotable, Socket.IO client, Zustand
  - **Backend:** Node.js 20, TypeScript, Express, Socket.IO, PostgreSQL (`pg`) with automatic in-memory fallback, tsx, Jest

---

## 🚨 The Non-Negotiable Rule for Future Development

> **PRESERVE EXISTING GAME BEHAVIOR UNLESS EXPLICITLY AUTHORIZED.**
> 
> This is a live startup project used for academic business simulation and competitive education. Never change simulation math, production formulas, capacity calculations, inventory consumption, demand generation, contract terms, financial rules, scoring models, WebSocket schemas, or multiplayer isolation unless the project owner explicitly requests that specific change.
> 
> Never replace working features with mock data or placeholders. Always read the real code and verify with tests before and after modifications.

---

## 📂 Reading Order for a Fresh Development Session

To get fully up to speed without needing prior chat context, read the documents in this directory in the following order:

1. **[`START_HERE_FOR_FUTURE_ANTIGRAVITY.md`](./START_HERE_FOR_FUTURE_ANTIGRAVITY.md)**  
   *Immediate 5-step operational protocol for fresh sessions.*
2. **[`OWNER_REQUIREMENTS_AND_NON_NEGOTIABLES.md`](./OWNER_REQUIREMENTS_AND_NON_NEGOTIABLES.md)**  
   *Owner's working style, principles, strict constraints, and workflow preferences.*
3. **[`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)**  
   *High-level overview of the game, pedagogy, gameplay loop, and user roles.*
4. **[`ARCHITECTURE_AND_CODE_MAP.md`](./ARCHITECTURE_AND_CODE_MAP.md)**  
   *Complete file-by-file breakdown of frontend, backend, routes, sockets, and state stores.*
5. **[`GAME_LOGIC_AND_INVARIANTS.md`](./GAME_LOGIC_AND_INVARIANTS.md)**  
   *Exhaustive specification of the deterministic daily simulation engine, formulas, and edge cases.*
6. **[`FEATURES_AND_UI_MAP.md`](./FEATURES_AND_UI_MAP.md)**  
   *Visual hierarchy, modals, stepper controls, responsive rules, and visual references.*
7. **[`SETUP_AND_RECOVERY.md`](./SETUP_AND_RECOVERY.md)**  
   *Step-by-step instructions to clone, install, configure environment variables, and run locally.*
8. **[`DEVELOPMENT_HISTORY_AND_DECISIONS.md`](./DEVELOPMENT_HISTORY_AND_DECISIONS.md)**  
   *Chronological record of recent features, UI iterations, bug fixes, and architectural choices.*
9. **[`CURRENT_STATE_AND_KNOWN_ISSUES.md`](./CURRENT_STATE_AND_KNOWN_ISSUES.md)**  
   *Honest audit of what is verified working, test results, build status, and known limitations.*
10. **[`SAFE_CHANGE_WORKFLOW.md`](./SAFE_CHANGE_WORKFLOW.md)**  
    *14-step checklist to follow before submitting or committing any change.*
11. **[`TESTING_AND_RELEASE_CHECKLIST.md`](./TESTING_AND_RELEASE_CHECKLIST.md)**  
    *Verification checklist covering backend Jest tests, Vite builds, and UI responsiveness.*
12. **[`PENDING_REQUESTS_AND_FUTURE_WORK.md`](./PENDING_REQUESTS_AND_FUTURE_WORK.md)**  
    *Pending enhancements, roadmap items, and previously discussed ideas.*
13. **[`HANDOVER_CHECKPOINT.md`](./HANDOVER_CHECKPOINT.md)**  
    *Exact cryptographic and operational checkpoint of this repository at handover time.*

---

## ⚡ Quick Start Commands

```bash
# 1. Clone repository
git clone https://github.com/111shivamrai/muffin-factory-game.git
cd muffin-factory-game

# 2. Install backend & run tests
cd backend
npm install
npm test
npm run build

# 3. Install frontend & test build
cd ../frontend
npm install
npm run build

# 4. Run locally (in two separate terminals)
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```
