# ⚙️ Game Logic & Invariants

This document is the mathematical and operational specification of the simulation engine in `backend/src/simulation/engine.ts`. All formulas here are extracted directly from the verified source code.

---

## 1. Simulation Progression & Pacing
- The simulation advances in discrete unit steps called **Days** ($t = 1, 2, \dots, N$).
- Days advance on a fixed server-side tick timer (`tickRate`, typically 5 to 30 seconds per day) managed by `backend/src/sockets/socketHandler.ts`.
- When the room is paused (`status = 'paused'`), tick timers stop; players cannot advance days but can review current operations.
- The state transition function `runSimDay()` is **100% deterministic**. Given the identical state and parameters, it will produce identical output every single time.

---

## 2. Machine Capacities & Stations

### Default Machine Configurations
| Station | Code Identifier | Capacity per Machine | Purchase Cost | Daily Operating Cost | Breakdown Prob. | Breakdown Duration | Repair Cost |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mixing** | `mixing` | 100 units/day | ₹2,000 | ₹50/day | 2.0% | 2 days | ₹300 |
| **Baking** | `baking` | 80 units/day | ₹3,000 | ₹80/day | 2.0% | 2 days | ₹500 |
| **Icing** | `icing` | 120 units/day | ₹1,500 | ₹40/day | 1.5% | 1 day | ₹200 |
| **Packaging**| `packaging` | 150 units/day | ₹1,000 | ₹30/day | 1.0% | 1 day | ₹150 |

### Operating Machine Count & Available Capacity
$$\text{Running Machines}_m = \max(0, \text{Active Machines}_m - \text{Broken Machines}_m)$$
$$\text{Capacity}_m = \text{Running Machines}_m \times \text{CapacityPerMachine}_m$$

### Bottleneck Calculation
$$\text{Bottleneck Capacity} = \min_{m \in \{\text{mixing, baking, icing, packaging}\}}(\text{Capacity}_m)$$
The stage with the minimum capacity is flagged as `currentBottleneck.stage`.

---

## 3. Inventory & Production Rules

### Material Bill of Materials (BOM)
$$1 \text{ Finished Muffin} = 1 \text{ Unit Base Mix} + 1 \text{ Unit Packaging Material}$$

### Zero Packaging / Material Invariant
$$\text{Raw Material Limit} = \min(\text{OnHand}_{\text{base\_mix}}, \text{OnHand}_{\text{packaging\_material}})$$
$$\text{Actual Production} = \begin{cases} 0 & \text{if } \text{Raw Material Limit} \le 0 \\ \min(\text{Raw Material Limit}, \text{Bottleneck Capacity}) & \text{otherwise} \end{cases}$$

**Invariant:** If either Base Mix OR Packaging Material is 0, production is strictly 0. No muffins are produced and no raw material is consumed.

### Post-Production Inventory Update
$$\text{OnHand}_{\text{base\_mix}} \leftarrow \text{OnHand}_{\text{base\_mix}} - \text{Actual Production}$$
$$\text{OnHand}_{\text{packaging\_material}} \leftarrow \text{OnHand}_{\text{packaging\_material}} - \text{Actual Production}$$
$$\text{OnHand}_{\text{finished\_muffin}} \leftarrow \text{OnHand}_{\text{finished\_muffin}} + \text{Actual Production}$$

---

## 4. Reorder Point ($ROP$) & Order Quantity ($Q$) Policy
For both materials (`base_mix` and `packaging_material`):
$$\text{Inventory Position} = \text{OnHand} + \text{InTransit}$$
When:
$$\text{Inventory Position} \le ROP$$
An automatic purchase order ($PO$) is placed for quantity $Q$:
- **Arrival Day:** $t + \text{Lead Time}$
- **Lead Times:** Default 3 days for Raw Material, 2 days for Packaging (or scenario-configured).
- **Cash Flow:** The cost is deducted immediately when the order is placed:
  $$\text{Order Cost} = (Q \times \text{Material Unit Cost}) + \text{Order Fee (₹150)}$$
- **In-Transit Tracking:** $\text{InTransit} \leftarrow \text{InTransit} + Q$.

---

