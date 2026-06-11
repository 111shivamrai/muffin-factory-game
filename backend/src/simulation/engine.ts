import { Room, TeamState, MachineType, MaterialType, PurchaseOrder, MachineOrder, Contract, GameEvent, CashHistoryRecord, ReportMetrics, AcademicScore, MachineConfig, DemandType } from '../types/index.js';

// Base prices and costs (can be modified by events)
export const BASE_MATERIAL_COSTS = {
  base_mix: 5.0,
  packaging_material: 1.0,
  order_cost: 150.0
};

export const MUFFIN_SALE_PRICE = 20.0;

// Default machine configurations
export const DEFAULT_MACHINE_CONFIGS: Record<MachineType, MachineConfig> = {
  mixing: {
    capacityPerMachine: 100,
    purchaseCost: 2000,
    operatingCost: 50,
    breakdownProbability: 0.02,
    breakdownDuration: 2,
    repairCost: 300
  },
  baking: {
    capacityPerMachine: 80,
    purchaseCost: 3000,
    operatingCost: 80,
    breakdownProbability: 0.02,
    breakdownDuration: 2,
    repairCost: 500
  },
  icing: {
    capacityPerMachine: 120,
    purchaseCost: 1500,
    operatingCost: 40,
    breakdownProbability: 0.015,
    breakdownDuration: 1,
    repairCost: 200
  },
  packaging: {
    capacityPerMachine: 150,
    purchaseCost: 1000,
    operatingCost: 30,
    breakdownProbability: 0.01,
    breakdownDuration: 1,
    repairCost: 150
  }
};

/**
 * Executes a single day of the simulation for a specific team.
 * This runs on the server and is 100% deterministic.
 */
