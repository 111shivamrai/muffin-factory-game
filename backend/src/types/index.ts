export type UserRole = 'admin' | 'instructor' | 'operator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export type SimulationStatus = 'configuring' | 'active' | 'paused' | 'finished';
export type DifficultyPreset = 'beginner' | 'intermediate' | 'advanced';
export type ScenarioObjective = 'max_cash' | 'max_profit' | 'max_fill_rate' | 'max_contract_revenue' | 'min_stockouts' | 'balanced_score';
export type DemandType = 'fixed' | 'seasonal' | 'random' | 'hybrid' | 'custom';

export type MachineType = 'mixing' | 'baking' | 'icing' | 'packaging';
export type MaterialType = 'base_mix' | 'packaging_material' | 'finished_muffin';

export interface MachineConfig {
  capacityPerMachine: number; // units per day
  purchaseCost: number;
  operatingCost: number; // daily running cost per active machine
  breakdownProbability: number; // 0 to 1
  breakdownDuration: number; // in days
  repairCost: number;
}

export interface Machine {
  type: MachineType;
  count: number;
  active: number;
  inTransit: number; // purchased machines not yet delivered
}

export interface MachineStateChange {
  machineId: string;
  day: number;
  state: 'idle' | 'active' | 'broken' | 'procuring';
  capacity: number;
}

export interface Inventory {
  materialType: MaterialType;
  onHand: number;
  inTransit: number;
  orderQty: number;
  reorderPoint: number;
  safetyStock: number;
}

export interface PurchaseOrder {
  id: string;
  materialType: MaterialType;
  quantity: number;
  orderDay: number;
  arrivalDay: number;
  cost: number;
  status: 'ordered' | 'transit' | 'delivered';
}

export interface MachineOrder {
  id: string;
  machineType: MachineType;
  orderDay: number;
  arrivalDay: number;
  cost: number;
  status: 'procuring' | 'delivered';
}

export interface ContractTemplate {
  name: string;
  startDay: number;
  endDay: number;
  dailyQuantity: number;
  priceMultiplier: number;
  penalty: number; // penalty per missed unit
}

export interface Contract extends ContractTemplate {
  id: string;
  active: boolean;
  status?: 'offered' | 'accepted' | 'declined' | 'completed';
  fulfilledToday: number;
  totalFulfilled: number;
  totalTarget: number;
}

export interface EventTemplate {
  name: string;
  startDay: number;
  endDay: number;
  description: string;
  targetVariable: 'demand' | 'raw_material_cost' | 'lead_time' | 'breakdowns';
  modifier: number; // multiplier or flat value shift
}

export interface GameEvent extends EventTemplate {
  id: string;
  active: boolean;
}

export interface CashHistoryRecord {
  day: number;
  type: 'revenue' | 'raw_material_cost' | 'ordering_cost' | 'machine_purchase' | 'machine_operating' | 'holding_cost' | 'repair_cost' | 'penalty';
  amount: number;
  endingCash: number;
}

export interface ReportMetrics {
  revenue: number;
  costs: number;
  profit: number;
  fillRate: number; // overall market demand filled %
  lostSales: number;
  inventoryTurnover: number;
  averageInventory: number;
  stockoutDays: number;
  utilization: Record<MachineType, number>;
  contractFulfillment: number; // overall contract units delivered / target units %
  finalCash: number;
}

export interface HistoryData {
  days: number[];
  cash: number[];
  revenue: number[];
  demand: number[];
  inventory: Record<MaterialType, number[]>;
  utilization: Record<MachineType, number[]>;
  contractFulfillment: number[];
  bottlenecks: string[];
  bottleneckCapacity: number[];
  production: number[];
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  cash: number;
  profit: number;
  status: 'active' | 'bankrupt';
}

export interface AcademicScore {
  cashPerformance: number; // 40%
  fillRateScore: number;    // 20%
  contractScore: number;    // 15%
  inventoryScore: number;   // 15%
  capacityScore: number;    // 10%
  totalScore: number;
}

export interface TeamState {
  id: string;
  name: string;
  controllerId: string;
  status: 'active' | 'bankrupt';
  cash: number;
  machines: Record<MachineType, Machine>;
  inventory: Record<MaterialType, Inventory>;
  purchaseOrders: PurchaseOrder[];
  machineOrders: MachineOrder[];
  contracts: Contract[];
  activeEvents: GameEvent[];
  cashHistory: CashHistoryRecord[];
  history: HistoryData;
  report: ReportMetrics;
  academicScore: AcademicScore;
  currentBottleneck: {
    stage: string;
    capacity: number;
  };
  breakdownStates: {
    machineType: MachineType;
    brokenCount: number;
    daysRemaining: number[];
  }[];
}

export interface Room {
  id: string;
  code: string;
  name: string;
  status: SimulationStatus;
  difficulty: DifficultyPreset;
  tickRate: number; // in seconds per day
  currentDay: number;
  maxDays: number;
  scenarioId?: string;
  createdAt: Date;
  createdBy: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  description: string;
  learningObjective: string;
  instructorNotes: string;
  difficulty: DifficultyPreset;
  maxDays: number;
  tickRate: number;
  startCash: number;
  holdingCostRate: number;
  lostSalesPenaltyRate: number;
  rawMaterialCosts: {
    baseMix: number;
    packaging: number;
    orderCost: number;
  };
  leadTimes: {
    rawMaterial: number;
    machineProcurement: number;
  };
  breakdownsEnabled: boolean;
  demand: {
    type: DemandType;
    baseVal: number;
    amplitude: number;
    period: number;
    randomNoise: number;
    customSchedule: number[];
  };
  machineSettings: Record<MachineType, MachineConfig>;
  contracts: ContractTemplate[];
  events: EventTemplate[];
  objectives: ScenarioObjective[];
  creatorId: string;
  createdAt: Date;
  starsThresholds?: number[];
}
