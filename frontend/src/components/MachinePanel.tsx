import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { Info, ShoppingCart, TrendingUp, Scale, FileCheck, Check } from 'lucide-react';
import { MachineType } from '../../../backend/src/types/index.js';

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

  const handleBuy = async (type: MachineType) => {
    if (!isController || isBuying) return;
    setIsBuying(type);
    try {
      await buyMachine(type);
    } finally {
      setTimeout(() => setIsBuying(null), 500);
    }
  };

  const prevConfigRef = React.useRef<{
    mix: number; bake: number; ice: number; pack: number;
    mixC: number; bakeC: number; iceC: number; packC: number;
  } | null>(null);

  useEffect(() => {
    if (teamState) {
      const { mixing, baking, icing, packaging } = teamState.machines;
      
      const currentConfig = {
        mix: mixing.active, bake: baking.active, ice: icing.active, pack: packaging.active,
        mixC: mixing.count, bakeC: baking.count, iceC: icing.count, packC: packaging.count
      };

      const prevConfig = prevConfigRef.current;
      
      let shouldUpdate = false;
      if (!prevConfig) {
        shouldUpdate = true;
      } else {
        if (prevConfig.mix !== currentConfig.mix || prevConfig.bake !== currentConfig.bake || prevConfig.ice !== currentConfig.ice || prevConfig.pack !== currentConfig.pack ||
            prevConfig.mixC !== currentConfig.mixC || prevConfig.bakeC !== currentConfig.bakeC || prevConfig.iceC !== currentConfig.iceC || prevConfig.packC !== currentConfig.packC) {
          shouldUpdate = true;
        }
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

  const handleApplyOperations = () => {
    if (!isController) return;
    updateAllMachineStatuses({
      mixing: mixActive,
      baking: bakeActive,
      icing: iceActive,
      packaging: packActive
    });
    alert('Workfloor machine operation parameters updated!');
  };

  const updateSingle = (type: string, newValue: number) => {
    if (!isController) return;
    updateAllMachineStatuses({
      mixing: type === 'mixing' ? newValue : mixActive,
      baking: type === 'baking' ? newValue : bakeActive,
      icing: type === 'icing' ? newValue : iceActive,
      packaging: type === 'packaging' ? newValue : packActive
    });
  };

  if (!teamState) return null;

  const { mixing, baking, icing, packaging } = teamState.machines;
  const currentStrategy = (teamState as any).allocationStrategy || 'contracts_first';

  const getUtilColor = (type: MachineType) => {
    if (type === 'mixing') return '#c084fc';
    if (type === 'baking') return '#fb923c';
    if (type === 'icing') return '#4ade80';
    return '#60a5fa';
  };

  const getDotColor = (type: MachineType) => {
    if (type === 'mixing') return 'bg-purple-400';
    if (type === 'baking') return 'bg-orange-400';
    if (type === 'icing') return 'bg-green-400';
    return 'bg-blue-400';
  };

  // SVG Circular Progress Ring
  function ProgressRing({ value, color }: { value: number; color: string }) {
    const radius = 28;
    const stroke = 5;
    const normalizedRadius = radius - stroke * 1.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <svg height={radius * 2} width={radius * 2} className="mx-auto select-none">
        {/* Background Circle */}
        <circle
          stroke="#f1f5f9"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress Circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-300"
          strokeLinecap="round"
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          className="text-[10px] font-extrabold fill-stone-700"
        >
          {value}%
        </text>
      </svg>
    );
  }

  // Default capacity constants per machine type (units per day)
  const CAPACITY_PER_MACHINE: Record<MachineType, number> = {
    mixing: 100,
    baking: 80,
    icing: 120,
    packaging: 150,
  };

  return (
    <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden flex flex-col shrink-0" style={{ height: '37rem' }}>
      {/* Header */}
      <header className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white font-extrabold tracking-wide text-sm flex items-center gap-2 shrink-0">
        <span className="size-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-xs">⚙️</span>
        FACTORY FLOOR
      </header>

      {/* Content */}
      <div className="p-3 overflow-y-auto flex-1 flex flex-col min-h-0 space-y-3">
        
        {/* Machine Rows */}
        <div className="space-y-2.5 shrink-0">
          {[
            { type: 'mixing' as MachineType, label: 'Mixer Machine', state: mixActive, setter: setMixActive, mData: mixing, cost: 2000, icon: '🥣' },
            { type: 'baking' as MachineType, label: 'Oven Machine', state: bakeActive, setter: setBakeActive, mData: baking, cost: 3000, icon: '🥧' },
            { type: 'icing' as MachineType, label: 'Icing Machine', state: iceActive, setter: setIceActive, mData: icing, cost: 1500, icon: '🍦' },
            { type: 'packaging' as MachineType, label: 'Packaging Machine', state: packActive, setter: setPackActive, mData: packaging, cost: 1000, icon: '🎁' },
          ].map(({ type, label, state, setter, mData, cost, icon }, idx) => {
            const inTransit = mData.inTransit || 0;
            const totalCount = mData.count + inTransit;
            const canAfford = teamState.cash >= cost;
            const isProcuring = inTransit > 0;
            const capPerMachine = CAPACITY_PER_MACHINE[type];
            const availableCapacity = mData.count * capPerMachine;
            const operatingCapacity = mData.active * capPerMachine;


            return (
              <div key={type} className={`flex items-center justify-between pb-2 ${idx < 3 ? 'border-b border-dashed border-stone-200/60' : ''}`}>
                
                {/* Process Info */}
                <div className="flex flex-col justify-center w-28 shrink-0 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl shrink-0">{icon}</span>
                    <span className="text-[10px] font-extrabold text-stone-700 font-sans leading-tight">{label}</span>
                  </div>
                  <div className="mt-0.5 space-y-0">
                    <div className="text-[7px] font-bold text-stone-400 tracking-wider uppercase flex items-center gap-1">
                      <span className="text-emerald-600">✓</span>
                      <span>AVAIL: <span className="text-emerald-700 font-extrabold">{availableCapacity}</span>/day</span>
                    </div>
                    <div className="text-[7px] font-bold text-stone-400 tracking-wider uppercase flex items-center gap-1">
                      <span className="text-purple-600">▶</span>
                      <span>OPER: <span className="text-purple-700 font-extrabold">{operatingCapacity}</span>/day</span>
                    </div>
                  </div>
                  {isProcuring && (
                    <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-300/80 px-1 py-0.2 rounded mt-0.5 inline-flex items-center gap-0.5 w-fit animate-pulse">
                      🚚 +{inTransit} transit
                    </span>
                  )}
                </div>


                {/* Stepper controls */}
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
                      className={`w-8 h-8 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-base flex items-center justify-center transition-all border-none select-none leading-none ${
                        state <= 0 ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-85'
                      }`}
                    >
                      −
                    </button>
                  ) : null}
                  <div
                    className="px-2 h-8 bg-white text-[#1c1917] text-xs font-extrabold flex items-center justify-center font-mono border-x border-[#d8ccbb] select-none min-w-[56px]"
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
                      className={`w-8 h-8 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-base flex items-center justify-center transition-all border-none select-none leading-none ${
                        state >= mData.count ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-85'
                      }`}
                    >
                      +
                    </button>
                  ) : null}
                </div>

                {/* BUY button */}
                {isController ? (
                  isProcuring ? (
                    <button
                      type="button"
                      disabled
                      title={`A ${label} machine is currently ordered and in transit! You cannot buy another until this one arrives.`}
                      className="px-2.5 py-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-not-allowed shrink-0 shadow-xs select-none"
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
                      className={`px-3 py-2 bg-gradient-to-b from-[#8e24aa] to-[#7b1fa2] hover:from-[#9c27b0] hover:to-[#6a1b9a] text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm border-none shrink-0 ${
                        !canAfford || isBuying === type ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{isBuying === type ? 'ORDERING...' : 'BUY'}</span>
                    </button>
                  )
                ) : (
                  <div className="w-14 h-8 bg-stone-100 rounded-xl flex items-center justify-center text-[8px] text-stone-400 font-bold uppercase shrink-0">
                    Locked
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── UTILIZATION Section ─── */}
        <div className="shrink-0">
          <div className="flex items-center justify-center gap-2 mb-2 text-center">
            <div className="h-px bg-stone-200 flex-1"></div>
            <span className="text-[9px] font-extrabold text-[#7b1fa2] tracking-widest uppercase">UTILIZATION</span>
            <div className="h-px bg-stone-200 flex-1"></div>
          </div>

          <div className="rounded-xl border border-rose-100/50 bg-[#fffdfa] p-2.5 grid grid-cols-4 gap-1 text-center">
            {[
              { type: 'mixing' as MachineType, label: 'Mixer' },
              { type: 'baking' as MachineType, label: 'Oven' },
              { type: 'icing' as MachineType, label: 'Icing Machine' },
              { type: 'packaging' as MachineType, label: 'Packaging Machine' },
            ].map(({ type, label }) => {
              const histUtil = teamState.history?.utilization?.[type];
              const currentUtil = histUtil && histUtil.length > 0 ? histUtil[histUtil.length - 1] : 0;
              return (
                <div key={type} className="flex flex-col items-center justify-between min-w-0">
                  <span className="text-[9px] font-bold text-stone-600 truncate">{label}</span>
                  <div className="my-1 shrink-0">
                    <ProgressRing value={currentUtil} color={getUtilColor(type)} />
                  </div>
                  <span className="text-[7.5px] font-semibold text-stone-400 tracking-wider">Utilization</span>
                  <div className={`size-1.5 rounded-full ${getDotColor(type)} mt-1`}></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── OUTPUT ALLOCATION STRATEGY Section ─── */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div>
            <div className="flex items-center justify-center gap-2 mb-2 text-center">
              <div className="h-px bg-stone-200 flex-1"></div>
              <span className="text-[9px] font-extrabold text-[#7b1fa2] tracking-widest uppercase">OUTPUT ALLOCATION STRATEGY</span>
              <div className="h-px bg-stone-200 flex-1"></div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'contracts_first', label: 'CONTRACT FIRST', icon: FileCheck },
                { id: 'market_first', label: 'MARKET FORECAST', icon: TrendingUp },
                { id: 'split', label: 'SPLIT EQUAL', icon: Scale }
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

          {/* Footer Apply Operations Button */}
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
