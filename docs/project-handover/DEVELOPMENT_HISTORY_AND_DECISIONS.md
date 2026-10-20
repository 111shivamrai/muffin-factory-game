# 📜 Development History & Key Decisions

This document summarizes the chronological progress, architectural milestones, and specific bug fixes made during the development of Muffin Factory Game.

---

## 1. Major Architectural Decisions

1. **Deterministic Backend Engine (`engine.ts`):**
   - **Decision:** All simulation math, daily ticks, capacity calculations, inventory consumption, and financial debits execute exclusively on the server in `runSimDay()`.
   - **Rationale:** Prevents client-side desynchronization, cheating, and non-reproducible scoring across multiplayer cohorts.

2. **In-Memory + PostgreSQL Hybrid Database (`db.ts`):**
   - **Decision:** The database adapter initializes PostgreSQL when `DATABASE_URL` is provided, but automatically falls back to an in-memory data store for local developer testing or offline simulation.
   - **Rationale:** Allows complete zero-setup local onboarding without needing a live local PostgreSQL instance.

3. **Pure SVG/CSS Factory Visualization (`FactoryVisualization.tsx`):**
   - **Decision:** Replaced heavy canvas/WebGL libraries with standard SVG and hardware-accelerated CSS animations for the factory live feed.
   - **Rationale:** Ensures flawless 60 FPS performance on Chromebooks, mobile devices, and low-spec student laptops.

---

## 2. Chronological Log of Recent Fixes (Commit History)

### Commit `edff348` — Material Steppers, 4 Cards & Min Machine Count
- Restored spacious horizontal stepper controls for `Order Quantity` and `Reorder Point` in `InventoryPanel.tsx`.
- Formatted the four report cards in `ReportsPanel.tsx` with dedicated gradient icons.
- Enforced machine quantity restriction preventing machine counts from dropping to zero.

### Commit `61b2707` — Cumulative Customer Satisfaction (Fill Rate)
- **Problem:** Players fulfilling 70%–80% of total demand were seeing single-digit satisfaction scores because fill rate was computed using only single-day spot sales.
- **Fix:** Updated `engine.ts` to compute `fillRate` as cumulative units sold divided by cumulative market demand:
  $$\text{fillRate} = \frac{\sum \text{sales}}{\sum \text{demand}} \times 100$$
- Added Jest unit tests confirming fill rate stability over multi-day simulation runs.

### Commit `4b793b0` — Analytics Actual Sales Series & Contract Notifications
- Replaced the confusing "Sales Proxy" series in Performance Analytics with "Actual Daily Sales".
- Synced the Recharts blue series directly to `history.sales`.
- Added a 10-day advance notice window for contract offers before auto-closing.
- Added instant PDF report preview modal before download.

### Commit `32218b8` — Single-Column Factory Floor Modal
- Replaced the two-column grid in `MachinePanel.tsx` with a single-column vertical stack (Mixer $\rightarrow$ Oven $\rightarrow$ Icing $\rightarrow$ Packaging).
- Added lead time badges, available/operating capacities, and dedicated purchase steppers per row.

### Commit `0361da4` — Preserve Image 2 Factory Live Feed & Responsive Budget
- **Problem:** Prior attempt compressed `.factory-scene` to a 24vh strip (Image 1), squashing machine graphics and causing visual imbalance.
- **Fix:** Restored `aspect-ratio: 2.4` and set intelligent height constraint:
  ```css
  aspect-ratio: 2.4;
  min-height: 180px;
  max-height: min(380px, calc(100vh - 425px));
  ```
- Restored card heights (`100px - 105px`) in `ReportsPanel.tsx` matching Image 2 exactly.
- Clamped font scaling in `App.tsx` between `0.9` and `1.1` to prevent text collapse on small laptop viewports.
