# 🔮 Pending Requests & Future Work

This document tracks items discussed, roadmap features, and potential future tasks for the Muffin Factory Game.

---

## 1. Roadmap & Potential Enhancements

### 1. Dynamic Instructor Intervention Tool
- **Concept:** Allow instructors to directly adjust a specific team's cash, material inventory, or machine state during live play (e.g. providing an emergency loan or granting emergency repair parts).
- **Files Involved:** `frontend/src/components/InstructorDashboard.tsx`, `backend/src/sockets/socketHandler.ts`.
- **Status:** Discussion stage; not yet scheduled.

### 2. Frontend Chunk Code-Splitting for PDF Generator
- **Concept:** Dynamically import `jspdf` and `jspdf-autotable` in `reportPdfGenerator.ts` using `await import(...)` only when the user clicks "Generate PDF Report".
- **Benefit:** Reduces initial bundle size by ~775 kB, clearing the Vite build warning.
- **Files Involved:** `frontend/src/utils/reportPdfGenerator.ts`, `frontend/src/components/ReportsPanel.tsx`.
- **Status:** Low priority optimization; current bundle loads smoothly on modern connections.

### 3. Additional Scenario Presets
- **Concept:** Introduce specialized university scenario presets:
  - *Supply Chain Disruption:* 10-day supplier lead times with high raw material holding costs.
  - *Seasonal Demand Spike:* Sinusoidal demand peaking at 5x base demand during holidays.
  - *Zero Breakdown High-Pace:* High tick-rate speedrun mode for quick classroom demonstrations.
- **Files Involved:** `backend/src/routes/scenarios.ts`.
- **Status:** Architectural foundations are already present in `SavedScenario` schema.

---

## 2. Completed Items Log (Do Not Re-Implement)
- ✅ Spacious horizontal steppers for Order Quantity and Reorder Point.
- ✅ Single-column vertical machine cards in Factory Floor Operations.
- ✅ Prevention of machine count reduction to 0 without confirmation.
- ✅ Customer Satisfaction (fillRate) cumulative calculation fix.
- ✅ Demand vs Actual Daily Sales graph series naming and data binding.
- ✅ 10-day contract offer window and notification indicators.
- ✅ Preservation of Image 2 Factory Floor Live Feed aspect ratio (2.4) and height budget.
- ✅ Complete GitHub backup and recovery documentation.
