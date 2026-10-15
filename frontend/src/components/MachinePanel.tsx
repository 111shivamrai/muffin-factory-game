import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import {
  Info, ShoppingCart, TrendingUp, Scale, FileCheck, Check,
  Zap, Activity, Cog, X
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
function ProgressRing({ value, color }: { value: number; color: string }) {
  const radius = 26;
  const stroke = 4.5;
  const normalizedRadius = radius - stroke * 1.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <svg height={radius * 2} width={radius * 2} className="mx-auto select-none">
      <circle stroke="#f1f5f9" fill="transparent" strokeWidth={stroke}
        r={normalizedRadius} cx={radius} cy={radius} />
      <circle stroke={color} fill="transparent" strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={normalizedRadius} cx={radius} cy={radius}
        className="transition-all duration-300" strokeLinecap="round"
        transform={`rotate(-90 ${radius} ${radius})`} />
      <text x="50%" y="50%" dy=".3em" textAnchor="middle"
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
    updateAllMachineStatuses({ mixing: mixActive, baking: bakeActive, icing: iceActive, packaging: packActive });
    alert('Workfloor machine operation parameters updated!');
  };

  const updateSingle = (type: string, newValue: number) => {
    if (!isController) return;
    updateAllMachineStatuses({
      mixing: type === 'mixing' ? newValue : mixActive,
      baking: type === 'baking' ? newValue : bakeActive,
      icing: type === 'icing' ? newValue : iceActive,
      packaging: type === 'packaging' ? newValue : packActive,
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
    if (!b) return { brokenCount: 0, daysRemaining: 0 };
    const rem = (b.daysRemaining || []).filter(d => d > 0);
    const count = rem.length > 0 ? rem.length : (b.daysRemaining && b.daysRemaining.length === 0 ? 0 : (b.brokenCount || 0));
    return {
      brokenCount: count,
      daysRemaining: rem.length > 0 ? rem[0] : 0
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

  return (
    <>
      {/* ── Compact Collapsible Trigger Card below Operations Advisor ── */}
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
        className="bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white p-3 flex items-center justify-between shadow-[0_2px_0_#7b1fa2] rounded-2xl cursor-pointer hover:from-fuchsia-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 transition-all select-none shrink-0"
        title="Click to open Factory Floor machinery, capacity, and operations drawer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-9 rounded-lg bg-white/20 grid place-items-center shrink-0">
            <Cog className="w-5 h-5 text-white" />
          </span>
          <div className="min-w-0">
            <div className="font-extrabold text-sm tracking-wide">FACTORY FLOOR</div>
            <div className="text-[11px] text-white/85 truncate">Machinery & production lines</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-extrabold bg-white/20 border border-white/30 rounded-full px-2.5 py-1 tracking-wider uppercase">
            {machines.filter(m => m.mData.active > 0).length} / {machines.length} ACTIVE
          </span>
        </div>
      </div>

      {/* ── Polished Left-Side Drawer Overlay ── */}
      {isDrawerOpen && (
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex justify-start z-50 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-[#fffdfb] h-full max-h-screen shadow-2xl flex flex-col z-50 border-r border-purple-200 animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <header className="px-5 py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white font-extrabold tracking-wide text-sm flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="size-7 rounded-lg bg-white/20 border border-white/40 flex items-center justify-center text-sm">⚙️</span>
                <span className="text-base font-black tracking-tight">FACTORY FLOOR OPERATIONS</span>
                <span className="text-[9.5px] font-bold bg-white/20 border border-white/30 rounded-full px-2.5 py-0.5 tracking-widest uppercase">
                  {machines.filter(m => m.mData.active > 0).length} / {machines.length} Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer border-none"
                title="Close Factory Floor (Esc)"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Drawer Scrollable Content */}
            <div className="overflow-y-auto flex-1 flex flex-col min-h-0 p-4 sm:p-5 gap-4">

              {/* Operations Navigation Header Strip */}
              <div className="grid grid-cols-[1.25fr_1.05fr_1.05fr_0.8fr] gap-1 px-3 py-1.5 bg-rose-50/50 border border-rose-100 rounded-xl text-[8px] font-extrabold text-stone-500 uppercase tracking-wider text-center shrink-0">
                <div className="text-left flex items-center gap-1">
                  <Cog className="w-3 h-3 text-stone-400" />
                  <span>MACHINE</span>
                </div>
                <div className="flex items-center justify-center gap-0.5 text-emerald-700">
                  <Zap className="w-3 h-3" />
                  <span>AVAILABLE CAPACITY</span>
                </div>
                <div className="flex items-center justify-center gap-0.5 text-purple-700">
                  <Activity className="w-3 h-3" />
                  <span>OPERATING CAPACITY</span>
                </div>
                <div className="text-right pr-2">
                  <span>BUY</span>
                </div>
              </div>

              {/* ══════════════ 4 MACHINE CARDS (MIXER, OVEN, ICING, PACKAGING) ══════════════ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                {machines.map(({ type, label, state, setter, mData, cost }) => {
                  const meta         = MACHINE_META[type];
                  const inTransit    = mData.inTransit || 0;
                  const totalCount   = mData.count + inTransit;
                  const canAfford    = teamState.cash >= cost;
                  const isProcuring  = inTransit > 0;
                  const unitCapacity = CAPACITY_PER_MACHINE[type];
                  const leadTime     = (room?.scenarioConfig?.machineSettings?.[type] as any)?.leadTime
                    || (room?.scenarioConfig?.leadTimes as any)?.machines?.[type]
                    || room?.scenarioConfig?.leadTimes?.machineProcurement
                    || (room?.difficulty === 'intermediate' ? 5 : room?.difficulty === 'advanced' ? 6 : 3);

                  // Available Capacity = Total Owned Floor Machines × Capacity Per Machine
                  const availableCapacity = mData.count * unitCapacity;

                  // Operating Capacity
                  const { brokenCount, daysRemaining: repairDays } = getMachineBreakdown(type);
                  const runningCount = Math.max(0, mData.active - brokenCount);
                  const operatingCapacity = runningCount * unitCapacity;

                  return (
                    <div
                      key={type}
                      className="rounded-2xl border border-stone-200/90 bg-white p-3 shadow-xs space-y-2.5 hover:border-purple-300 transition-all flex flex-col justify-between"
                    >
                      {/* Top Section: Machine Info Box + Stepper */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: Icon & Machine Name & Details */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-2xl shrink-0">{meta.icon}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-stone-800 font-sans truncate leading-tight">
                              {label}
                            </div>
                            <div className="text-[8.5px] font-semibold text-stone-400 font-sans truncate">
                              {meta.processDesc}
                            </div>
                            <div className="flex items-center flex-wrap gap-1 mt-0.5 text-[8.5px] font-bold text-stone-500 font-mono">
                              <span>{mData.count} owned · {mData.active} active</span>
                              <span className="text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded text-[7.5px] font-bold">
                                Lead Time: {leadTime} {leadTime === 1 ? 'Day' : 'Days'}
                              </span>
                              {isProcuring && (
                                <span className="text-amber-700 bg-amber-50 border border-amber-300 px-1 py-0.2 rounded text-[7.5px] font-bold flex items-center gap-0.5 animate-pulse">
                                  🚚 +{inTransit} in transit
                                </span>
                              )}
                              {brokenCount > 0 && repairDays > 0 && (
                                <span className="text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded text-[7.5px] font-bold inline-flex items-center gap-1 shadow-2xs">
                                  <span>⚠️ {brokenCount} broken</span>
                                  <span className="text-stone-300">|</span>
                                  <span className="text-red-600 font-extrabold">Repair: {repairDays}d</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Stepper controls */}
                        <div className="flex items-center rounded-xl border border-[#d8ccbb] overflow-hidden bg-white shrink-0 shadow-xs">
                          {isController ? (
                            <button
                              type="button"
                              disabled={state <= 0}
                              onClick={() => {
                                const newVal = Math.max(0, state - 1);
                                setter(newVal);
                                updateSingle(type, newVal);
                              }}
                              title={state <= 0 ? `No active ${label} machines` : `Deactivate one ${label}`}
                              className={`w-7 h-7 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-sm flex items-center justify-center transition-all border-none select-none leading-none ${
                                state <= 0 ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-85'
                              }`}
                            >
                              −
                            </button>
                          ) : null}
                          <div
                            className="px-2 h-7 bg-white text-[#1c1917] text-xs font-extrabold flex items-center justify-center font-mono border-x border-[#d8ccbb] select-none min-w-[48px]"
                            title={`${state} active / ${totalCount} total (${mData.count} floor${isProcuring ? `, ${inTransit} transit` : ''})`}
                          >
                            {state} : {totalCount}
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
                              className={`w-7 h-7 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-sm flex items-center justify-center transition-all border-none select-none leading-none ${
                                state >= mData.count ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-85'
                              }`}
                            >
                              +
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Bottom Section: Available Capacity Box + Operating Capacity Box + Buy Button */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-dashed border-stone-100">
                        {/* Available Capacity Box */}
                        <div
                          className="flex-1 rounded-xl bg-emerald-50/80 border border-emerald-200/90 px-1.5 py-1 flex flex-col justify-center items-center text-center shadow-xs"
                          title={`Available Capacity: ${mData.count} owned machine(s) × ${unitCapacity} units/day = ${availableCapacity} units/day`}
                        >
                          <div className="text-[7px] font-extrabold text-emerald-700 uppercase tracking-tight flex items-center justify-center gap-0.5 leading-none">
                            <Zap className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span>AVAILABLE CAPACITY</span>
                          </div>
                          <div className="text-xs font-black text-emerald-800 font-mono mt-0.5 leading-none">
                            {availableCapacity}
                          </div>
                          <div className="text-[7px] font-bold text-emerald-600/80 uppercase tracking-tight mt-0.5 leading-none">
                            {mData.count} × {unitCapacity} un/d
                          </div>
                        </div>

                        {/* Operating Capacity Box */}
                        <div
                          className="flex-1 rounded-xl bg-purple-50/80 border border-purple-200/90 px-1.5 py-1 flex flex-col justify-center items-center text-center shadow-xs"
                          title={`Shared Factory Operating Capacity = MIN(Mixer, Oven, Icing, Packaging) = ${factoryOperatingCapacity} units/day (Stage capacity: ${operatingCapacity} units/day)`}
                        >
                          <div className="text-[7px] font-extrabold text-purple-700 uppercase tracking-tight flex items-center justify-center gap-0.5 leading-none">
                            <Activity className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                            <span>OPERATING CAPACITY</span>
                          </div>
                          <div className="text-xs font-black text-purple-800 font-mono mt-0.5 leading-none">
                            {factoryOperatingCapacity}
                          </div>
                          <div className="text-[7px] font-bold text-purple-600/80 uppercase tracking-tight mt-0.5 leading-none">
                            Factory Bottleneck Min
                          </div>
                        </div>

                        {/* Buy Button */}
                        <div className="shrink-0 flex items-center">
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
                              className={`h-8 px-3 bg-gradient-to-b from-[#8e24aa] to-[#7b1fa2] hover:from-[#9c27b0] hover:to-[#6a1b9a] text-white rounded-xl text-[9.5px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm border-none shrink-0 select-none ${
                                !canAfford || isBuying === type ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>{isBuying === type ? 'BUYING...' : 'BUY'}</span>
                            </button>
                          ) : (
                            <div className="h-8 w-12 bg-stone-100 rounded-xl flex items-center justify-center text-[8px] text-stone-400 font-bold uppercase shrink-0">
                              Locked
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ══════════════ 5. UTILIZATION SECTION ══════════════ */}
              <div className="shrink-0 bg-white border border-purple-100 rounded-2xl p-3.5 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px bg-stone-200 flex-1" />
                  <span className="text-[9px] font-extrabold text-[#7b1fa2] tracking-widest uppercase">Machine Utilization</span>
                  <div className="h-px bg-stone-200 flex-1" />
                </div>
                <div className="rounded-xl border border-rose-100/50 bg-[#fffdfa] px-3 py-2 grid grid-cols-4 gap-2 text-center">
                  {([ 'mixing', 'baking', 'icing', 'packaging' ] as MachineType[]).map((type) => {
                    const meta = MACHINE_META[type];
                    const labels: Record<MachineType, string> = { mixing: 'Mixer', baking: 'Oven', icing: 'Icing', packaging: 'Packer' };
                    const histUtil = teamState.history?.utilization?.[type];
                    let currentUtil = 0;
                    if (histUtil && histUtil.length > 0) {
                      currentUtil = histUtil[histUtil.length - 1];
                    } else if ((teamState.report as any)?.machineUtilization?.[type] !== undefined) {
                      currentUtil = (teamState.report as any).machineUtilization[type];
                    } else {
                      const unitCap = CAPACITY_PER_MACHINE[type];
                      const act = (teamState.machines as any)?.[type]?.active ?? 1;
                      const brk = getMachineBreakdown(type).brokenCount;
                      const operCap = Math.max(0, act - brk) * unitCap;
                      const allRunningCaps = ([ 'mixing', 'baking', 'icing', 'packaging' ] as MachineType[]).map(t => {
                        const a = (teamState.machines as any)?.[t]?.active ?? 1;
                        const b = getMachineBreakdown(t).brokenCount;
                        return Math.max(0, a - b) * CAPACITY_PER_MACHINE[t];
                      });
                      const bottleneckCap = Math.min(...allRunningCaps);
                      currentUtil = operCap > 0 ? Math.min(100, Math.round((bottleneckCap / operCap) * 100)) : 0;
                    }
                    return (
                      <div key={type} className="flex flex-col items-center justify-between min-w-0">
                        <span className="text-[8.5px] font-bold text-stone-600 truncate">{labels[type]}</span>
                        <div className="my-1 shrink-0">
                          <ProgressRing value={currentUtil} color={meta.utilColor} />
                        </div>
                        <div className={`size-1.5 rounded-full ${meta.dotClass}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ══════════════ 6. OUTPUT ALLOCATION STRATEGY SECTION ══════════════ */}
              <div className="shrink-0 bg-white border border-purple-100 rounded-2xl p-3.5 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
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
                          className={`w-full py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#f3e5f5] border-[#9c27b0] text-[#7b1fa2] shadow-sm font-extrabold'
                              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                          disabled={!isController}
                        >
                          <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[#7b1fa2]' : 'text-stone-400'}`} />
                          <span className="text-[8.5px] font-bold text-center tracking-wide leading-tight">{strat.label}</span>
                        </button>
                        {isSelected && (
                          <div className="absolute -bottom-1.5 size-4 rounded-full bg-[#7b1fa2] text-white flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 font-bold" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ══════════════ 7. EXISTING APPLY OPERATIONS CONTROLS ══════════════ */}
              <div className="shrink-0 pt-1">
                {isController ? (
                  <button
                    onClick={handleApplyOperations}
                    className="w-full py-3 rounded-xl bg-gradient-to-b from-fuchsia-600 to-purple-700 text-white font-extrabold text-xs shadow-[0_3px_0_#7b1fa2] hover:translate-y-[1px] hover:shadow-[0_2px_0_#7b1fa2] active:translate-y-[3px] active:shadow-none transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🧁</span>
                    <span>APPLY OPERATIONS</span>
                  </button>
                ) : (
                  <div className="py-2.5 bg-slate-100 border border-slate-200 text-[10px] rounded-xl text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
                    <Info className="w-3.5 h-3.5" />
                    <span>OBSERVER MODE – READ ONLY</span>
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-3 bg-[#faf5f0] border-t border-[#e8dfd3] flex items-center justify-between text-xs text-stone-500 shrink-0">
              <span className="font-mono text-[10px]">
                {room?.name} ({room?.code}) • Press ESC to close
              </span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all border-none"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(MachinePanel);
