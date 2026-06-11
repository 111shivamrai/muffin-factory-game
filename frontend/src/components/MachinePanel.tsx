import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Info } from 'lucide-react';
import { MachineType } from '../../../backend/src/types/index.js';

export default function MachinePanel() {
  const { teamState, role, buyMachine, toggleMachineStatus, updateAllocationStrategy } = useGameStore();

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
    toggleMachineStatus('mixing', mixActive);
    toggleMachineStatus('baking', bakeActive);
    toggleMachineStatus('icing', iceActive);
    toggleMachineStatus('packaging', packActive);
    alert('Workfloor machine operation parameters updated!');
  };

  if (!teamState) return null;

  const { mixing, baking, icing, packaging } = teamState.machines;
  const currentStrategy = (teamState as any).allocationStrategy || 'contracts_first';

  const getUtilColor = (type: MachineType) => {
    if (type === 'mixing') return 'bg-purple-500';
    if (type === 'baking') return 'bg-orange-400';
    if (type === 'icing') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getUtilBg = (type: MachineType) => {
    if (type === 'mixing') return 'bg-purple-100';
    if (type === 'baking') return 'bg-orange-100';
    if (type === 'icing') return 'bg-green-100';
    return 'bg-blue-100';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="bg-[#b57ae6] text-white font-bold py-2 px-3 rounded-t-2xl font-pixel text-[9px] tracking-wider uppercase flex items-center space-x-2">
        <span className="text-xs">🧁</span>
        <span>Workfloor Activity</span>
      </div>

      {/* Machine rows */}
      <div className="p-2.5 space-y-2 font-sans text-xs">
        {[
          { type: 'mixing' as MachineType, label: 'Mixing', state: mixActive, setter: setMixActive, mData: mixing, cost: 2000, icon: '🥣' },
          { type: 'baking' as MachineType, label: 'Baking', state: bakeActive, setter: setBakeActive, mData: baking, cost: 3000, icon: '🧁' },
          { type: 'icing' as MachineType, label: 'Icing', state: iceActive, setter: setIceActive, mData: icing, cost: 1500, icon: '🍰' },
          { type: 'packaging' as MachineType, label: 'Packaging', state: packActive, setter: setPackActive, mData: packaging, cost: 1000, icon: '🎁' },
        ].map(({ type, label, state, setter, mData, cost, icon }) => {
          const histUtil = teamState.history?.utilization?.[type];
          const currentUtil = histUtil && histUtil.length > 0 ? histUtil[histUtil.length - 1] : 0;

          return (
            <div key={type} className="flex items-center justify-between text-slate-700">
              {/* Left Side: Label and Buy link */}
              <div className="flex flex-col justify-center w-20 shrink-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className="font-bold text-slate-800 text-[11px]">{label}</span>
                </div>
                {isController && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Procure additional ${label} machine for ₹${cost}? Lead Time: 5 days.`)) {
                        buyMachine(type);
                      }
                    }}
                    className="text-[7px] text-purple-600 hover:text-purple-700 font-pixel hover:underline cursor-pointer text-left bg-transparent border-none p-0"
                  >
                    + Buy (₹{cost})
                  </button>
                )}
                {mData.inTransit > 0 && (
                  <span className="text-[7px] text-orange-600 font-bold font-mono animate-pulse">
                    (+{mData.inTransit} Transit)
                  </span>
                )}
              </div>

              {/* Center: Controls */}
              <div className="flex items-center space-x-0.5 shrink-0">
                {isController && (
                  <button 
                    type="button"
                    onClick={() => setter((prev: number) => Math.max(0, prev - 1))}
                    className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 rounded cursor-pointer font-bold text-[10px]"
                  >
                    -
                  </button>
                )}
                <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden">
                  <input
                    type="number"
                    value={state}
                    onChange={(e) => setter(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    onBlur={() => setter((prev: any) => Math.max(0, Math.min(mData.count, parseInt(prev) || 0)))}
                    disabled={!isController}
                    className="w-6 text-center font-bold text-slate-700 bg-transparent px-0 py-0.5 text-[11px] font-mono focus:outline-none border-none hide-arrows"
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <span className="text-[11px] font-mono text-slate-400 pr-1 bg-slate-50 border-l border-slate-200 pl-1 py-0.5">/{mData.count}</span>
                </div>
                {isController && (
                  <button 
                    type="button"
                    onClick={() => setter((prev: number) => Math.min(mData.count, prev + 1))}
                    className="w-5 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 rounded cursor-pointer font-bold text-[10px]"
                  >
                    +
                  </button>
                )}
              </div>

              {/* Right: Utilization indicator */}
              <div className="flex items-center space-x-1.5 justify-end w-32 shrink-0">
                <span className="text-[7px] font-bold text-slate-400">UTILIZATION</span>
                <div className={`w-14 ${getUtilBg(type)} h-1.5 rounded-full overflow-hidden`}>
                  <div 
                    className={`h-full ${getUtilColor(type)} rounded-full`} 
                    style={{ width: `${Math.min(100, currentUtil)}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-bold text-slate-500 font-mono w-7 text-right">{currentUtil}%</span>
              </div>
            </div>
          );
        })}

        {/* Output Strategy */}
        <div className="border-t border-slate-100 pt-2 space-y-1">
          <label className="block text-[8px] text-slate-400 uppercase tracking-widest font-pixel font-bold">Output Allocation Strategy</label>
          <div className="grid grid-cols-3 gap-1 font-mono text-[8px]">
            {[
              { id: 'contracts_first', label: 'CONTRACTS FIRST' },
              { id: 'market_first', label: 'MARKET FIRST' },
              { id: 'split', label: 'SPLIT EQUAL' }
            ].map(strat => (
              <button
                key={strat.id}
                type="button"
                onClick={() => isController && updateAllocationStrategy(strat.id as any)}
                className={`py-1 text-center rounded-lg border font-bold transition-all cursor-pointer font-pixel text-[7px] ${
                  currentStrategy === strat.id
                    ? 'bg-purple-500 border-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                }`}
                disabled={!isController}
              >
                {strat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-2.5 pb-2">
        {isController ? (
          <button
            onClick={handleApplyOperations}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg py-2 font-bold font-pixel text-[8px] tracking-wider uppercase border-none cursor-pointer shadow-sm transition-all"
          >
            🧁 Apply Operations
          </button>
        ) : (
          <div className="py-1.5 bg-slate-100 border border-slate-200 text-[9px] rounded-lg text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
            <Info className="w-3 h-3" />
            <span>OBSERVER MODE - READ ONLY</span>
          </div>
        )}
      </div>
    </div>
  );
}
