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
  border: string;
  badge: string;
  icon: string;
  accent: string;
  dot: string;
  utilColor: string;
  dotClass: string;
}> = {
  mixing: {
    border: 'border-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: '🥣',
    accent: 'text-violet-600',
    dot: 'bg-violet-400',
    utilColor: '#c084fc',
    dotClass: 'bg-purple-400',
  },
  baking: {
    border: 'border-orange-200',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: '🥧',
    accent: 'text-orange-600',
    dot: 'bg-orange-400',
    utilColor: '#fb923c',
    dotClass: 'bg-orange-400',
  },
  icing: {
    border: 'border-emerald-200',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🍦',
    accent: 'text-emerald-600',
    dot: 'bg-emerald-400',
    utilColor: '#4ade80',
    dotClass: 'bg-green-400',
  },
  packaging: {
    border: 'border-blue-200',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '🎁',
    accent: 'text-blue-600',
    dot: 'bg-blue-400',
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
      <div className="overflow-y-auto flex-1 flex flex-col min-h-0 p-2.5 gap-2.5">

        {/* ══════════════ MACHINE CARDS ══════════════ */}
        <div className="space-y-2.5 shrink-0">
          {machines.map(({ type, label, state, setter, mData, cost }) => {
            const theme        = MACHINE_THEME[type];
            const inTransit    = mData.inTransit || 0;
            const totalCount   = mData.count + inTransit;
            const canAfford    = teamState.cash >= cost;
            const isProcuring  = inTransit > 0;

            // ── Capacity formulas ──────────────────────────────────────────
            // Available Capacity = owned machines × capacity/machine
            const availableCapacity = mData.count * CAPACITY_PER_MACHINE[type];
            // Operating Capacity = active machines × capacity/machine
            const operatingCapacity = mData.active * CAPACITY_PER_MACHINE[type];

            return (
              <div
                key={type}
                className="rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-xs space-y-2 hover:border-purple-200 transition-colors"
              >
                {/* ── Top Half: Machine Info + Stepper ── */}
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Icon & Machine Name & Subtitle */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{theme.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-stone-800 font-sans truncate leading-tight">
                        {label}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[8.5px] font-bold text-stone-400">
                        <span>{mData.count} owned · {mData.active} active</span>
                        {isProcuring && (
                          <span className="text-amber-700 bg-amber-50 border border-amber-300 px-1 py-0.2 rounded text-[7.5px] font-bold flex items-center gap-0.5 animate-pulse">
                            🚚 +{inTransit} in transit
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
                      className="px-2 h-7 bg-white text-[#1c1917] text-xs font-extrabold flex items-center justify-center font-mono border-x border-[#d8ccbb] select-none min-w-[50px]"
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

                {/* ── Bottom Half: Available Capacity Box + Operating Capacity Box + BUY Button ── */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-dashed border-stone-100">
                  {/* Available Capacity Box */}
                  <div className="flex-1 rounded-xl bg-emerald-50/80 border border-emerald-200/90 px-2 py-1 flex flex-col justify-center items-center text-center shadow-xs">
                    <div className="text-[7.5px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-0.5 leading-none">
                      <Zap className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span>AVAILABLE</span>
                    </div>
                    <div className="text-xs font-black text-emerald-800 font-mono mt-0.5 leading-none">
                      {availableCapacity}
                    </div>
                    <div className="text-[6.5px] font-bold text-emerald-600/80 uppercase tracking-tight mt-0.5 leading-none">
                      units/day
                    </div>
                  </div>

                  {/* Operating Capacity Box */}
                  <div className="flex-1 rounded-xl bg-purple-50/80 border border-purple-200/90 px-2 py-1 flex flex-col justify-center items-center text-center shadow-xs">
                    <div className="text-[7.5px] font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-0.5 leading-none">
                      <Activity className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                      <span>OPERATING</span>
                    </div>
                    <div className="text-xs font-black text-purple-800 font-mono mt-0.5 leading-none">
                      {operatingCapacity}
                    </div>
                    <div className="text-[6.5px] font-bold text-purple-600/80 uppercase tracking-tight mt-0.5 leading-none">
                      units/day
                    </div>
                  </div>

                  {/* BUY / ORDERED Button (Horizontal pill matching previous design) */}
                  <div className="shrink-0 flex items-center">
                    {isController ? (
                      isProcuring ? (
                        <button
                          type="button"
                          disabled
                          title={`A ${label} machine is currently ordered and in transit! You cannot buy another until this one arrives.`}
                          className="h-8 px-2.5 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-not-allowed shadow-xs select-none"
                        >
                          <span className="text-xs">🚚</span>
                          <span>ORDERED</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford || isBuying === type}
                          onClick={() => handleBuy(type)}
                          title={
                            !canAfford
                              ? `Need ₹${cost.toLocaleString()} (Cash: ₹${teamState.cash.toLocaleString()})`
                              : `Procure additional ${label} machine for ₹${cost.toLocaleString()}`
                          }
                          className={`h-8 px-3.5 bg-gradient-to-b from-[#8e24aa] to-[#7b1fa2] hover:from-[#9c27b0] hover:to-[#6a1b9a] text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm border-none shrink-0 select-none ${
                            !canAfford || isBuying === type ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{isBuying === type ? 'ORDERING...' : 'BUY'}</span>
                        </button>
                      )
                    ) : (
                      <div className="h-8 w-14 bg-stone-100 rounded-xl flex items-center justify-center text-[8px] text-stone-400 font-bold uppercase shrink-0">
                        Locked
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
