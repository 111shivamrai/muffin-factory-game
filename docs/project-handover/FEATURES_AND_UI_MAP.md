# 🖥️ Features & UI Map

This document catalogs every major UI element, modal, control, and visual standard across the player dashboard and operations views.

---

## 1. Visual Standards & Truth Reference

### Source of Truth: Image 2
Refer to `docs/project-handover/assets/dashboard_reference_image2_truth.png`.
- **Top Header:** Clean bar with Team Name, Current Cash, Room Code, Simulation Day, Tick Pacing, and Status Badge.
- **Left Column:** Raw Material Management (with spacious horizontal stepper controls) and Operations Advisor.
- **Center / Right Top:** Prominent **Factory Floor Live Feed** (`aspect-ratio: 2.4`).
- **Center / Right Bottom:** Four distinct, balanced report cards in a 2x2 grid.

### The Negative Reference: Image 1 (Rejected)
Refer to `docs/project-handover/assets/dashboard_reference_image1_incorrect_compressed.png`.
- **Failure Mode:** Squashing the factory animation into a 160px–200px strip and reducing cards into tiny unreadable boxes. **Never reproduce this.**

---

## 2. Factory Floor Live Feed (`FactoryVisualization.tsx`)
- Renders an interactive isometric animated bakery.
- Displays 4 stations:
  1. **Mixer Station:** Rotating blender arms mixing raw flour and milk.
  2. **Oven Station:** Heated baking chamber with glow effect.
  3. **Icing Station:** Precision nozzle dispensing chocolate and vanilla icing.
  4. **Packaging Station:** Automated box packing and sealing.
- **Live Overlays:**
  - Active machine counts (`1 Active`, `2 Active`).
  - Breakdown status: Flashing amber/red badge with countdown days (`⚠️ Breakdown (1d left)`).
  - Material on-hand badges and conveyor flow rate indicator.
- **CSS Constraint (`FactoryVisualization.css`):**
  ```css
  .factory-scene {
    aspect-ratio: 2.4;
    min-height: 180px;
    max-height: min(380px, calc(100vh - 425px));
  }
  ```

---

## 3. Four Dashboard Report Cards (`ReportsPanel.tsx`)

Rendered in a 2x2 grid directly below the Factory Floor Live Feed.

### 1. Performance Analytics
- **Icon:** `TrendingUp` in emerald gradient container.
- **Badge:** `{report.fillRate}% Fill`.
- **Bottom Summary:** `4 Live Graphs` tag + chevron link.
- **Click Action:** Opens the Performance Analytics Modal featuring the Recharts graph.
  - **Graph Lines:** Orange line (`Market Demand`) and Blue line (`Actual Daily Sales`).

### 2. Reports & Analytics
- **Icon:** `Receipt` in amber gradient container.
- **Badge:** Dynamic fill percentage.
- **Bottom Summary:** `₹{profit} Profit` + chevron link.
- **Click Action:** Opens the `FinancesModal` displaying cash flow audit ledger.

### 3. Academic Performance
- **Icon:** `GraduationCap` in indigo gradient container.
- **Badge:** `{totalScore}/100`.
- **Bottom Summary:** Distinction/Satisfactory pill (`🌟 Distinction` or `✨ Satisfactory`).
- **Click Action:** Opens Academic Rubric Modal breaking down the 5 weighted scoring pillars.

### 4. Generate PDF Report
- **Icon:** `Download` in emerald gradient container.
- **Badge:** `Official PDF`.
- **Bottom Summary:** `Audit Ledger` tag.
- **Click Action:** Opens the PDF Preview Modal and initiates jsPDF client-side document export.

---

## 4. Raw Material Management Controls (`InventoryPanel.tsx`)

Located in the left sidebar with tabs for **Muffin Mix** and **Packaging Material**.
- **Spacious Stepper Control:**
  - Format: `[ − ]` | `Current Value` | `[ + ]`
  - Step increment: Typically 500 units per click.
  - Input allowlist: Numeric input with instant client validation and debounce to socket.
- **Indicators:**
  - Material On Hand (units).
  - In-Transit Orders count and expected arrival day.
  - Supplier Lead Time (days).
  - Order Fee (₹150) and Unit Cost.

---

## 5. Factory Floor Operations Modal (`MachinePanel.tsx`)

Accessed via the "Factory Floor Operations" button.
- **Single-Column Vertical Layout:**
  - One full-width row per machine:
    1. **Mixer Machine**
    2. **Oven Machine**
    3. **Icing Machine**
    4. **Packaging Machine**
- **Information within each Row:**
  - Station icon & title.
  - Active vs. Total owned count.
  - Available capacity vs Operating capacity (units/day).
  - Machine Procurement Lead Time badge (`🚚 5 Days`).
  - Purchase cost (e.g. ₹2,000).
  - Machine purchase quantity stepper: `[ − ] [ qty ] [ + ]`.
  - Machine Utilization progress bar (`0% - 100%`).
  - **Machine Reduction Restriction:** The interface prevents buying negative quantities or taking actions that reduce active machine counts below 1 without explicit operator confirmation.
