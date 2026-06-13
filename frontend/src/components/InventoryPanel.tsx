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

  const prevConfigRef = React.useRef<{
    mix: { q: number; r: number; s: number };
    pack: { q: number; r: number; s: number };
  } | null>(null);

  useEffect(() => {
    if (teamState) {
      const mix = teamState.inventory.base_mix;
      const pack = teamState.inventory.packaging_material;
      
      if (!mix || !pack) return;

      const currentConfig = {
        mix: { q: mix.orderQty, r: mix.reorderPoint, s: mix.safetyStock },
        pack: { q: pack.orderQty, r: pack.reorderPoint, s: pack.safetyStock }
      };

      const prevConfig = prevConfigRef.current;

      let shouldUpdateMix = false;
      let shouldUpdatePack = false;

      if (!prevConfig) {
        shouldUpdateMix = true;
        shouldUpdatePack = true;
      } else {
        if (prevConfig.mix.q !== currentConfig.mix.q || prevConfig.mix.r !== currentConfig.mix.r || prevConfig.mix.s !== currentConfig.mix.s) {
          shouldUpdateMix = true;
        }
        if (prevConfig.pack.q !== currentConfig.pack.q || prevConfig.pack.r !== currentConfig.pack.r || prevConfig.pack.s !== currentConfig.pack.s) {
          shouldUpdatePack = true;
        }
      }

      if (shouldUpdateMix) {
        setMixQty(mix.orderQty);
        setMixROP(mix.reorderPoint);
        setMixSafety(mix.safetyStock);
      }
      if (shouldUpdatePack) {
        setPackQty(pack.orderQty);
        setPackROP(pack.reorderPoint);
        setPackSafety(pack.safetyStock);
      }

      prevConfigRef.current = currentConfig;
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
      <div className="border-2 border-[#f5ead5] rounded-[16px] p-2 text-center bg-[#fffdf9] shadow-sm">
        <div className="text-[8px] font-bold text-[#6b5855] uppercase tracking-wider">{title}</div>
        <div className="font-bold text-[#4a2e2a] text-[14px] leading-tight mt-0.5">{value}</div>
        <div className="text-[8px] text-[#8e7a77] font-mono mt-0.5">{sub}</div>
      </div>
    );
  }

  function InputRow({ label, value, onChange, onIncrement, onDecrement }: any) {
    return (
      <div className="mb-0.5">
        <label className="text-[8px] block text-[#6b5855] font-bold uppercase tracking-wide mb-1">
          {label}
        </label>
        <div className="flex gap-1.5 items-center">
          {isController && (
            <button 
              type="button"
              onClick={onDecrement}
              className="w-7 h-6 flex items-center justify-center bg-[#544d47] hover:bg-[#3d3834] rounded-lg text-white font-bold cursor-pointer text-[12px] shadow-sm"
            >
              -
            </button>
          )}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={!isController}
            className="border-2 border-[#f5ead5] rounded-lg w-full text-center text-[12px] font-mono font-bold py-0.5 bg-white focus:outline-none focus:border-[#5ea861] h-6 text-[#4a2e2a]"
          />
          {isController && (
            <button 
              type="button"
              onClick={onIncrement}
              className="w-7 h-6 flex items-center justify-center bg-[#544d47] hover:bg-[#3d3834] rounded-lg text-white font-bold cursor-pointer text-[12px] shadow-sm"
            >
              +
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fdf7ea] rounded-[20px] border-2 border-[#f5ead5] shadow-sm flex flex-col overflow-hidden shrink-0 pb-1">
      {/* Header */}
      <div className="bg-[#5ea861] text-white font-bold py-2.5 px-4 rounded-t-[16px] font-pixel text-[10px] tracking-wider uppercase flex items-center space-x-2">
        <span className="text-sm">🧁</span>
        <span>Raw Material Management</span>
      </div>

      {/* Live inventory stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-2">
        <SmallCard title="MIX ON HAND" value={mix.onHand} sub={`Transits: ${mix.inTransit}`} />
        <SmallCard title="PACK ON HAND" value={pack.onHand} sub={`Transits: ${pack.inTransit}`} />
        <SmallCard title="FINISHED GOODS" value={muffin.onHand} sub="Muffins" />
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-2.5 pb-2">
        {/* Mix Ingredients column */}
        <div className="border-2 border-[#f5ead5] rounded-[16px] p-2.5 bg-[#fffaf0] shadow-sm">
          <h3 className="font-bold text-[#447a46] text-[9px] font-pixel mb-2 tracking-wide uppercase leading-tight text-center">
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
        <div className="border-2 border-[#f5ead5] rounded-[16px] p-2.5 bg-[#fffaf0] shadow-sm">
          <h3 className="font-bold text-[#447a46] text-[9px] font-pixel mb-2 tracking-wide uppercase leading-tight text-center">
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

      <div className="px-2.5 pb-1.5">
        {isController ? (
          <button 
            onClick={handleApplyChanges}
            className="w-full bg-[#5ea861] hover:bg-[#4d8c50] text-white py-2.5 rounded-xl font-bold font-pixel text-[10px] tracking-wider uppercase border-none cursor-pointer shadow-sm transition-all"
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
