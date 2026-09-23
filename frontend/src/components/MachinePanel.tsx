import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import {
  Info, ShoppingCart, TrendingUp, Scale, FileCheck, Check,
  Zap, Activity
} from 'lucide-react';
import { MachineType } from '../../../backend/src/types/index.js';

// Capacity constants (units per day per machine)
const CAPACITY_PER_MACHINE: Record<MachineType, number> = {
  mixing: 100,
  baking: 80,
  icing: 120,
  packaging: 150,
};

// Theme colours per machine type
const MACHINE_THEME: Record<MachineType, {
  gradient: string;
  border: string;
  badge: string;
  icon: string;
  accent: string;
  dot: string;
  ring: string;
  utilColor: string;
  dotClass: string;
}> = {
  mixing: {
    gradient: 'from-violet-500 to-purple-600',
    border: 'border-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: '🥣',
    accent: 'text-violet-600',
    dot: 'bg-violet-400',
    ring: 'ring-violet-200',
    utilColor: '#c084fc',
    dotClass: 'bg-purple-400',
  },
  baking: {
    gradient: 'from-orange-500 to-amber-600',
    border: 'border-orange-200',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: '🥧',
    accent: 'text-orange-600',
    dot: 'bg-orange-400',
    ring: 'ring-orange-200',
    utilColor: '#fb923c',
    dotClass: 'bg-orange-400',
  },
  icing: {
    gradient: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🍦',
    accent: 'text-emerald-600',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-200',
    utilColor: '#4ade80',
    dotClass: 'bg-green-400',
  },
  packaging: {
    gradient: 'from-blue-500 to-indigo-600',
    border: 'border-blue-200',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '🎁',
    accent: 'text-blue-600',
    dot: 'bg-blue-400',
    ring: 'ring-blue-200',
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
  const { teamState, role, buyMachine, updateAllMachineStatuses, updateAllocationStrategy } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
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

  // ─── Machine definitions ───────────────────────────────────────────────────
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

  return (
    <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden flex flex-col shrink-0" style={{ height: '37rem' }}>

      {/* ── Panel Header ── */}
      <header className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-extrabold tracking-wide text-sm flex items-center gap-2 shrink-0">
        <span className="size-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-xs">⚙️</span>
        FACTORY FLOOR
        <span className="ml-auto text-[9px] font-bold bg-white/15 border border-white/30 rounded-full px-2 py-0.5 tracking-widest uppercase">
          {machines.filter(m => m.mData.active > 0).length} / {machines.length} Active
        </span>
      </header>

      {/* ── Scrollable Content ── */}
      <div className="overflow-y-auto flex-1 flex flex-col min-h-0 p-2.5 gap-2">

        {/* ══════════════ MACHINE CARDS ══════════════ */}
        <div className="space-y-2 shrink-0">
          {machines.map(({ type, label, state, setter, mData, cost }) => {
            const theme        = MACHINE_THEME[type];
            const inTransit    = mData.inTransit || 0;
            const totalCount   = mData.count;          // owned (on floor)
            const displayTotal = mData.count + inTransit; // for stepper display
            const canAfford    = teamState.cash >= cost;
            const isProcuring  = inTransit > 0;

            // ── Capacity formulas ──────────────────────────────────────────
            // Available = machines on floor × capacity/machine
            const availableCapacity = totalCount * CAPACITY_PER_MACHINE[type];
            // Operating = active machines × capacity/machine
            const operatingCapacity = mData.active * CAPACITY_PER_MACHINE[type];
            // Utilization %
            const histUtil     = teamState.history?.utilization?.[type];
            const utilPct      = histUtil && histUtil.length > 0 ? histUtil[histUtil.length - 1] : 0;

            return (
              <div
                key={type}
                className={`rounded-xl border ${theme.border} bg-white shadow-sm overflow-hidden`}
              >
                {/* ── Card header band ── */}
                <div className={`bg-gradient-to-r ${theme.gradient} px-3 py-1.5 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{theme.icon}</span>
                    <span className="text-white font-extrabold text-[11px] tracking-wide">{label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Transit badge */}
                    {isProcuring && (
                      <span className="text-[8px] font-extrabold bg-white/20 border border-white/40 text-white px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-0.5">
                        🚚 +{inTransit} in transit
                      </span>
                    )}
                    {/* Active indicator */}
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                      mData.active > 0
                        ? 'bg-white/25 text-white border border-white/40'
                        : 'bg-black/20 text-white/60 border border-white/20'
                    }`}>
                      <span className={`size-1.5 rounded-full ${mData.active > 0 ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
                      {mData.active > 0 ? 'RUNNING' : 'IDLE'}
                    </span>
                  </div>
                </div>

                {/* ── Card body: 3 columns ── */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-0 divide-x divide-stone-100">

                  {/* Col 1: Capacity stats + stepper */}
                  <div className="p-2 flex flex-col gap-1.5">
                    {/* Machine count pill */}
                    <div className="flex items-center gap-1 text-[9px] text-stone-500 font-bold">
                      <span className={`size-1.5 rounded-full ${theme.dot}`} />
                      <span className="font-mono">{mData.count} owned · {mData.active} active</span>
                    </div>

                    {/* Stats row: Available & Operating */}
                    <div className="grid grid-cols-2 gap-1">
                      {/* Available Capacity */}
                      <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-1.5 py-1 text-center">
                        <div className="text-[7px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center justify-center gap-0.5 mb-0.5">
                          <Zap className="w-2 h-2" /> AVAILABLE
                        </div>
                        <div className="text-[13px] font-black text-emerald-700 leading-none">
                          {availableCapacity}
                        </div>
                        <div className="text-[6.5px] text-emerald-500 font-bold mt-0.5 uppercase tracking-wider">units/day</div>
                      </div>

                      {/* Operating Capacity */}
                      <div className="rounded-lg bg-purple-50 border border-purple-100 px-1.5 py-1 text-center">
                        <div className="text-[7px] font-extrabold text-purple-600 uppercase tracking-wider flex items-center justify-center gap-0.5 mb-0.5">
                          <Activity className="w-2 h-2" /> OPERATING
                        </div>
                        <div className="text-[13px] font-black text-purple-700 leading-none">
                          {operatingCapacity}
                        </div>
                        <div className="text-[6.5px] text-purple-500 font-bold mt-0.5 uppercase tracking-wider">units/day</div>
                      </div>
                    </div>

                    {/* Utilization mini-bar */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${utilPct}%`, background: theme.utilColor }}
                        />
                      </div>
                      <span className="text-[8px] font-bold text-stone-500 font-mono w-7 text-right">{utilPct}%</span>
                    </div>
                  </div>

                  {/* Col 2: Active / Total Stepper */}
                  <div className="flex flex-col items-center justify-center px-2 gap-0.5 bg-stone-50/60">
                    <span className="text-[7px] font-extrabold text-stone-400 uppercase tracking-widest mb-0.5">Active</span>
                    <div className="flex items-center rounded-lg border border-[#d8ccbb] overflow-hidden bg-white shadow-xs">
                      {isController ? (
                        <button
                          type="button"
                          disabled={state <= 0}
                          onClick={() => { const v = Math.max(0, state - 1); setter(v); updateSingle(type, v); }}
                          title={state <= 0 ? `No active ${label} machines` : `Deactivate one ${label}`}
                          className={`w-7 h-7 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-sm flex items-center justify-center transition-all border-none select-none leading-none ${
                            state <= 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-80'
                          }`}
                        >−</button>
                      ) : null}
                      <div
                        className="px-1.5 h-7 bg-white text-[#1c1917] text-[10px] font-extrabold flex items-center justify-center font-mono border-x border-[#d8ccbb] select-none min-w-[42px]"
                        title={`${state} active / ${displayTotal} total (${mData.count} floor${isProcuring ? `, ${inTransit} transit` : ''})`}
                      >
                        {state} : {displayTotal}
                      </div>
                      {isController ? (
                        <button
                          type="button"
                          disabled={state >= mData.count}
                          onClick={() => { const v = Math.min(mData.count, state + 1); setter(v); updateSingle(type, v); }}
                          title={
                            state >= mData.count
                              ? isProcuring
                                ? 'Cannot activate: machine in transit'
                                : `All ${label} machines are active`
                              : `Activate one more ${label}`
                          }
                          className={`w-7 h-7 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-sm flex items-center justify-center transition-all border-none select-none leading-none ${
                            state >= mData.count ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-80'
                          }`}
                        >+</button>
                      ) : null}
                    </div>
                    <span className="text-[6.5px] text-stone-400 font-bold mt-0.5">of {totalCount} owned</span>
                  </div>

                  {/* Col 3: BUY button */}
                  <div className="flex flex-col items-center justify-center px-2 bg-stone-50/40">
                    {isController ? (
                      isProcuring ? (
                        <button
                          type="button"
                          disabled
                          title={`A ${label} is already ordered and in transit. Wait for delivery.`}
                          className="flex flex-col items-center gap-0.5 px-2.5 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl cursor-not-allowed select-none"
                        >
                          <span className="text-sm">🚚</span>
                          <span className="text-[8px] font-extrabold tracking-wider">ORDERED</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford || isBuying === type}
                          onClick={() => handleBuy(type)}
                          title={
                            !canAfford
                              ? `Need ₹${cost.toLocaleString()} — You have ₹${teamState.cash.toLocaleString()}`
                              : `Buy additional ${label} for ₹${cost.toLocaleString()}`
                          }
                          className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl border-none transition-all active:scale-95 select-none ${
                            !canAfford || isBuying === type
                              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              : `bg-gradient-to-b ${theme.gradient} text-white cursor-pointer shadow-sm hover:opacity-90`
                          }`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span className="text-[8px] font-extrabold tracking-wider">
                            {isBuying === type ? '...' : 'BUY'}
                          </span>
                          <span className="text-[6px] font-bold opacity-80">₹{(cost / 1000).toFixed(0)}K</span>
                        </button>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 px-2.5 py-2">
                        <Info className="w-4 h-4 text-stone-300" />
                        <span className="text-[7px] text-stone-400 font-bold uppercase">Locked</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* ══════════════ UTILIZATION ══════════════ */}
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-px bg-stone-200 flex-1" />
            <span className="text-[8.5px] font-extrabold text-[#7b1fa2] tracking-widest uppercase">Utilization</span>
            <div className="h-px bg-stone-200 flex-1" />
          </div>
          <div className="rounded-xl border border-rose-100/50 bg-[#fffdfa] px-2 py-1.5 grid grid-cols-4 gap-1 text-center">
            {([ 'mixing', 'baking', 'icing', 'packaging' ] as MachineType[]).map((type) => {
              const t = MACHINE_THEME[type];
              const labels: Record<MachineType, string> = { mixing: 'Mixer', baking: 'Oven', icing: 'Icing', packaging: 'Packer' };
              const histUtil = teamState.history?.utilization?.[type];
              const currentUtil = histUtil && histUtil.length > 0 ? histUtil[histUtil.length - 1] : 0;
              return (
                <div key={type} className="flex flex-col items-center justify-between min-w-0">
                  <span className="text-[8px] font-bold text-stone-600 truncate">{labels[type]}</span>
                  <div className="my-0.5 shrink-0">
                    <ProgressRing value={currentUtil} color={t.utilColor} />
                  </div>
                  <div className={`size-1.5 rounded-full ${t.dotClass}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════ OUTPUT ALLOCATION STRATEGY ══════════════ */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-px bg-stone-200 flex-1" />
              <span className="text-[8.5px] font-extrabold text-[#7b1fa2] tracking-widest uppercase">Output Allocation</span>
              <div className="h-px bg-stone-200 flex-1" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'contracts_first', label: 'CONTRACT FIRST', icon: FileCheck },
                { id: 'market_first',   label: 'MARKET FORECAST', icon: TrendingUp },
                { id: 'split',          label: 'SPLIT EQUAL',     icon: Scale },
              ].map(strat => {
                const IconComponent = strat.icon;
                const isSelected = currentStrategy === strat.id;
                return (
                  <div key={strat.id} className="relative flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => isController && updateAllocationStrategy(strat.id as any)}
                      className={`w-full py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#f3e5f5] border-[#9c27b0] text-[#7b1fa2] shadow-sm font-extrabold'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                      disabled={!isController}
                    >
                      <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[#7b1fa2]' : 'text-stone-400'}`} />
                      <span className="text-[8px] font-bold text-center tracking-wide leading-tight">{strat.label}</span>
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

          {/* Apply Operations Button */}
          <div className="mt-2.5 shrink-0">
            {isController ? (
              <button
                onClick={handleApplyOperations}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-fuchsia-500 to-purple-600 text-white font-extrabold text-xs shadow-[0_3px_0_#7b1fa2] hover:translate-y-[1px] hover:shadow-[0_2px_0_#7b1fa2] active:translate-y-[3px] active:shadow-none transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
              >
                🧁 APPLY OPERATIONS
              </button>
            ) : (
              <div className="py-2.5 bg-slate-100 border border-slate-200 text-[10px] rounded-xl text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
                <Info className="w-3.5 h-3.5" />
                <span>OBSERVER MODE</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default React.memo(MachinePanel);
