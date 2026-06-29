import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Info } from 'lucide-react';
import { MachineType } from '../../../backend/src/types/index.js';

export default function MachinePanel() {
  const { teamState, role, buyMachine, updateAllMachineStatuses, updateAllocationStrategy } = useGameStore();

  const [mixActive, setMixActive] = useState(1);
  const [bakeActive, setBakeActive] = useState(1);
  const [iceActive, setIceActive] = useState(1);
  const [packActive, setPackActive] = useState(1);

  const isController = role === 'controller';

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

  const handleStopAll = () => {
    setMixActive(0);
    setBakeActive(0);
    setIceActive(0);
    setPackActive(0);
    useGameStore.getState().stopAllMachines();
    alert('All machines stopped!');
  };

  if (!teamState) return null;

  const { mixing, baking, icing, packaging } = teamState.machines;
  const currentStrategy = (teamState as any).allocationStrategy || 'contracts_first';

  const getUtilColor = (type: MachineType) => {
    if (type === 'mixing') return 'bg-violet-400';
    if (type === 'baking') return 'bg-amber-400';
    if (type === 'icing') return 'bg-pink-400';
    return 'bg-sky-400';
  };

  return (
    <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden flex flex-col shrink-0" style={{ height: '22.5rem' }}>
      {/* Header */}
      <header className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white font-extrabold tracking-wide text-sm flex items-center gap-2 shrink-0">
        <span className="size-6 rounded-md bg-white/25 grid place-items-center">🧁</span>
        WORKFLOOR ACTIVITY
      </header>

      {/* Content */}
      <div className="p-3 overflow-y-auto flex-1 space-y-2">
        {[
          { type: 'mixing' as MachineType, label: 'Mixing', state: mixActive, setter: setMixActive, mData: mixing, cost: 2000, icon: '🥣' },
          { type: 'baking' as MachineType, label: 'Baking', state: bakeActive, setter: setBakeActive, mData: baking, cost: 3000, icon: '🥧' },
          { type: 'icing' as MachineType, label: 'Icing', state: iceActive, setter: setIceActive, mData: icing, cost: 1500, icon: '🍦' },
          { type: 'packaging' as MachineType, label: 'Packaging', state: packActive, setter: setPackActive, mData: packaging, cost: 1000, icon: '🎁' },
        ].map(({ type, label, state, setter, mData, cost, icon }) => {
          const histUtil = teamState.history?.utilization?.[type];
          const currentUtil = histUtil && histUtil.length > 0 ? histUtil[histUtil.length - 1] : 0;

          return (
            <div key={type} className="flex items-center gap-2 text-stone-700">
              {/* Left label area */}
              <div className="flex flex-col justify-center w-24 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span className="text-xs font-bold text-stone-700">{label}</span>
                </div>
                {isController && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Procure additional ${label} machine for ₹${cost}? Lead Time: 5 days.`)) {
                        buyMachine(type);
                      }
                    }}
                    className="text-[7.5px] text-[#ba78d1] hover:text-[#9e63bc] font-bold tracking-wider uppercase hover:underline cursor-pointer text-left bg-transparent border-none p-0 mt-0.5"
                  >
                    + Buy (₹{cost})
                  </button>
                )}
                {mData.inTransit > 0 && (
                  <span className="text-[7.5px] text-orange-500 font-bold font-mono animate-pulse">
                    (+{mData.inTransit} Transit)
                  </span>
                )}
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isController ? (
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = Math.max(0, state - 1);
                      setter(newVal);
                      updateSingle(type, newVal);
                    }}
                    className="size-6 rounded-md bg-rose-100 text-rose-500 text-sm font-bold leading-none hover:bg-rose-200 cursor-pointer flex items-center justify-center border-none"
                  >
                    −
                  </button>
                ) : null}
                <div className="w-10 h-7 rounded-md bg-[#2b2640] text-white text-sm font-bold flex items-center justify-center">
                  {state}/{mData.count}
                </div>
                {isController ? (
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = Math.min(mData.count, state + 1);
                      setter(newVal);
                      updateSingle(type, newVal);
                    }}
                    className="size-6 rounded-md bg-emerald-100 text-emerald-600 text-sm font-bold leading-none hover:bg-emerald-200 cursor-pointer flex items-center justify-center border-none"
                  >
                    +
                  </button>
                ) : null}
              </div>

              {/* Utilization */}
              <div className="flex-1 min-w-0">
                <div className="text-[8px] font-bold text-stone-500 tracking-wider mb-0.5">UTILIZATION</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden border border-stone-200/50">
                    <div 
                      className={`h-full ${getUtilColor(type)} rounded-full`}
                      style={{ width: `${currentUtil}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-extrabold text-stone-600 w-8 text-right font-mono">{currentUtil}%</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Output strategy */}
        <div className="pt-2 border-t border-rose-100/50">
          <div className="text-[10px] font-extrabold text-stone-500 tracking-wider mb-1.5">OUTPUT ALLOCATION STRATEGY</div>
          <div className="flex gap-1.5">
            {[
              { id: 'contracts_first', label: 'CONTRACTS FIRST' },
              { id: 'market_first', label: 'MARKET FIRST' },
              { id: 'split', label: 'SPLIT EQUAL' }
            ].map(strat => (
              <button
                key={strat.id}
                type="button"
                onClick={() => isController && updateAllocationStrategy(strat.id as any)}
                className={`flex-1 text-[9px] font-extrabold tracking-wide py-1.5 rounded-md border transition-all cursor-pointer ${
                  currentStrategy === strat.id
                    ? 'bg-sky-100 text-sky-700 border-sky-200'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
                disabled={!isController}
              >
                {strat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2.5 shrink-0 flex gap-2">
        <button
          onClick={handleStopAll}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-rose-400 to-red-500 text-white font-extrabold text-xs shadow-[0_3px_0_#b91c1c] hover:translate-y-[1px] hover:shadow-[0_2px_0_#b91c1c] active:translate-y-[3px] active:shadow-none transition-all border-none cursor-pointer"
        >
          🛑 STOP ALL
        </button>
        {isController ? (
          <button
            onClick={handleApplyOperations}
            className="flex-[2] py-2.5 rounded-xl bg-gradient-to-b from-fuchsia-400 to-purple-500 text-white font-extrabold text-xs shadow-[0_3px_0_#7e22ce] hover:translate-y-[1px] hover:shadow-[0_2px_0_#7e22ce] active:translate-y-[3px] active:shadow-none transition-all border-none cursor-pointer"
          >
            🧁 APPLY OPERATIONS
          </button>
        ) : (
          <div className="flex-[2] py-2.5 bg-slate-100 border border-slate-200 text-[10px] rounded-xl text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
            <Info className="w-3.5 h-3.5" />
            <span>OBSERVER MODE</span>
          </div>
        )}
      </div>
    </div>
  );
}
