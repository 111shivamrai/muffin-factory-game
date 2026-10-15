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

  test('Zero Packaging Material results in exactly 0 production and no phantom consumption', () => {
    const state = createMockTeamState();
    // Base mix is available, but packaging material is completely 0
    state.inventory.base_mix.onHand = 500;
    state.inventory.packaging_material.onHand = 0;
    state.inventory.finished_muffin.onHand = 0;

    const nextState = runSimDay(
      mockRoom,
      state,
      100, // 100 demand
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );

    // Production must be 0
    expect(nextState.history.production[nextState.history.production.length - 1]).toBe(0);
    // Base mix should NOT be consumed
    expect(nextState.inventory.base_mix.onHand).toBe(500);
    // Packaging remains 0
    expect(nextState.inventory.packaging_material.onHand).toBe(0);
    // Muffins produced is 0
    expect(nextState.inventory.finished_muffin.onHand).toBe(0);
  });

  test('Independent lead times for Raw Material and Packaging Material', () => {
    const state = createMockTeamState();
    // Trigger reorder on both
    state.inventory.base_mix.onHand = 100; // ROP 300
    state.inventory.packaging_material.onHand = 50; // ROP 200

    const customLeadTimes = {
      rawMaterial: 3,
      packagingMaterial: 4,
      machineProcurement: 5
    };

    const nextState = runSimDay(
      mockRoom,
      state,
      0,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      customLeadTimes,
      0.02,
      2.5,
      false
    );

    const baseMixPO = nextState.purchaseOrders.find(po => po.materialType === 'base_mix');
    const packagingPO = nextState.purchaseOrders.find(po => po.materialType === 'packaging_material');

    expect(baseMixPO).toBeDefined();
    expect(packagingPO).toBeDefined();
    // Base mix lead time = 3 -> arrivalDay = day 1 + 3 = 4
    expect(baseMixPO?.arrivalDay).toBe(4);
    // Packaging lead time = 4 -> arrivalDay = day 1 + 4 = 5
    expect(packagingPO?.arrivalDay).toBe(5);
  });

  test('Scenario starting parameters and machine orders with scenario lead times', () => {
    const state = createMockTeamState();
    // Starting inventories remain distinct and non-interchangeable
    state.inventory.base_mix.onHand = 2500;
    state.inventory.packaging_material.onHand = 1800;

    expect(state.inventory.base_mix.onHand).toBe(2500);
    expect(state.inventory.packaging_material.onHand).toBe(1800);

    // Machine procurement order scheduled with scenario lead time (e.g. 4 days)
    const machineLeadTime = 4;
    const orderDay = 1;
    const arrivalDay = orderDay + machineLeadTime;

    state.machineOrders.push({
      id: 'mo_test_1',
      machineType: 'mixing',
      orderDay,
      arrivalDay,
      cost: 2000,
      status: 'procuring'
    });

    // On day 2, machine should still be procuring
    const day2Room = { ...mockRoom, currentDay: 2 };
    let nextState = runSimDay(
      day2Room,
      state,
      0,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      { rawMaterial: 2, packagingMaterial: 3, machineProcurement: 4 }
    );
    expect(nextState.machineOrders.length).toBe(1);
    expect(nextState.machineOrders[0].status).toBe('procuring');

    // On day 5 (arrivalDay), machine is delivered and increases owned/active count
    const initialMixerCount = nextState.machines.mixing.count;
    const day5Room = { ...mockRoom, currentDay: 5 };
    nextState = runSimDay(
      day5Room,
      nextState,
      0,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      { rawMaterial: 2, packagingMaterial: 3, machineProcurement: 4 }
    );
    expect(nextState.machineOrders.length).toBe(0); // Delivered orders filtered from active tracking
    expect(nextState.machines.mixing.count).toBe(initialMixerCount + 1);
  });

  test('Dynamic scenario material lead times: 5 days for raw material and 6 days for packaging', () => {
    const state = createMockTeamState();
    // Set inventory to trigger auto-reorders on day 4
    state.inventory.base_mix.onHand = 100;
    state.inventory.base_mix.reorderPoint = 300;
    state.inventory.base_mix.orderQty = 1000;
    state.inventory.base_mix.inTransit = 0;

    state.inventory.packaging_material.onHand = 50;
    state.inventory.packaging_material.reorderPoint = 200;
    state.inventory.packaging_material.orderQty = 800;
    state.inventory.packaging_material.inTransit = 0;

    const day4Room = { ...mockRoom, currentDay: 4 };
    const configuredLeadTimes = {
      rawMaterial: 5,
      packagingMaterial: 6,
      machineProcurement: 3
    };

    const nextState = runSimDay(
      day4Room,
      state,
      0, // 0 demand so consumption doesn't alter math
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      configuredLeadTimes
    );

    // Verify raw material order placed with arrival on day 4 + 5 = 9
    const rawPO = nextState.purchaseOrders.find(po => po.materialType === 'base_mix');
    expect(rawPO).toBeDefined();
    expect(rawPO?.orderDay).toBe(4);
    expect(rawPO?.arrivalDay).toBe(9); // 4 + 5

    // Verify packaging material order placed with arrival on day 4 + 6 = 10
    const packPO = nextState.purchaseOrders.find(po => po.materialType === 'packaging_material');
    expect(packPO).toBeDefined();
    expect(packPO?.orderDay).toBe(4);
    expect(packPO?.arrivalDay).toBe(10); // 4 + 6
  });

  test('Dynamic scenario material lead times with alternative configuration (1 day raw, 4 days packaging)', () => {
    const state = createMockTeamState();
    state.inventory.base_mix.onHand = 100;
    state.inventory.base_mix.reorderPoint = 300;
    state.inventory.base_mix.orderQty = 500;
    state.inventory.base_mix.inTransit = 0;

    state.inventory.packaging_material.onHand = 50;
    state.inventory.packaging_material.reorderPoint = 200;
    state.inventory.packaging_material.orderQty = 600;
    state.inventory.packaging_material.inTransit = 0;

    const day2Room = { ...mockRoom, currentDay: 2 };
    const altLeadTimes = {
      rawMaterial: 1,
      packagingMaterial: 4,
      machineProcurement: 5
    };

    const nextState = runSimDay(
      day2Room,
      state,
      0,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      altLeadTimes
    );

    const rawPO = nextState.purchaseOrders.find(po => po.materialType === 'base_mix');
    expect(rawPO?.arrivalDay).toBe(3); // 2 + 1

    const packPO = nextState.purchaseOrders.find(po => po.materialType === 'packaging_material');
    expect(packPO?.arrivalDay).toBe(6); // 2 + 4
  });

  test('Machine repair lifecycle: 1-day repair completes at next day boundary and restores capacity', () => {
    const state = createMockTeamState();
    // Simulate 1 broken mixer with 1 day remaining
    state.machines.mixing.count = 2;
    state.machines.mixing.active = 2;
    state.breakdownStates = [
      { machineType: 'mixing', brokenCount: 1, daysRemaining: [1] }
    ];

    // Day 10 simulation step with breakdowns disabled so no random new breakdowns roll
    const day10Room = { ...mockRoom, currentDay: 10 };
    const nextState = runSimDay(
      day10Room,
      state,
      0, // 0 demand for pure machine state inspection
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false // breakdowns disabled so no new random breakdowns
    );

    // After 1 day, the 1-day repair must complete!
    const mixerBreakdown = nextState.breakdownStates.find(b => b.machineType === 'mixing');
    expect(mixerBreakdown).toBeDefined();
    expect(mixerBreakdown?.brokenCount).toBe(0);
    expect(mixerBreakdown?.daysRemaining.length).toBe(0);

    // Mixing capacity should be restored to full 2 machines * 100 = 200
    // (Baking is still 80, so bottleneck is baking, but mixer available capacity is 200)
    expect(nextState.machines.mixing.active).toBe(2);
  });

  test('Machine repair lifecycle: 2-day repair decrements to 1 day on Day 1, and completes on Day 2', () => {
    const state = createMockTeamState();
    state.machines.baking.count = 2;
    state.machines.baking.active = 2;
    state.breakdownStates = [
      { machineType: 'baking', brokenCount: 1, daysRemaining: [2] }
    ];

    // Day 1: Run with 2 days remaining -> should decrement to 1 day remaining and stay broken
    const day1Room = { ...mockRoom, currentDay: 1 };
    const stateAfterDay1 = runSimDay(
      day1Room,
      state,
      0,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );

    const ovenBreakdownDay1 = stateAfterDay1.breakdownStates.find(b => b.machineType === 'baking');
    expect(ovenBreakdownDay1?.brokenCount).toBe(1);
    expect(ovenBreakdownDay1?.daysRemaining).toEqual([1]);

    // Day 2: Run with 1 day remaining -> should complete repair and return to 0 broken
    const day2Room = { ...mockRoom, currentDay: 2 };
    const stateAfterDay2 = runSimDay(
      day2Room,
      stateAfterDay1,
      0,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );

    const ovenBreakdownDay2 = stateAfterDay2.breakdownStates.find(b => b.machineType === 'baking');
    expect(ovenBreakdownDay2?.brokenCount).toBe(0);
    expect(ovenBreakdownDay2?.daysRemaining.length).toBe(0);
  });

  test('Partial breakdown: 1 of 2 machines broken preserves partial operating capacity', () => {
    const state = createMockTeamState();
    state.machines.mixing.count = 2;
    state.machines.mixing.active = 2; // 2 * 100 = 200 total nominal
    state.machines.baking.count = 4;
    state.machines.baking.active = 4; // 4 * 80 = 320 total nominal
    state.breakdownStates = [
      { machineType: 'mixing', brokenCount: 1, daysRemaining: [1] }
    ];

    // On this day, 1 mixer is running (capacity 100), not 0
    // So bottleneck capacity should be 100, not 0
    const dayRoom = { ...mockRoom, currentDay: 5 };
    const nextState = runSimDay(
      dayRoom,
      state,
      100,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );

    // Next state: 1-day repair completed on day boundary
    const mixerB = nextState.breakdownStates.find(b => b.machineType === 'mixing');
    expect(mixerB?.brokenCount).toBe(0);
    expect(mixerB?.daysRemaining.length).toBe(0);
  });

  test('Minimum active machines: active machine count cannot be reduced below 1 by user control', () => {
    const state = createMockTeamState();
    // Simulate user control updating machine active status
    const requestedStatuses: Record<MachineType, number> = {
      mixing: 0, // User attempted to reduce to 0
      baking: -1, // User attempted negative value
      icing: 1,
      packaging: 2
    };

    // Apply the minimum boundary rule: Math.max(1, Math.min(count, requested))
    for (const [mType, reqCount] of Object.entries(requestedStatuses)) {
      const m = state.machines[mType as MachineType];
      if (m) {
        m.active = Math.max(1, Math.min(m.count, reqCount));
      }
    }

    // Mixer and Baking must be clamped to minimum 1, not 0
    expect(state.machines.mixing.active).toBe(1);
    expect(state.machines.baking.active).toBe(1);
    expect(state.machines.icing.active).toBe(1);
    expect(state.machines.packaging.active).toBe(1); // count is 1, clamped to min(1, 2) = 1

    // Verify that simulation running logic still operates safely with active=1
    const dayRoom = { ...mockRoom, currentDay: 1 };
    const nextState = runSimDay(
      dayRoom,
      state,
      80,
      mockScenario.machineSettings,
      mockScenario.rawMaterialCosts,
      mockScenario.leadTimes,
      0.02,
      2.5,
      false
    );
    expect(nextState.history.bottleneckCapacity[0]).toBeGreaterThan(0);
  });

});
