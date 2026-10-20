# 🗺️ Architecture & Code Map

This document maps every major file and component in the repository, explaining its purpose, dependencies, and risk level.

---

## 1. Directory Tree Overview

```text
muffin-factory-game/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── db.ts             # Database adapter (PostgreSQL + memory fallback)
│   │   ├── routes/
│   │   │   ├── auth.ts           # Authentication (Login, Register, Token verify)
│   │   │   ├── licenses.ts       # Super admin license management
│   │   │   ├── middleware.ts     # JWT auth middleware
│   │   │   ├── rooms.ts          # Room creation, cohort listing, team join
│   │   │   └── scenarios.ts      # Scenario templates & presets
│   │   ├── simulation/
│   │   │   ├── __tests__/
│   │   │   │   └── engine.test.ts # 14 Jest simulation engine regression tests
│   │   │   └── engine.ts         # 100% deterministic simulation core
│   │   ├── sockets/
│   │   │   └── socketHandler.ts  # Real-time WebSocket game loop & player actions
│   │   ├── types/
│   │   │   └── index.ts          # Shared TypeScript interfaces & types
│   │   └── server.ts             # Express & HTTP server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx       # Super Admin portal
│   │   │   ├── AdminLoginPage.tsx       # Admin auth view
│   │   │   ├── DashboardTopBar.tsx      # Room code, day ticker, status indicators
│   │   │   ├── FactoryVisualization.css # Styles & aspect ratio for 3D factory feed
│   │   │   ├── FactoryVisualization.tsx # Animated conveyor, machines & visual alerts
│   │   │   ├── FinancesModal.tsx        # Financial audit ledger & cash flow breakdown
│   │   │   ├── InstructorDashboard.tsx  # Instructor room control, events & leaderboards
│   │   │   ├── InstructorLoginPage.tsx  # Instructor auth view
│   │   │   ├── InventoryPanel.tsx       # Left-column raw material management & steppers
│   │   │   ├── LandingPage.tsx          # Team login, student registration, role select
│   │   │   ├── MachinePanel.tsx         # Factory floor operations modal (single-column)
│   │   │   ├── OperationsAdvisor.tsx    # Left-column real-time hints & bottleneck warnings
│   │   │   └── ReportsPanel.tsx         # 4 analytics & report cards + modal launchers
│   │   ├── store/
│   │   │   └── gameStore.ts             # Zustand global client state & socket bindings
│   │   ├── utils/
│   │   │   └── reportPdfGenerator.ts    # jsPDF official simulation audit report generator
│   │   ├── App.tsx                      # Root component, router & responsive font scaler
│   │   ├── main.tsx                     # React DOM entry point
│   │   └── index.css                    # Tailwind CSS base & custom styles
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
└── docs/
    └── project-handover/                # Comprehensive handover documentation
```

---

## 2. Backend Modules & Risk Classification

### `backend/src/simulation/engine.ts`
- **Purpose:** Pure, 100% deterministic daily simulation state transition function (`runSimDay`).
- **Dependencies:** `backend/src/types/index.ts`.
- **Inputs:** `Room`, `TeamState`, `baseDemand`, scenario configurations.
- **Risk Level:** 🔴 **EXTREME (CRITICAL)**. Any unintentional change alters scoring, gameplay balance, capacity calculations, or test suites.
- **Key Functions:**
  - `runSimDay(...)`: Advances simulation state by 1 day.
  - `getDemandForDay(...)`: Generates daily market demand based on selected model (Fixed, Seasonal, Random, Hybrid, Custom).

### `backend/src/sockets/socketHandler.ts`
- **Purpose:** Manages WebSocket connections, room namespaces, room simulation timer ticks, player actions (`updateInventory`, `buyMachine`, `acceptContract`, etc.).
- **Dependencies:** `backend/src/simulation/engine.ts`, `backend/src/db/db.ts`.
- **Risk Level:** 🔴 **HIGH**. Manages race conditions, real-time client broadcasts, timer intervals, and team isolation.

### `backend/src/db/db.ts`
- **Purpose:** Persistence layer for users, rooms, teams, scenarios, and licenses. Automatically uses PostgreSQL if `DATABASE_URL` is set; falls back to an in-memory store for local testing without external database dependencies.
- **Risk Level:** 🟡 **MEDIUM**.

---

## 3. Frontend Modules & Responsibilities

### `frontend/src/App.tsx`
- **Purpose:** Root application shell, routing (Player, Instructor, Admin, Landing), and viewport scaling listener.
- **Key Logic:** Contains the dynamic root font-scaler (`document.documentElement.style.fontSize`), clamped strictly between `0.9` and `1.1` to prevent text collapse on small laptop displays.
- **Risk Level:** 🟡 **MEDIUM**.

### `frontend/src/components/FactoryVisualization.tsx` & `.css`
- **Purpose:** Renders the central 3D/isometric factory animation. Displays the 4 machine stations (Mixer, Oven, Icing, Packaging), conveyor belts, muffin units in motion, and breakdown alert badges.
- **Key Styling:** `.factory-scene` enforces an `aspect-ratio: 2.4` and a responsive height bound: `min-height: 180px; max-height: min(380px, calc(100vh - 425px));`.
- **Risk Level:** 🔴 **HIGH (Visual Truth)**. Must remain visually identical to `dashboard_reference_image2_truth.png`.

### `frontend/src/components/ReportsPanel.tsx`
- **Purpose:** Renders the four bottom report cards beneath the factory feed:
  1. **Performance Analytics** (Recharts graph modal).
  2. **Reports & Analytics** (Finances modal).
  3. **Academic Performance** (Rubric & score modal).
  4. **Generate PDF Report** (PDF preview & download modal).
- **Styling:** Height `h-[100px] sm:h-[105px]`, `rounded-2xl`, border colors matching card theme.
- **Risk Level:** 🟡 **MEDIUM**.

### `frontend/src/components/InventoryPanel.tsx`
- **Purpose:** Left-column raw material management for **Base Mix** and **Packaging Material**.
- **Controls:** Order Quantity ($Q$) and Reorder Point ($ROP$) steppers with `[-]` and `[+]` buttons, live on-hand indicators, in-transit tallies, and lead time labels.
- **Risk Level:** 🟡 **MEDIUM**.

### `frontend/src/components/MachinePanel.tsx`
- **Purpose:** "Factory Floor Operations" modal.
- **Layout:** Redesigned into a clean, **single-column vertical stack** (one full-width row per machine: Mixer $\rightarrow$ Oven $\rightarrow$ Icing $\rightarrow$ Packaging).
- **Controls:** Lead time badges, available/operating capacities, quantity steppers, Buy Machine button, and machine breakdown indicators.
- **Risk Level:** 🟡 **MEDIUM**.

### `frontend/src/store/gameStore.ts`
- **Purpose:** Zustand global client store. Maintains local team state, room metadata, socket connection state, active modals, and notification banners.
- **Risk Level:** 🔴 **HIGH**. Directly drives client UI reactivity.