export function runSimDay(
  room: Room,
  teamState: TeamState,
  baseDemand: number,
  scenarioMachineSettings?: Record<MachineType, MachineConfig>,
  scenarioRawMaterialCosts?: { baseMix: number; packaging: number; orderCost: number },
  scenarioLeadTimes?: { rawMaterial: number; machineProcurement: number },
  scenarioHoldingCostRate?: number,
  scenarioPenaltyRate?: number,
  scenarioBreakdownsEnabled?: boolean
): TeamState {
  const day = room.currentDay;
  const nextState = JSON.parse(JSON.stringify(teamState)) as TeamState;

  // Track daily cash flows
  let dailyRevenue = 0;
  let dailyRawMaterialCost = 0;
  let dailyOrderingCost = 0;
  let dailyMachinePurchaseCost = 0;
  let dailyMachineOperatingCost = 0;
  let dailyHoldingCost = 0;
  let dailyRepairCost = 0;
  let dailyLostSalesPenalty = 0;

  // Parameters (resolved with defaults/scenarios)
  const mConfigs = scenarioMachineSettings || DEFAULT_MACHINE_CONFIGS;
  const holdingRate = scenarioHoldingCostRate !== undefined ? scenarioHoldingCostRate : 0.02;
  const penaltyRate = scenarioPenaltyRate !== undefined ? scenarioPenaltyRate : 2.5;
  const baseMatCosts = scenarioRawMaterialCosts ? {
    base_mix: scenarioRawMaterialCosts.baseMix,
    packaging_material: scenarioRawMaterialCosts.packaging,
    order_cost: scenarioRawMaterialCosts.orderCost
  } : BASE_MATERIAL_COSTS;
  const baseLeadTimes = scenarioLeadTimes || { rawMaterial: 3, machineProcurement: 5 };
  const breakdownsEnabled = scenarioBreakdownsEnabled !== false;

  // If already bankrupt, lock operations and carry forward state
  if (nextState.status === 'bankrupt') {
    // Just update history with current values
    nextState.history.days.push(day);
    nextState.history.cash.push(nextState.cash);
    nextState.history.revenue.push(0);
    nextState.history.demand.push(baseDemand);
    nextState.history.inventory.base_mix.push(nextState.inventory.base_mix.onHand);
    nextState.history.inventory.packaging_material.push(nextState.inventory.packaging_material.onHand);
    nextState.history.inventory.finished_muffin.push(nextState.inventory.finished_muffin.onHand);
    nextState.history.utilization.mixing.push(0);
    nextState.history.utilization.baking.push(0);
    nextState.history.utilization.icing.push(0);
    nextState.history.utilization.packaging.push(0);
    nextState.history.contractFulfillment.push(0);
    nextState.history.bottlenecks.push('None');
    nextState.history.bottleneckCapacity.push(0);
    return nextState;
  }

  // 1. Process Instructor Events
  // Resolve active modifiers from events
  let demandMultiplier = 1.0;
  let rawMaterialCostMultiplier = 1.0;
  let rawMaterialLeadTimeModifier = 0; // days to add
  let breakdownsMultiplier = 1.0;

  nextState.contracts.forEach((c: Contract) => {
    if (c.status === 'accepted') {
      c.active = (day >= c.startDay && day <= c.endDay);
      if (day > c.endDay) {
        c.status = 'completed';
        c.active = false;
      }
    } else {
      c.active = false;
    }
  });

  nextState.activeEvents.forEach((ev: GameEvent) => {
    ev.active = (day >= ev.startDay && day <= ev.endDay);
    if (ev.active) {
      if (ev.targetVariable === 'demand') {
        demandMultiplier += ev.modifier;
      } else if (ev.targetVariable === 'raw_material_cost') {
        rawMaterialCostMultiplier += ev.modifier;
      } else if (ev.targetVariable === 'lead_time') {
        rawMaterialLeadTimeModifier += Math.round(ev.modifier);
      } else if (ev.targetVariable === 'breakdowns') {
        breakdownsMultiplier += ev.modifier;
      }
    }
  });

  // Apply demand multiplier
  const todayDemand = Math.max(0, Math.round(baseDemand * demandMultiplier));

  // Apply raw material cost multipliers
  const currentMaterialCosts = {
    base_mix: baseMatCosts.base_mix * rawMaterialCostMultiplier,
    packaging_material: baseMatCosts.packaging_material * rawMaterialCostMultiplier,
    order_cost: baseMatCosts.order_cost
  };

  // 2. Process Machine Breakdowns
  // For each machine type, decrement repair timers
  const breakdownStates = nextState.breakdownStates || [];
  const activeMachineCounts: Record<MachineType, number> = {
    mixing: nextState.machines.mixing.active,
    baking: nextState.machines.baking.active,
    icing: nextState.machines.icing.active,
    packaging: nextState.machines.packaging.active
  };

  const brokenCounts: Record<MachineType, number> = {
    mixing: 0,
    baking: 0,
    icing: 0,
    packaging: 0
  };

  nextState.breakdownStates = breakdownStates.map(state => {
    // Decrement days remaining for existing broken machines
    state.daysRemaining = state.daysRemaining
      .map(days => days - 1)
      .filter(days => days > 0);
    
    brokenCounts[state.machineType] = state.daysRemaining.length;
    return state;
  });

  // Roll breakdown checks if breakdowns are enabled and machine probability is set
  if (breakdownsEnabled) {
    (Object.keys(nextState.machines) as MachineType[]).forEach(mType => {
      const config = mConfigs[mType];
      const runningCount = nextState.machines[mType].active;
      const alreadyBroken = brokenCounts[mType];
      const nonBrokenRunning = Math.max(0, runningCount - alreadyBroken);

      let newlyBroken = 0;
      for (let i = 0; i < nonBrokenRunning; i++) {
        // Roll random probability modified by events
        if (Math.random() < (config.breakdownProbability * breakdownsMultiplier)) {
          newlyBroken++;
        }
      }

      if (newlyBroken > 0) {
        let bState = nextState.breakdownStates.find(s => s.machineType === mType);
        if (!bState) {
          bState = { machineType: mType, brokenCount: 0, daysRemaining: [] };
          nextState.breakdownStates.push(bState);
        }
        for (let i = 0; i < newlyBroken; i++) {
          bState.daysRemaining.push(config.breakdownDuration);
          dailyRepairCost += config.repairCost; // Pay repair cost immediately on breakdown
        }
        bState.brokenCount = bState.daysRemaining.length;
        brokenCounts[mType] = bState.brokenCount;
      }
    });
  }

  // 3. Process Purchase Order Arrivals
  nextState.purchaseOrders.forEach((po: PurchaseOrder) => {
    if (po.status === 'transit' && po.arrivalDay <= day) {
      po.status = 'delivered';
      nextState.inventory[po.materialType].onHand += po.quantity;
      nextState.inventory[po.materialType].inTransit = Math.max(0, nextState.inventory[po.materialType].inTransit - po.quantity);
    }
  });

  // 4. Process Machine Procurement Arrivals
  nextState.machineOrders.forEach((mo: MachineOrder) => {
    if (mo.status === 'procuring' && mo.arrivalDay <= day) {
      mo.status = 'delivered';
      nextState.machines[mo.machineType].count += 1;
      nextState.machines[mo.machineType].inTransit = Math.max(0, nextState.machines[mo.machineType].inTransit - 1);
      
      // Automatically activate new machines if they were purchased
      nextState.machines[mo.machineType].active += 1;
    }
  });

  // 5. Update Inventory (Pre-production stats check)
  // Clean delivered orders from active tracking
  nextState.purchaseOrders = nextState.purchaseOrders.filter(po => po.status !== 'delivered');
  nextState.machineOrders = nextState.machineOrders.filter(mo => mo.status !== 'delivered');

  // 6. Evaluate Reorder Conditions & 7. Place Automatic Orders
  (Object.keys(nextState.inventory) as MaterialType[]).forEach(matType => {
    if (matType === 'finished_muffin') return; // Muffins aren't purchased raw materials

    const inv = nextState.inventory[matType];
    const inventoryPosition = inv.onHand + inv.inTransit;

    if (inventoryPosition <= inv.reorderPoint) {
      const orderQty = inv.orderQty;
      if (orderQty > 0) {
        // Place automatic order
        const leadTime = Math.max(1, baseLeadTimes.rawMaterial + rawMaterialLeadTimeModifier);
        const poId = `po_${day}_${matType}_${Math.random().toString(36).substr(2, 5)}`;
        
        const rawCost = orderQty * currentMaterialCosts[matType === 'base_mix' ? 'base_mix' : 'packaging_material'];
        const orderingFee = currentMaterialCosts.order_cost;
        const totalOrderCost = rawCost + orderingFee;

        // Create PO
        const newPO: PurchaseOrder = {
          id: poId,
          materialType: matType,
          quantity: orderQty,
          orderDay: day,
          arrivalDay: day + leadTime,
          cost: totalOrderCost,
          status: 'transit'
        };

        nextState.purchaseOrders.push(newPO);
        inv.inTransit += orderQty;

        // Deduct Cash immediately on placing the order (cash flow impact)
        dailyRawMaterialCost += rawCost;
        dailyOrderingCost += orderingFee;
      }
    }
  });

  // 8. Calculate Available Capacity
  // Capacity = Running Machines (active minus broken) * Capacity per machine
  const runningMixers = Math.max(0, nextState.machines.mixing.active - brokenCounts.mixing);
  const mixingCapacity = runningMixers * mConfigs.mixing.capacityPerMachine;

  const runningBakers = Math.max(0, nextState.machines.baking.active - brokenCounts.baking);
  const bakingCapacity = runningBakers * mConfigs.baking.capacityPerMachine;

  const runningIcers = Math.max(0, nextState.machines.icing.active - brokenCounts.icing);
  const icingCapacity = runningIcers * mConfigs.icing.capacityPerMachine;

  const runningPackagers = Math.max(0, nextState.machines.packaging.active - brokenCounts.packaging);
  const packagingCapacity = runningPackagers * mConfigs.packaging.capacityPerMachine;

  const capacities: Record<MachineType, number> = {
    mixing: mixingCapacity,
    baking: bakingCapacity,
    icing: icingCapacity,
    packaging: packagingCapacity
  };

  // 9. Calculate Bottleneck
  // Find bottleneck stage
  let bottleneckStage: MachineType = 'mixing';
  let minCapacity = mixingCapacity;

  (Object.keys(capacities) as MachineType[]).forEach(mType => {
    if (capacities[mType] < minCapacity) {
      minCapacity = capacities[mType];
      bottleneckStage = mType;
    }
  });

  nextState.currentBottleneck = {
    stage: bottleneckStage.charAt(0).toUpperCase() + bottleneckStage.slice(1),
    capacity: minCapacity
  };

  // 10. Consume Raw Materials & 11. Produce Finished Goods
  // 1 muffin requires 1 mix + 1 packaging material
  const baseMixOnHand = nextState.inventory.base_mix.onHand;
  const packagingOnHand = nextState.inventory.packaging_material.onHand;

  // Maximum production is limited by raw materials and bottleneck capacity
  const rawMaterialLimit = Math.min(baseMixOnHand, packagingOnHand);
  const actualProduction = Math.min(rawMaterialLimit, minCapacity);

  // Consume materials
  nextState.inventory.base_mix.onHand -= actualProduction;
  nextState.inventory.packaging_material.onHand -= actualProduction;

  // Produce muffins
  nextState.inventory.finished_muffin.onHand += actualProduction;

  // 12. Allocate to Contracts & 13. Allocate to Market Demand
  // Gather active contract targets
  const activeContracts = nextState.contracts.filter(c => c.active);
  let totalContractTarget = activeContracts.reduce((sum, c) => sum + c.dailyQuantity, 0);

  // Read operator allocation strategies
  // In the teamState, let's look for user priority. Default: Contracts First.
  // We will support a simple priority field `allocationStrategy` = 'contracts_first' | 'market_first' | 'split'
  const strategy = (nextState as any).allocationStrategy || 'contracts_first';

  let contractSales = 0;
  let marketSales = 0;
  let contractPenalties = 0;

  const totalMuffinsAvailable = nextState.inventory.finished_muffin.onHand;
  let remainingMuffins = totalMuffinsAvailable;

  // Reset today's fulfillment
  nextState.contracts.forEach(c => {
    c.fulfilledToday = 0;
  });

  if (strategy === 'contracts_first') {
    // 1. Fulfil contracts
    activeContracts.forEach(c => {
      const allocated = Math.min(remainingMuffins, c.dailyQuantity);
      c.fulfilledToday = allocated;
      c.totalFulfilled += allocated;
      c.totalTarget += c.dailyQuantity;
      contractSales += allocated;
      remainingMuffins -= allocated;

      // Unfulfilled portion incurs penalty
      const unfulfilled = c.dailyQuantity - allocated;
      if (unfulfilled > 0) {
        contractPenalties += unfulfilled * c.penalty;
      }
    });

    // 2. Sell remainder to market
    const soldToMarket = Math.min(remainingMuffins, todayDemand);
    marketSales += soldToMarket;
    remainingMuffins -= soldToMarket;

  } else if (strategy === 'market_first') {
    // 1. Sell to market first
    const soldToMarket = Math.min(remainingMuffins, todayDemand);
    marketSales += soldToMarket;
    remainingMuffins -= soldToMarket;

    // 2. Fulfil contracts with remainder
    activeContracts.forEach(c => {
      const allocated = Math.min(remainingMuffins, c.dailyQuantity);
      c.fulfilledToday = allocated;
      c.totalFulfilled += allocated;
      c.totalTarget += c.dailyQuantity;
      contractSales += allocated;
      remainingMuffins -= allocated;

      const unfulfilled = c.dailyQuantity - allocated;
      if (unfulfilled > 0) {
        contractPenalties += unfulfilled * c.penalty;
      }
    });
  } else {
    // split equal
    // Split available muffins 50/50 between market and contract targets
    const halfAvailable = Math.floor(totalMuffinsAvailable / 2);
    let marketPool = Math.min(halfAvailable, todayDemand);
    let contractPool = totalMuffinsAvailable - marketPool;

    // Market allocation
    marketSales += marketPool;
    remainingMuffins -= marketPool;

    // Contract allocation
    activeContracts.forEach(c => {
      const allocated = Math.min(contractPool, c.dailyQuantity);
      c.fulfilledToday = allocated;
      c.totalFulfilled += allocated;
      c.totalTarget += c.dailyQuantity;
      contractSales += allocated;
      contractPool -= allocated;
      remainingMuffins -= allocated;

      const unfulfilled = c.dailyQuantity - allocated;
      if (unfulfilled > 0) {
        contractPenalties += unfulfilled * c.penalty;
      }
    });

    // If there is leftover contract pool, sell to market, or vice versa
    if (contractPool > 0 && marketSales < todayDemand) {
      const extraMarket = Math.min(contractPool, todayDemand - marketSales);
      marketSales += extraMarket;
      remainingMuffins -= extraMarket;
    }
  }

  // Deduct sold muffins from on hand inventory
  const totalSold = contractSales + marketSales;
  nextState.inventory.finished_muffin.onHand = Math.max(0, totalMuffinsAvailable - totalSold);

  // 14. Calculate Lost Sales
  const lostMarketSales = Math.max(0, todayDemand - marketSales);
  const lostContractSales = Math.max(0, totalContractTarget - contractSales);
  const totalLostSales = lostMarketSales + lostContractSales;

  // 15. Calculate Revenue
  // Market sells at base price. Contracts sell at multiplier.
  const marketRev = marketSales * MUFFIN_SALE_PRICE;
  let contractRev = 0;
  activeContracts.forEach(c => {
    contractRev += c.fulfilledToday * MUFFIN_SALE_PRICE * c.priceMultiplier;
  });

  dailyRevenue = marketRev + contractRev;

  // 16. Calculate Costs
  // Machine Operating Costs
  (Object.keys(nextState.machines) as MachineType[]).forEach(mType => {
    const activeCount = nextState.machines[mType].active;
    const config = mConfigs[mType];
    dailyMachineOperatingCost += activeCount * config.operatingCost;
  });

  // Holding Costs
  // Inventory Value = base mix * base_cost + packaging * packaging_cost + muffins * sales_price (cost value or sale value, let's use purchase cost value for raw materials, and purchase cost value for muffin raw ingredients, which is 5 + 1 = 6 per muffin)
  const baseMixVal = nextState.inventory.base_mix.onHand * currentMaterialCosts.base_mix;
  const packVal = nextState.inventory.packaging_material.onHand * currentMaterialCosts.packaging_material;
  const muffinVal = nextState.inventory.finished_muffin.onHand * (currentMaterialCosts.base_mix + currentMaterialCosts.packaging_material);
  const totalInventoryValue = baseMixVal + packVal + muffinVal;
  dailyHoldingCost = totalInventoryValue * holdingRate;

  // Lost Sales Penalties
  dailyLostSalesPenalty = (lostMarketSales * penaltyRate) + contractPenalties;

  // Process machine purchase costs from any purchases initiated today
  // Note: operator actions (like buyMachine) will immediately decrement cash OR we accrue it here.
  // The spec says "Ending Cash = Beginning Cash + Revenue - Raw Material Costs - Ordering Costs - Holding Costs - Machine Purchase Costs - Machine Operating Costs - Repair Costs - Lost Sales Penalties"
  // When an operator buys a machine, we can add it to dailyMachinePurchaseCost and subtract it from cash, which is added to machineOrders.
  // To sync this, any machine bought today by operator will be pushed into nextState.machineOrders, and its cost accumulated here.
  // Let's check machineOrders created on "day"
  nextState.machineOrders.forEach(mo => {
    if (mo.orderDay === day) {
      dailyMachinePurchaseCost += mo.cost;
    }
  });

  // Calculate Net Profit
  const totalDailyCosts = dailyRawMaterialCost + dailyOrderingCost + dailyHoldingCost + dailyMachinePurchaseCost + dailyMachineOperatingCost + dailyRepairCost + dailyLostSalesPenalty;
  const dailyProfit = dailyRevenue - totalDailyCosts;

  // 17. Update Cash (and Bankruptcy check)
  const startingCash = nextState.cash;
  const endingCash = startingCash + dailyProfit;

  if (endingCash <= 0) {
    nextState.cash = 0;
    nextState.status = 'bankrupt';
  } else {
    nextState.cash = Number(endingCash.toFixed(2));
  }

  // Push Cash History
  const cashRecs: CashHistoryRecord[] = [
    { day, type: 'revenue', amount: dailyRevenue, endingCash: nextState.cash },
    { day, type: 'raw_material_cost', amount: dailyRawMaterialCost, endingCash: nextState.cash },
    { day, type: 'ordering_cost', amount: dailyOrderingCost, endingCash: nextState.cash },
    { day, type: 'machine_purchase', amount: dailyMachinePurchaseCost, endingCash: nextState.cash },
    { day, type: 'machine_operating', amount: dailyMachineOperatingCost, endingCash: nextState.cash },
    { day, type: 'holding_cost', amount: dailyHoldingCost, endingCash: nextState.cash },
    { day, type: 'repair_cost', amount: dailyRepairCost, endingCash: nextState.cash },
    { day, type: 'penalty', amount: dailyLostSalesPenalty, endingCash: nextState.cash }
  ];
  
  if (!nextState.cashHistory) nextState.cashHistory = [];
  nextState.cashHistory.push(...cashRecs.filter(r => r.amount > 0));

  // 18. Update Reports & History
  if (!nextState.history) {
    nextState.history = {
      days: [], cash: [], revenue: [], demand: [],
      inventory: { base_mix: [], packaging_material: [], finished_muffin: [] },
      utilization: { mixing: [], baking: [], icing: [], packaging: [] },
      contractFulfillment: [], bottlenecks: [], bottleneckCapacity: []
    };
  }

  nextState.history.days.push(day);
  nextState.history.cash.push(nextState.cash);
  nextState.history.revenue.push(dailyRevenue);
  nextState.history.demand.push(todayDemand);
  nextState.history.inventory.base_mix.push(nextState.inventory.base_mix.onHand);
  nextState.history.inventory.packaging_material.push(nextState.inventory.packaging_material.onHand);
  nextState.history.inventory.finished_muffin.push(nextState.inventory.finished_muffin.onHand);

  // Machine utilizations: Actual Production / Available Capacity
  const activeMixerCap = runningMixers * mConfigs.mixing.capacityPerMachine;
  const mixUtil = activeMixerCap > 0 ? (actualProduction / activeMixerCap) : 0;
  nextState.history.utilization.mixing.push(Math.round(mixUtil * 100));

  const activeBakerCap = runningBakers * mConfigs.baking.capacityPerMachine;
  const bakeUtil = activeBakerCap > 0 ? (actualProduction / activeBakerCap) : 0;
  nextState.history.utilization.baking.push(Math.round(bakeUtil * 100));

  const activeIceCap = runningIcers * mConfigs.icing.capacityPerMachine;
  const iceUtil = activeIceCap > 0 ? (actualProduction / activeIceCap) : 0;
  nextState.history.utilization.icing.push(Math.round(iceUtil * 100));

  const activePackCap = runningPackagers * mConfigs.packaging.capacityPerMachine;
  const packUtil = activePackCap > 0 ? (actualProduction / activePackCap) : 0;
  nextState.history.utilization.packaging.push(Math.round(packUtil * 100));

  // Contract fulfillment % today
  const contractFulfillPct = totalContractTarget > 0 ? (contractSales / totalContractTarget) * 100 : 100;
  nextState.history.contractFulfillment.push(Math.round(contractFulfillPct));

  // Bottleneck
  nextState.history.bottlenecks.push(nextState.currentBottleneck.stage);
  nextState.history.bottleneckCapacity.push(nextState.currentBottleneck.capacity);

  // Compute overall reports
  const totalDays = nextState.history.days.length;
  const totalRevenue = nextState.history.revenue.reduce((a, b) => a + b, 0);
  
  // Aggregate cost items from history
  let totalCosts = 0;
  nextState.cashHistory.forEach(ch => {
    if (ch.type !== 'revenue') totalCosts += ch.amount;
  });

  const totalDemand = nextState.history.demand.reduce((a, b) => a + b, 0);
  const totalMarketSales = totalRevenue / MUFFIN_SALE_PRICE; // Approx
  const fillRate = totalDemand > 0 ? (totalSold / totalDemand) * 100 : 100;

  // Average inventory
  const avgBaseMix = nextState.history.inventory.base_mix.reduce((a, b) => a + b, 0) / totalDays;
  const avgPack = nextState.history.inventory.packaging_material.reduce((a, b) => a + b, 0) / totalDays;
  const avgMuffin = nextState.history.inventory.finished_muffin.reduce((a, b) => a + b, 0) / totalDays;
  const averageInventory = avgBaseMix + avgPack + avgMuffin;

  // Inventory turnover = COGS (raw materials consumed + operating costs) / average inventory value
  // For simplicty: total production / average inventory
  const totalProduction = nextState.history.revenue.reduce((a, b) => a + b, 0) / MUFFIN_SALE_PRICE; // proxy for COGS volume
  const inventoryTurnover = averageInventory > 0 ? totalProduction / averageInventory : 0;

  // Stockout days: days where raw materials or finished inventory was 0 and lost sales occurred
  let stockoutDays = 0;
  for (let i = 0; i < totalDays; i++) {
    const isOut = nextState.history.inventory.base_mix[i] === 0 || 
                  nextState.history.inventory.packaging_material[i] === 0 ||
                  (nextState.history.demand[i] > 0 && nextState.history.inventory.finished_muffin[i] === 0);
    if (isOut) stockoutDays++;
  }

  // Contract Fulfillment
  let totalContractFulfillPct = 100;
  let contractTargetSum = 0;
  let contractFulfilledSum = 0;
  nextState.contracts.forEach(c => {
    contractTargetSum += c.totalTarget;
    contractFulfilledSum += c.totalFulfilled;
  });
  if (contractTargetSum > 0) {
    totalContractFulfillPct = (contractFulfilledSum / contractTargetSum) * 100;
  }

  const overallUtil: Record<MachineType, number> = {
    mixing: Math.round(nextState.history.utilization.mixing.reduce((a, b) => a + b, 0) / totalDays),
    baking: Math.round(nextState.history.utilization.baking.reduce((a, b) => a + b, 0) / totalDays),
    icing: Math.round(nextState.history.utilization.icing.reduce((a, b) => a + b, 0) / totalDays),
    packaging: Math.round(nextState.history.utilization.packaging.reduce((a, b) => a + b, 0) / totalDays)
  };

  nextState.report = {
    revenue: Number(totalRevenue.toFixed(2)),
    costs: Number(totalCosts.toFixed(2)),
    profit: Number((totalRevenue - totalCosts).toFixed(2)),
    fillRate: Number(fillRate.toFixed(1)),
    lostSales: totalDemand - totalSold,
    inventoryTurnover: Number(inventoryTurnover.toFixed(2)),
    averageInventory: Number(averageInventory.toFixed(1)),
    stockoutDays,
    utilization: overallUtil,
    contractFulfillment: Number(totalContractFulfillPct.toFixed(1)),
    finalCash: nextState.cash
  };

  // 19. Update Academic Metrics
  // Cash Performance (40%): normalized score based on target (e.g. ₹5,000,000 cash target)
  const CASH_TARGET = 3000000;
  const cashScore = Math.min(100, Math.max(0, (nextState.cash / CASH_TARGET) * 100));

  // Fill Rate (20%): direct fill rate percentage
  const fillRateScore = Math.min(100, nextState.report.fillRate);

  // Contract Fulfillment (15%): direct contract fulfillment percentage
  const contractScore = Math.min(100, nextState.report.contractFulfillment);

  // Inventory Efficiency (15%): based on low stockout days relative to total days
  const stockoutRatio = totalDays > 0 ? (stockoutDays / totalDays) : 0;
  const inventoryScore = Math.max(0, 100 - (stockoutRatio * 150) + Math.min(20, inventoryTurnover * 2));

  // Capacity Planning (10%): based on average utilization. High utilization is good, but 100% bottleneck is risky.
  // Balanced utility: mean of all stations' utilization
  const meanUtil = (overallUtil.mixing + overallUtil.baking + overallUtil.icing + overallUtil.packaging) / 4;
  // If bottleneck utilization is near 100%, planning was tight but good. If too low, over-capacitated.
  const capacityScore = Math.min(100, meanUtil * 1.2);

  const totalScore = (cashScore * 0.40) + (fillRateScore * 0.20) + (contractScore * 0.15) + (inventoryScore * 0.15) + (capacityScore * 0.10);

  nextState.academicScore = {
    cashPerformance: Math.round(cashScore),
    fillRateScore: Math.round(fillRateScore),
    contractScore: Math.round(contractScore),
    inventoryScore: Math.round(inventoryScore),
    capacityScore: Math.round(capacityScore),
    totalScore: Math.round(totalScore)
  };

  return nextState;
}