## 5. Sales Allocation & Revenue
Standard selling price: **₹20.00 per muffin** (`MUFFIN_SALE_PRICE`).

### Contracts
- Pre-negotiated delivery commitments: `dailyQuantity`, `priceMultiplier` (e.g. 1.25x), and `penalty` (per unfulfilled unit, e.g. ₹5/unit).
- Offer window: Contracts are offered 10 days in advance. If not accepted before `startDay`, they close.

### Allocation Strategies
Players choose one of three strategies:
1. **Contracts First (Default):** Available finished muffins are allocated to active contracts first. Leftover muffins are sold to the spot market.
2. **Market First:** Available finished muffins are sold to the spot market up to `todayDemand`. Leftover muffins fulfill contracts.
3. **Split (50/50):** Muffins are split equally between contracts and spot market. Leftovers in one pool cascade to satisfy the other.

### Penalties & Lost Sales
- Unfulfilled contract units incur immediate cash penalties:
  $$\text{Contract Penalties} = \sum (\text{Unfulfilled Units} \times \text{Contract Penalty Rate})$$
- Lost market sales:
  $$\text{Lost Market Sales} = \max(0, \text{Today Demand} - \text{Market Sales})$$
  $$\text{Lost Sales Penalty} = \text{Lost Market Sales} \times \text{Scenario Penalty Rate (default ₹2.50)}$$

---

## 6. Daily Cash Flow & Bankruptcy
$$\text{Daily Revenue} = \text{Market Revenue} + \text{Contract Revenue}$$

### Daily Expenses
$$\text{Daily Costs} = \text{Raw Mat. Purchases} + \text{Ordering Fees} + \text{Holding Cost} + \text{Machine Purchases} + \text{Machine Operating Cost} + \text{Repair Cost} + \text{Lost Sales Penalties}$$

### Holding Cost Formula
$$\text{Inventory Value} = (\text{BaseMix} \times \text{Cost}) + (\text{Packaging} \times \text{Cost}) + (\text{FinishedMuffins} \times (\text{MixCost} + \text{PackCost}))$$
$$\text{Holding Cost} = \text{Inventory Value} \times \text{Holding Rate (default 2\%)}$$

### Bankruptcy Condition
$$\text{Ending Cash} = \text{Beginning Cash} + \text{Daily Revenue} - \text{Daily Costs}$$
If $\text{Ending Cash} \le 0$:
- $\text{Cash} \leftarrow 0$
- $\text{Status} \leftarrow \text{'bankrupt'}$
- Factory operations halt, machine utilization drops to 0, and team is locked out of further production.

---

## 7. Customer Satisfaction & Fill Rate Invariant

$$\text{Fill Rate (\%)} = \frac{\sum_{d=1}^t \text{Actual Daily Sales}_d}{\sum_{d=1}^t \text{Market Demand}_d} \times 100$$
- **Crucial Invariant:** Must be calculated using **cumulative sales** over **cumulative demand** across all elapsed days, not single-day spot sales. This prevents wild artificial swings from single-day delivery dips.

---

## 8. Academic Performance Scoring Rubric (100 Points)
The academic score evaluated at each tick evaluates overall managerial capability:
1. **Cash Performance (40%):**
   $$\text{Cash Score} = \min\left(100, \max\left(0, \frac{\text{Current Cash}}{\text{Cash Target (₹3,000,000)}} \times 100\right)\right)$$
2. **Fill Rate / Customer Satisfaction (20%):** Direct cumulative fill rate percentage (capped at 100).
3. **Contract Fulfillment (15%):** Percentage of total accepted contract commitments fulfilled.
4. **Inventory Efficiency (15%):** Penalizes stockout days while rewarding healthy turnover.
5. **Capacity Planning (10%):** Balanced machine utilization score across the four stations.

$$\text{Total Score} = (0.40 \times \text{Cash}) + (0.20 \times \text{FillRate}) + (0.15 \times \text{Contract}) + (0.15 \times \text{Inventory}) + (0.10 \times \text{Capacity})$$
- $\ge 80$: 🌟 **Distinction**
- $\ge 60$: ✨ **Satisfactory**
- $< 60$: ⚠️ **Needs Review**
