import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { MaterialType } from '../../../backend/src/types/index.js';
import { Info } from 'lucide-react';

export default function InventoryPanel() {
  const { teamState, role, updateInventorySettings } = useGameStore();

  const [mixQty, setMixQty] = useState(1000);
  const [mixROP, setMixROP] = useState(300);
  const [mixSafety, setMixSafety] = useState(200);

  const [packQty, setPackQty] = useState(1000);
  const [packROP, setPackROP] = useState(200);
  const [packSafety, setPackSafety] = useState(100);

  const isController = role === 'controller';

  useEffect(() => {
    if (teamState) {
      const mix = teamState.inventory.base_mix;
      const pack = teamState.inventory.packaging_material;
      if (mix) {
        setMixQty(mix.orderQty);
        setMixROP(mix.reorderPoint);
        setMixSafety(mix.safetyStock);
      }
      if (pack) {
        setPackQty(pack.orderQty);
        setPackROP(pack.reorderPoint);
        setPackSafety(pack.safetyStock);
      }
    }
  }, [teamState?.inventory]);

  const handleApplyChanges = () => {
    if (!isController) return;
    updateInventorySettings('base_mix', mixQty, mixROP, mixSafety);
    updateInventorySettings('packaging_material', packQty, packROP, packSafety);
    alert('Inventory target levels successfully updated!');
  };

  if (!teamState) return null;

  const mix = teamState.inventory.base_mix;
  const pack = teamState.inventory.packaging_material;
  const muffin = teamState.inventory.finished_muffin;

  function SmallCard({ title, value, sub }: any) {
    return (
      <div className="border border-[#ffd5c6] rounded-lg p-1.5 text-center bg-white shadow-sm">
        <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">{title}</div>
        <div className="font-bold text-slate-800 text-[13px] leading-tight">{value}</div>
        <div className="text-[7px] text-slate-400 font-mono">{sub}</div>
      </div>
    );
  }

  function InputRow({ label, value, onChange, onIncrement, onDecrement }: any) {
    return (
      <div className="mb-0.5">
        <label className="text-[7px] block text-slate-500 font-bold uppercase tracking-wide mb-px">
          {label}
        </label>
        <div className="flex gap-1 items-center">
          {isController && (
            <button 
              type="button"
              onClick={onDecrement}
              className="w-6 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-500 font-bold cursor-pointer text-[10px]"
            >
              -
            </button>
          )}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={!isController}
            className="border border-slate-300 rounded w-full text-center text-[11px] font-mono font-bold py-0.5 bg-white focus:outline-none focus:border-green-500 h-5"
          />
          {isController && (
            <button 
              type="button"
              onClick={onIncrement}
              className="w-6 h-5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-500 font-bold cursor-pointer text-[10px]"
            >
              +
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="bg-[#7aba8a] text-white font-bold py-2 px-3 rounded-t-2xl font-pixel text-[9px] tracking-wider uppercase flex items-center space-x-2">
        <span className="text-xs">🧁</span>
        <span>Raw Material Management</span>
      </div>

      {/* Live inventory stats */}
      <div className="grid grid-cols-3 gap-1.5 p-2">
        <SmallCard title="MIX ON HAND" value={mix.onHand} sub={`Transits: ${mix.inTransit}`} />
        <SmallCard title="PACK ON HAND" value={pack.onHand} sub={`Transits: ${pack.inTransit}`} />
        <SmallCard title="FINISHED GOODS" value={muffin.onHand} sub="Muffins" />
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-1.5 px-2 pb-1.5">
        {/* Mix Ingredients column */}
        <div className="border border-[#ffd5c6] rounded-lg p-2 bg-white shadow-sm">
          <h3 className="font-bold text-green-700 text-[8px] font-pixel mb-1 tracking-wide uppercase leading-tight">
            MUFFIN MIX INTEGRANTS
          </h3>
          <InputRow label="ORDER QTY (BOX)" value={mixQty} onChange={setMixQty}
            onIncrement={() => setMixQty(prev => prev + 100)} onDecrement={() => setMixQty(prev => Math.max(0, prev - 100))} />
          <InputRow label="REORDER POINT (BOX)" value={mixROP} onChange={setMixROP}
            onIncrement={() => setMixROP(prev => prev + 50)} onDecrement={() => setMixROP(prev => Math.max(0, prev - 50))} />
          <InputRow label="SAFETY STOCK (BOX)" value={mixSafety} onChange={setMixSafety}
            onIncrement={() => setMixSafety(prev => prev + 50)} onDecrement={() => setMixSafety(prev => Math.max(0, prev - 50))} />
        </div>

        {/* Packaging column */}
        <div className="border border-[#ffd5c6] rounded-lg p-2 bg-white shadow-sm">
          <h3 className="font-bold text-green-700 text-[8px] font-pixel mb-1 tracking-wide uppercase leading-tight">
            MUFFIN PACKAGING MATERIAL
          </h3>
          <InputRow label="ORDER QTY (BOX)" value={packQty} onChange={setPackQty}
            onIncrement={() => setPackQty(prev => prev + 100)} onDecrement={() => setPackQty(prev => Math.max(0, prev - 100))} />
          <InputRow label="REORDER POINT (BOX)" value={packROP} onChange={setPackROP}
            onIncrement={() => setPackROP(prev => prev + 50)} onDecrement={() => setPackROP(prev => Math.max(0, prev - 50))} />
          <InputRow label="SAFETY STOCK (BOX)" value={packSafety} onChange={setPackSafety}
            onIncrement={() => setPackSafety(prev => prev + 50)} onDecrement={() => setPackSafety(prev => Math.max(0, prev - 50))} />
        </div>
      </div>

      <div className="px-2 pb-2">
        {isController ? (
          <button 
            onClick={handleApplyChanges}
            className="w-full bg-[#7aba8a] hover:bg-[#6ba87a] text-white py-2 rounded-lg font-bold font-pixel text-[8px] tracking-wider uppercase border-none cursor-pointer shadow-sm transition-all"
          >
            🧁 APPLY ORDER CHANGES
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
