import { runSimDay, getDemandForDay, DEFAULT_MACHINE_CONFIGS } from '../engine.js';
import { Room, TeamState, MachineType, MaterialType, SavedScenario } from '../../types/index.js';

// Setup fake room
const mockRoom: Room = {
  id: 'room_test_123',
  code: 'TESTRO',
  name: 'Test Classroom',
  status: 'active',
  difficulty: 'beginner',
  tickRate: 8,
  currentDay: 1,
  maxDays: 30,
  createdAt: new Date(),
  createdBy: 'user_instructor_001'
};

// Setup dummy scenario config
const mockScenario: SavedScenario = {
  id: 'scenario_test_preset',
  name: 'Test Scenario',
  description: 'Test description',
  learningObjective: 'Test objectives.',
  instructorNotes: 'Instructor notes.',
  difficulty: 'beginner',
  maxDays: 30,
  tickRate: 8,
  startCash: 50000,
  holdingCostRate: 0.02,
  lostSalesPenaltyRate: 2.5,
  rawMaterialCosts: { baseMix: 5.0, packaging: 1.0, orderCost: 100.0 },
  leadTimes: { rawMaterial: 2, machineProcurement: 3 },
  breakdownsEnabled: false,
  demand: {
    type: 'fixed',
    baseVal: 80,
    amplitude: 0,
    period: 10,
    randomNoise: 0,
    customSchedule: []
  },
  machineSettings: {
    mixing: { capacityPerMachine: 100, purchaseCost: 2000, operatingCost: 40, breakdownProbability: 0, breakdownDuration: 2, repairCost: 300 },
    baking: { capacityPerMachine: 80, purchaseCost: 3000, operatingCost: 60, breakdownProbability: 0, breakdownDuration: 2, repairCost: 500 },
    icing: { capacityPerMachine: 120, purchaseCost: 1500, operatingCost: 30, breakdownProbability: 0, breakdownDuration: 1, repairCost: 200 },
    packaging: { capacityPerMachine: 150, purchaseCost: 1000, operatingCost: 20, breakdownProbability: 0, breakdownDuration: 1, repairCost: 150 }
  },
  contracts: [],
  events: [],
  objectives: ['max_cash'],
  creatorId: 'user_admin_001',
  createdAt: new Date()
};

// Setup initial team state
const createMockTeamState = (): TeamState => {
  return {
    id: 'team_test_123',
    name: 'Test Crew',
    controllerId: 'user_operator_001',
    status: 'active',
    cash: 50000,
    machines: {
      mixing: { type: 'mixing', count: 1, active: 1, inTransit: 0 },
      baking: { type: 'baking', count: 1, active: 1, inTransit: 0 },
      icing: { type: 'icing', count: 1, active: 1, inTransit: 0 },
      packaging: { type: 'packaging', count: 1, active: 1, inTransit: 0 }
    },
    inventory: {
      base_mix: { materialType: 'base_mix', onHand: 1000, inTransit: 0, orderQty: 1000, reorderPoint: 300, safetyStock: 200 },
      packaging_material: { materialType: 'packaging_material', onHand: 800, inTransit: 0, orderQty: 1000, reorderPoint: 200, safetyStock: 100 },
      finished_muffin: { materialType: 'finished_muffin', onHand: 0, inTransit: 0, orderQty: 0, reorderPoint: 0, safetyStock: 0 }
    },
    purchaseOrders: [],
    machineOrders: [],
    contracts: [],
    activeEvents: [],
    cashHistory: [],
    history: {
      days: [], cash: [], revenue: [], demand: [],
      inventory: { base_mix: [], packaging_material: [], finished_muffin: [] },
      utilization: { mixing: [], baking: [], icing: [], packaging: [] },
      contractFulfillment: [], bottlenecks: [], bottleneckCapacity: [],
      production: []
    },
    report: {
      revenue: 0, costs: 0, profit: 0, fillRate: 100, lostSales: 0,
      inventoryTurnover: 0, averageInventory: 0, stockoutDays: 0,
      utilization: { mixing: 0, baking: 0, icing: 0, packaging: 0 },
      contractFulfillment: 100, finalCash: 50000
    },
    academicScore: {
      cashPerformance: 100, fillRateScore: 100, contractScore: 100,
      inventoryScore: 100, capacityScore: 100, totalScore: 100
    },
    currentBottleneck: { stage: 'None', capacity: 0 },
    breakdownStates: []
  };
};

