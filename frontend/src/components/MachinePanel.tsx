import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import {
  Info, ShoppingCart, TrendingUp, Scale, FileCheck, Check,
  Zap, Activity, Cog, X, AlertTriangle, Wrench
} from 'lucide-react';
import { MachineType } from '../../../backend/src/types/index.js';

// Machine capacity constants (units produced/processed per day per machine)
const CAPACITY_PER_MACHINE: Record<MachineType, number> = {
  mixing: 100,
  baking: 80,
  icing: 120,
  packaging: 150,
};

// Theme colours and process descriptions per machine type
const MACHINE_META: Record<MachineType, {
  icon: string;
  processDesc: string;
  accentColor: string;
  badgeBg: string;
  utilColor: string;
  dotClass: string;
}> = {
  mixing: {
    icon: '🥣',
    processDesc: 'Mixes flour, sugar & batter',
    accentColor: '#7c3aed',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    utilColor: '#c084fc',
    dotClass: 'bg-purple-400',
  },
  baking: {
    icon: '🥧',
    processDesc: 'Bakes batter into muffins',
    accentColor: '#ea580c',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    utilColor: '#fb923c',
    dotClass: 'bg-orange-400',
  },
  icing: {
    icon: '🍦',
    processDesc: 'Frosts & adds toppings',
    accentColor: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    utilColor: '#4ade80',
    dotClass: 'bg-green-400',
  },
  packaging: {
    icon: '🎁',
    processDesc: 'Boxes & wraps final muffins',
    accentColor: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    utilColor: '#60a5fa',
    dotClass: 'bg-blue-400',
  },
};