/**
 * Helper to compute the demand for a given day based on configuration
 */
export function getDemandForDay(
  day: number,
  config: {
    type: DemandType;
    baseVal: number;
    amplitude: number;
    period: number;
    randomNoise: number;
    customSchedule: number[];
  }
): number {
  const { type, baseVal, amplitude, period, randomNoise, customSchedule } = config;
  
  let demand = baseVal;
  
  if (type === 'fixed') {
    demand = baseVal;
  } else if (type === 'seasonal') {
    // Sine wave seasonality
    demand = baseVal + amplitude * Math.sin((2 * Math.PI * day) / period);
  } else if (type === 'random') {
    // Pure random uniform noise around base
    const noise = (Math.random() * 2 - 1) * randomNoise * baseVal;
    demand = baseVal + noise;
  } else if (type === 'hybrid') {
    // Seasonal + random noise
    const seasonal = baseVal + amplitude * Math.sin((2 * Math.PI * day) / period);
    const noise = (Math.random() * 2 - 1) * randomNoise * seasonal;
    demand = seasonal + noise;
  } else if (type === 'custom') {
    if (customSchedule && customSchedule.length > 0) {
      // Safe boundary check
      const idx = Math.min(customSchedule.length - 1, Math.max(0, day - 1));
      demand = customSchedule[idx];
    } else {
      demand = baseVal;
    }
  }

  // Ensure demand is non-negative
  return Math.max(0, Math.round(demand));
}