describe('Muffin Mega Factory - Simulation Engine Tests', () => {
  
  test('Deterministic Demand Calculation', () => {
    const demand = getDemandForDay(1, mockScenario.demand);
    expect(demand).toBe(80);
  });

  test('Daily Simulation Math - Raw Materials Consumption & Bottleneck Processing', () => {
    const initialState = createMockTeamState();
    
    // Capacities:
    // Mixing: 100
    // Baking: 80 (Oven is bottleneck)
    // Icing: 120
    // Packaging: 150
    // Bottleneck stage should be Baking with capacity = 80.
    
    const dayDemand = 80;
    const nextState = runSimDay(
      mockRoom,
      initialState,
      dayDemand,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02, // holding rate
      2.5,  // penalty rate
      false // breakdowns disabled
    );

    // Verify Bottleneck Detection
    expect(nextState.currentBottleneck.stage).toBe('Baking');
    expect(nextState.currentBottleneck.capacity).toBe(80);

    // Verify raw material consumption:
    // Since bottleneck capacity is 80, we should consume exactly 80 base mix and 80 packaging.
    expect(nextState.inventory.base_mix.onHand).toBe(1000 - 80);
    expect(nextState.inventory.packaging_material.onHand).toBe(800 - 80);

    // We sell exactly 80 muffins to market demand. Unsold muffins = 0.
    expect(nextState.inventory.finished_muffin.onHand).toBe(0);

    // Cash flow:
    // Operating costs: 40 (mixing) + 60 (baking) + 30 (icing) + 20 (packaging) = 150.
    // Holding cost: 2% of inventory value.
    // Base mix unit cost: 5. Packaging: 1.
    // Ending Inventory: 920 mix * 5 = 4600. 720 pack * 1 = 720. Muffin = 0. Total = 5320.
    // 2% of 5320 = 106.4.
    // Revenue: 80 sold * 20 price = 1600.
    // Net profit = Revenue (1600) - Operating (150) - Holding (106.4) = 1343.6.
    // Ending Cash = 50000 + 1343.6 = 51343.6.
    expect(nextState.cash).toBe(51343.6);
  });

  test('Automatic Reorder Trigger and Delivery Processing', () => {
    const state = createMockTeamState();
    
    // Force mix inventory to ROP limit:
    state.inventory.base_mix.onHand = 300; // ROP is 300
    
    // Execute day tick
    let nextState = runSimDay(
      mockRoom,
      state,
      80,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );

    // Verify Purchase order placed
    expect(nextState.purchaseOrders.length).toBe(1);
    const po = nextState.purchaseOrders[0];
    expect(po.materialType).toBe('base_mix');
    expect(po.quantity).toBe(1000);
    expect(po.status).toBe('transit');
    expect(po.arrivalDay).toBe(3); // Day 1 + 2 days lead time
    
    // Verify cash deductions for material order (order fee 100 + raw mix 1000 * 5 = 5100)
    // Plus operating costs and holding costs.
    expect(nextState.inventory.base_mix.inTransit).toBe(1000);

    // Advance room day to Day 3 (arrival day)
    const day3Room = { ...mockRoom, currentDay: 3 };
    
    // Run day 3 simulation tick
    const finalState = runSimDay(
      day3Room,
      nextState,
      80,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );

    // Verify PO delivered and inTransit decremented
    expect(finalState.inventory.base_mix.inTransit).toBe(0);
    // On hand: (starting on hand 300) - (day 1 consumed 80) - (day 2 consumed 80) - (day 3 consumed 80) + (PO delivered 1000) = 1060
    // Wait, day 2 consumption was not run in between.
    // Running step-by-step:
    // nextState starting on hand was 300. After runSimDay day 1 tick, onHand became 300 - 80 = 220.
    // When finalState runs on day 3, it processes arrival day <= 3. Since PO arrival was Day 3, it delivers!
    // So onHand = 220 (after day 1) - 80 (consumed day 3) + 1000 (delivered) = 1140.
    expect(finalState.inventory.base_mix.onHand).toBe(1140);
  });

  test('Bankruptcy Flow', () => {
    const state = createMockTeamState();
    // Force cash to a tiny amount
    state.cash = 10;
    
    // Trigger large purchase that bankrupts
    const config = mockScenario.machineSettings.baking;
    state.cash = 5; // not enough to pay running costs

    const nextState = runSimDay(
      mockRoom,
      state,
      0, // 0 demand so no revenue is generated
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );

    expect(nextState.status).toBe('bankrupt');
    expect(nextState.cash).toBe(0);
  });

});