// ─── SVG Circular Progress Ring ────────────────────────────────────────────────
function ProgressRing({ value, color, size = 40 }: { value: number; color: string; size?: number }) {
  const radius = size / 2;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke * 1.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <svg height={size} width={size} className="select-none">
      <circle stroke="#f1f5f9" fill="transparent" strokeWidth={stroke}
        r={normalizedRadius} cx={radius} cy={radius} />
      <circle stroke={color} fill="transparent" strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={normalizedRadius} cx={radius} cy={radius}
        className="transition-all duration-300" strokeLinecap="round"
        transform={`rotate(-90 ${radius} ${radius})`} />
      <text x="50%" y="50%" dy=".35em" textAnchor="middle"
        className="text-[9px] font-extrabold fill-stone-700">
        {value}%
      </text>
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
function MachinePanel() {
  const { teamState, room, role, buyMachine, updateAllMachineStatuses, updateAllocationStrategy } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
      room: state.room,
      role: state.role,
      buyMachine: state.buyMachine,
      updateAllMachineStatuses: state.updateAllMachineStatuses,
      updateAllocationStrategy: state.updateAllocationStrategy,
    }))
  );

  const isController = role === 'controller';

  const [mixActive, setMixActive] = useState(1);
  const [bakeActive, setBakeActive] = useState(1);
  const [iceActive, setIceActive] = useState(1);
  const [packActive, setPackActive] = useState(1);
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Keyboard accessibility: ESC key closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // ─── Buy handler ──────────────────────────────────────────────────────────────
  const handleBuy = async (type: MachineType) => {
    if (!isController || isBuying) return;
    setIsBuying(type);
    try {
      await buyMachine(type);
    } finally {
      setTimeout(() => setIsBuying(null), 500);
    }
  };

  // ─── Sync server machine state into local steppers ─────────────────────────
  const prevConfigRef = React.useRef<{
    mix: number; bake: number; ice: number; pack: number;
    mixC: number; bakeC: number; iceC: number; packC: number;
  } | null>(null);

  useEffect(() => {
    if (teamState) {
      const { mixing, baking, icing, packaging } = teamState.machines;
      const currentConfig = {
        mix: mixing.active, bake: baking.active, ice: icing.active, pack: packaging.active,
        mixC: mixing.count, bakeC: baking.count, iceC: icing.count, packC: packaging.count,
      };
      const prevConfig = prevConfigRef.current;
      let shouldUpdate = false;
      if (!prevConfig) {
        shouldUpdate = true;
      } else {
        if (
          prevConfig.mix !== currentConfig.mix || prevConfig.bake !== currentConfig.bake ||
          prevConfig.ice !== currentConfig.ice || prevConfig.pack !== currentConfig.pack ||
          prevConfig.mixC !== currentConfig.mixC || prevConfig.bakeC !== currentConfig.bakeC ||
          prevConfig.iceC !== currentConfig.iceC || prevConfig.packC !== currentConfig.packC
        ) { shouldUpdate = true; }
      }
      if (shouldUpdate) {
        setMixActive(mixing.active);
        setBakeActive(baking.active);
        setIceActive(icing.active);
        setPackActive(packaging.active);
      }
      prevConfigRef.current = currentConfig;
    }
  }, [teamState?.machines]);

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleApplyOperations = () => {
    if (!isController) return;
    const safeMix = Math.max(0, mixActive);
    const safeBake = Math.max(0, bakeActive);
    const safeIce = Math.max(0, iceActive);
    const safePack = Math.max(0, packActive);
    updateAllMachineStatuses({ mixing: safeMix, baking: safeBake, icing: safeIce, packaging: safePack });
    alert('Workfloor machine operation parameters updated!');
  };

  const updateSingle = (type: string, newValue: number) => {
    if (!isController) return;
    const safeValue = Math.max(0, newValue);
    updateAllMachineStatuses({
      mixing: type === 'mixing' ? safeValue : Math.max(0, mixActive),
      baking: type === 'baking' ? safeValue : Math.max(0, bakeActive),
      icing: type === 'icing' ? safeValue : Math.max(0, iceActive),
      packaging: type === 'packaging' ? safeValue : Math.max(0, packActive),
    });
  };

  if (!teamState) return null;

  const { mixing, baking, icing, packaging } = teamState.machines;
  const currentStrategy = (teamState as any).allocationStrategy || 'contracts_first';

  // ─── Machine definitions in strict order: Mixer, Oven, Icing, Packaging ───────
  const machines: Array<{
    type: MachineType;
    label: string;
    state: number;
    setter: (v: number) => void;
    mData: typeof mixing;
    cost: number;
  }> = [
    { type: 'mixing',    label: 'Mixer Machine',     state: mixActive,  setter: setMixActive,  mData: mixing,    cost: 2000 },
    { type: 'baking',    label: 'Oven Machine',      state: bakeActive, setter: setBakeActive, mData: baking,    cost: 3000 },
    { type: 'icing',     label: 'Icing Machine',     state: iceActive,  setter: setIceActive,  mData: icing,     cost: 1500 },
    { type: 'packaging', label: 'Packaging Machine', state: packActive, setter: setPackActive, mData: packaging, cost: 1000 },
  ];

  // Helper to reliably derive active breakdown and remaining repair days from authoritative state
  const getMachineBreakdown = (type: MachineType) => {
    const b = teamState.breakdownStates?.find(bk => bk.machineType === type);
    if (!b) return { brokenCount: 0, daysRemaining: [] as number[] };
    const rem = (b.daysRemaining || []).filter(d => d > 0);
    const count = rem.length > 0 ? rem.length : (b.daysRemaining && b.daysRemaining.length === 0 ? 0 : (b.brokenCount || 0));
    return {
      brokenCount: count,
      daysRemaining: rem
    };
  };

  // ── Verified Shared Factory Operating Capacity (MIN of 4 stages) ──────────
  const runningMixers = Math.max(0, (teamState.machines.mixing?.active || 0) - getMachineBreakdown('mixing').brokenCount);
  const runningBakers = Math.max(0, (teamState.machines.baking?.active || 0) - getMachineBreakdown('baking').brokenCount);
  const runningIcers  = Math.max(0, (teamState.machines.icing?.active || 0) - getMachineBreakdown('icing').brokenCount);
  const runningPackagers = Math.max(0, (teamState.machines.packaging?.active || 0) - getMachineBreakdown('packaging').brokenCount);

  const stageOperatingCaps: Record<MachineType, number> = {
    mixing: runningMixers * CAPACITY_PER_MACHINE.mixing,
    baking: runningBakers * CAPACITY_PER_MACHINE.baking,
    icing: runningIcers * CAPACITY_PER_MACHINE.icing,
    packaging: runningPackagers * CAPACITY_PER_MACHINE.packaging,
  };

  const factoryOperatingCapacity = Math.min(
    stageOperatingCaps.mixing,
    stageOperatingCaps.baking,
    stageOperatingCaps.icing,
    stageOperatingCaps.packaging
  );

  // ── Breakdown badge count for Factory Floor trigger card ──────────────────
  const totalBrokenMachines = (['mixing', 'baking', 'icing', 'packaging'] as MachineType[]).reduce((sum, t) => {
    return sum + getMachineBreakdown(t).brokenCount;
  }, 0);

  return (
    <>
      {/* ── Collapsible Trigger Card below Operations Advisor ── */}
      <div 
        onClick={() => setIsDrawerOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsDrawerOpen(true);
          }
        }}
        className="bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-[0_2px_0_#7b1fa2] rounded-2xl cursor-pointer hover:from-fuchsia-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all select-none shrink-0 relative"
        title="Click to open Factory Floor machinery, capacity, and operations modal"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-10 rounded-xl bg-white/20 grid place-items-center shrink-0">
            <Cog className="w-5.5 h-5.5 text-white" />
          </span>
          <div className="min-w-0">
            <div className="font-extrabold text-sm tracking-wide font-sans">FACTORY FLOOR</div>
            <div className="text-xs text-white/90 whitespace-nowrap">Machinery & production lines</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Breakdown notification badge */}
          {totalBrokenMachines > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold bg-red-500 border border-red-300 rounded-full px-2.5 py-1 tracking-wider uppercase animate-pulse shadow-sm" title={`${totalBrokenMachines} machine(s) currently broken`}>
              <AlertTriangle className="w-3 h-3" />
              {totalBrokenMachines}
            </span>
          )}
          <span className="text-[10px] font-extrabold bg-white/20 border border-white/30 rounded-full px-3 py-1 tracking-wider uppercase">
            {machines.filter(m => m.mData.active > 0).length} / {machines.length} ACTIVE
          </span>
        </div>
      </div>

      {/* ── Polished Centered Factory Floor Operations Modal ── */}
      {isDrawerOpen && (
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-150"
        >
            <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-[880px] w-full bg-[#fffdfb] rounded-2xl shadow-2xl border border-purple-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            style={{ maxHeight: 'calc(100vh - 16px)' }}
          >
            {/* Modal Header */}
            <header className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white font-extrabold tracking-wide text-sm flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="size-7 rounded-lg bg-white/20 border border-white/40 flex items-center justify-center text-sm shadow-xs shrink-0">⚙️</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight font-sans">FACTORY FLOOR OPERATIONS</span>
                    <span className="text-[9px] font-bold bg-white/20 border border-white/30 rounded-full px-2 py-0.5 tracking-widest uppercase">
                      {machines.filter(m => m.mData.active > 0).length} / {machines.length} Active
                    </span>
                    {totalBrokenMachines > 0 && (
                      <span className="text-[9px] font-bold bg-red-500/80 border border-red-300/50 rounded-full px-2 py-0.5 tracking-wider uppercase flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {totalBrokenMachines} Broken
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer border-none"
                title="Close Factory Floor (Esc)"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Modal Content — no internal scrolling */}
            <div className="flex flex-col p-3 sm:p-3.5 gap-2 sm:gap-2.5">

              {/* ══════════════ 4 STACKED MACHINE ROWS ══════════════ */}
              <div className="flex flex-col gap-1.5">
                {machines.map(({ type, label, state, setter, mData, cost }) => {
                  const meta         = MACHINE_META[type];
                  const inTransit    = mData.inTransit || 0;
                  const canAfford    = teamState.cash >= cost;
                  const isProcuring  = inTransit > 0;
                  const unitCapacity = CAPACITY_PER_MACHINE[type];
                  const leadTime     = (room?.scenarioConfig?.machineSettings?.[type] as any)?.leadTime
                    || (room?.scenarioConfig?.leadTimes as any)?.machines?.[type]
                    || room?.scenarioConfig?.leadTimes?.machineProcurement
                    || (room?.difficulty === 'intermediate' ? 5 : room?.difficulty === 'advanced' ? 6 : 3);

                  // Available Capacity = Total Owned Floor Machines × Capacity Per Machine
                  const availableCapacity = mData.count * unitCapacity;

                  // Breakdown info for this machine
                  const { brokenCount, daysRemaining: repairDaysArr } = getMachineBreakdown(type);
                  const maxRepairDays = repairDaysArr.length > 0 ? Math.max(...repairDaysArr) : 0;

                  // Machine Utilization for this stage (from authoritative history)
                  const histUtil = teamState.history?.utilization?.[type];
                  let currentUtil = 0;
                  if (histUtil && histUtil.length > 0) {
                    currentUtil = histUtil[histUtil.length - 1];
                  } else if ((teamState.report as any)?.machineUtilization?.[type] !== undefined) {
                    currentUtil = (teamState.report as any).machineUtilization[type];
                  } else {
                    const runningCount = Math.max(0, state - brokenCount);
                    const operatingCap = runningCount * unitCapacity;
                    currentUtil = operatingCap > 0 ? Math.min(100, Math.round((factoryOperatingCapacity / operatingCap) * 100)) : 0;
                  }

                  return (
                    <div
                      key={type}
                      className={`rounded-xl border bg-white px-3 py-2 shadow-2xs transition-all flex items-center justify-between gap-2 ${
                        brokenCount > 0 ? 'border-red-200 bg-red-50/30' : 'border-stone-200/90 hover:border-purple-300'
                      }`}
                    >
                      {/* LEFT: Machine Icon, Name, Description, Ownership & Lead Time */}
                      <div className="flex items-center gap-2 min-w-0 w-[240px] shrink-0">
                        <span className="text-2xl shrink-0 p-1 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center">
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] font-black text-stone-800 font-sans tracking-tight leading-tight">
                              {label}
                            </span>
                            <span className="text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-px rounded text-[8.5px] font-bold shrink-0">
                              Lead Time: {leadTime}d
                            </span>
                          </div>
                          <div className="text-[9px] font-medium text-stone-400 font-sans truncate">
                            {meta.processDesc}
                          </div>
                          <div className="flex items-center flex-wrap gap-1 mt-0.5 text-[8.5px] font-bold text-stone-500 font-mono">
                            <span>{mData.count} owned · {state} active</span>
                            {isProcuring && (
                              <span className="text-amber-700 bg-amber-50 border border-amber-300 px-1 py-px rounded text-[7.5px] font-bold flex items-center gap-0.5 animate-pulse">
                                🚚 +{inTransit} transit
                              </span>
                            )}
                            {brokenCount > 0 && (
                              <span className="text-red-700 bg-red-50 border border-red-200 px-1.5 py-px rounded text-[7.5px] font-bold inline-flex items-center gap-1 shadow-2xs">
                                <Wrench className="w-2.5 h-2.5" />
                                {brokenCount} broken · Repairing {maxRepairDays}d left
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* MIDDLE: Quantity Selector + Capacity Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Stepper controls (allows 0, never negative) */}
                        <div className="flex items-center rounded-lg border border-[#d8ccbb] overflow-hidden bg-white shrink-0 shadow-2xs h-[30px]">
                          {isController ? (
                            <button
                              type="button"
                              disabled={state <= 0}
                              onClick={() => {
                                const newVal = Math.max(0, state - 1);
                                setter(newVal);
                                updateSingle(type, newVal);
                              }}
                              title={state <= 0 ? `${label} active count is already 0` : `Deactivate one ${label}`}
                              className={`w-7 h-full bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-sm flex items-center justify-center transition-all border-none select-none leading-none ${
                                state <= 0 ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-85'
                              }`}
                            >
                              −
                            </button>
                          ) : null}
                          <div
                            className="px-2 h-full bg-white text-[#1c1917] text-[11px] font-black flex items-center justify-center font-mono border-x border-[#d8ccbb] select-none min-w-[46px]"
                            title={`${state} active of ${mData.count} owned floor machines`}
                          >
                            {state} / {mData.count}
                          </div>
                          {isController ? (
                            <button
                              type="button"
                              disabled={state >= mData.count}
                              onClick={() => {
                                const newVal = Math.min(mData.count, state + 1);
                                setter(newVal);
                                updateSingle(type, newVal);
                              }}
                              title={
                                state >= mData.count
                                  ? isProcuring
                                    ? `Cannot activate: purchased machine is still in transit`
                                    : `All available ${label} machines are active`
                                  : `Activate one more ${label}`
                              }
                              className={`w-7 h-full bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-sm flex items-center justify-center transition-all border-none select-none leading-none ${
                                state >= mData.count ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-85'
                              }`}
                            >
                              +
                            </button>
                          ) : null}
                        </div>

                        {/* Available Capacity Box */}
                        <div
                          className="w-[88px] rounded-lg bg-emerald-50/80 border border-emerald-200/90 px-1.5 py-1 flex flex-col justify-center items-center text-center shadow-2xs"
                          title={`Available Capacity: ${mData.count} owned × ${unitCapacity}/day = ${availableCapacity} units/day`}
                        >
                          <div className="text-[7px] font-extrabold text-emerald-700 uppercase tracking-tight flex items-center justify-center gap-0.5 leading-none">
                            <Zap className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span>AVAIL. CAP</span>
                          </div>
                          <div className="text-[11px] font-black text-emerald-800 font-mono leading-tight">
                            {availableCapacity} <span className="text-[7px] font-normal text-emerald-600">u/d</span>
                          </div>
                        </div>

                        {/* Operating Capacity Box — shows FACTORY BOTTLENECK (shared across all 4 rows) */}
                        <div
                          className="w-[88px] rounded-lg bg-purple-50/80 border border-purple-200/90 px-1.5 py-1 flex flex-col justify-center items-center text-center shadow-2xs"
                          title={`Factory Bottleneck Capacity: min(${stageOperatingCaps.mixing}, ${stageOperatingCaps.baking}, ${stageOperatingCaps.icing}, ${stageOperatingCaps.packaging}) = ${factoryOperatingCapacity} units/day`}
                        >
                          <div className="text-[7px] font-extrabold text-purple-700 uppercase tracking-tight flex items-center justify-center gap-0.5 leading-none">
                            <Activity className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                            <span>OPER. CAP</span>
                          </div>
                          <div className={`text-[11px] font-black font-mono leading-tight ${factoryOperatingCapacity === 0 ? 'text-rose-600' : 'text-purple-800'}`}>
                            {factoryOperatingCapacity} <span className="text-[7px] font-normal text-purple-600">u/d</span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Utilization (label above ring) + Buy Button */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Utilization Indicator — label ABOVE the circle, percentage INSIDE only */}
                        <div className="flex flex-col items-center" title={`${label} Utilization: ${currentUtil}%`}>
                          <span className="text-[7px] font-extrabold text-stone-400 uppercase tracking-tight leading-none mb-0.5">UTILIZATION</span>
                          <ProgressRing value={currentUtil} color={currentUtil === 0 ? '#d1d5db' : meta.utilColor} size={38} />
                        </div>

                        {/* Buy Button */}
                        {isController ? (
                          <button
                            type="button"
                            disabled={!canAfford || isBuying === type}
                            onClick={() => handleBuy(type)}
                            title={
                              !canAfford
                                ? `Need ₹${cost.toLocaleString()} (Cash: ₹${teamState.cash.toLocaleString()})`
                                : isProcuring
                                ? `Buy another ${label} for ₹${cost.toLocaleString()} (+${inTransit} already in transit)`
                                : `Procure additional ${label} for ₹${cost.toLocaleString()}`
                            }
                            className={`h-[30px] px-2.5 bg-gradient-to-b from-[#8e24aa] to-[#7b1fa2] hover:from-[#9c27b0] hover:to-[#6a1b9a] text-white rounded-lg text-[9px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs border-none shrink-0 select-none ${
                              !canAfford || isBuying === type ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>{isBuying === type ? 'BUYING...' : `BUY ₹${cost.toLocaleString()}`}</span>
                          </button>
                        ) : (
                          <div className="h-[30px] w-14 bg-stone-100 rounded-lg flex items-center justify-center text-[8px] text-stone-400 font-bold uppercase shrink-0">
                            Locked
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ══════════════ PRODUCTION OUTPUT ALLOCATION SECTION ══════════════ */}
              <div className="shrink-0 bg-white border border-purple-100 rounded-xl p-2.5 shadow-2xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-px bg-stone-200 flex-1" />
                  <span className="text-[9px] font-extrabold text-[#7b1fa2] tracking-widest uppercase">Production Output Allocation</span>
                  <div className="h-px bg-stone-200 flex-1" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'contracts_first', label: 'CONTRACT FIRST', icon: FileCheck },
                    { id: 'market_first',   label: 'MARKET FIRST',    icon: TrendingUp },
                    { id: 'split',          label: 'SPLIT EQUAL',     icon: Scale },
                  ].map(strat => {
                    const IconComponent = strat.icon;
                    const isSelected = currentStrategy === strat.id;
                    return (
                      <div key={strat.id} className="relative flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => isController && updateAllocationStrategy(strat.id as any)}
                          className={`w-full py-1.5 px-1 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#f3e5f5] border-[#9c27b0] text-[#7b1fa2] shadow-sm font-extrabold'
                              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                          disabled={!isController}
                        >
                          <IconComponent className={`w-4 h-4 ${isSelected ? 'text-[#7b1fa2]' : 'text-stone-400'}`} />
                          <span className="text-[8px] font-bold text-center tracking-wide leading-tight">{strat.label}</span>
                        </button>
                        {isSelected && (
                          <div className="absolute -bottom-1 size-3.5 rounded-full bg-[#7b1fa2] text-white flex items-center justify-center shadow-sm">
                            <Check className="w-2 h-2 font-bold" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ══════════════ APPLY OPERATIONS BUTTON ══════════════ */}
              <div className="shrink-0">
                {isController ? (
                  <button
                    onClick={handleApplyOperations}
                    className="w-full py-2 rounded-xl bg-gradient-to-b from-fuchsia-600 to-purple-700 text-white font-extrabold text-xs shadow-[0_3px_0_#7b1fa2] hover:translate-y-[1px] hover:shadow-[0_2px_0_#7b1fa2] active:translate-y-[3px] active:shadow-none transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🧁</span>
                    <span>APPLY OPERATIONS</span>
                  </button>
                ) : (
                  <div className="py-2 bg-slate-100 border border-slate-200 text-[10px] rounded-xl text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
                    <Info className="w-3.5 h-3.5" />
                    <span>OBSERVER MODE – READ ONLY</span>
                  </div>
                )}
              </div>

            </div>
            {/* No footer — removed per requirement. Top-right X is the primary close control. */}
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(MachinePanel);
