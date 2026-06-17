// v2 - card-selector layout
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
  const [selectedMaterial, setSelectedMaterial] = useState<'mix' | 'pack'>('mix');

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

  const qty    = selectedMaterial === 'mix' ? mixQty    : packQty;
  const rop    = selectedMaterial === 'mix' ? mixROP    : packROP;
  const safety = selectedMaterial === 'mix' ? mixSafety : packSafety;

  const setQty    = selectedMaterial === 'mix' ? setMixQty    : setPackQty;
  const setRop    = selectedMaterial === 'mix' ? setMixROP    : setPackROP;
  const setSafety = selectedMaterial === 'mix' ? setMixSafety : setPackSafety;

  return (
    <div className="bg-[#fdf7ea] rounded-[20px] border-2 border-[#f5ead5] shadow-sm flex flex-col overflow-hidden shrink-0 pb-1">
      {/* Header */}
      <div className="bg-[#5ea861] text-white font-bold py-2.5 px-4 rounded-t-[16px] font-pixel text-[10px] tracking-wider uppercase flex items-center space-x-2">
        <span className="text-sm">🧁</span>
        <span>Raw Material Management</span>
      </div>

      {/* Material Selector Cards */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {/* Muffin Mix Card */}
        <button
          type="button"
          onClick={() => setSelectedMaterial('mix')}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-[16px] border-2 py-4 px-2 cursor-pointer transition-all ${
            selectedMaterial === 'mix'
              ? 'border-[#e05ea0] bg-white shadow-md'
              : 'border-[#f5ead5] bg-[#fffdf9] shadow-sm hover:border-[#f0c0d8]'
          }`}
        >
          {selectedMaterial === 'mix' && (
            <span className="absolute top-2 right-2 w-5 h-5 bg-[#e05ea0] rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</span>
          )}
          {selectedMaterial !== 'mix' && (
            <span className="absolute top-2 right-2 w-5 h-5 border-2 border-[#d0c8c0] rounded-full" />
          )}
          <span className="text-4xl">🧁</span>
          <span className="font-bold text-[#e05ea0] text-[10px] font-pixel tracking-wide text-center leading-tight">
            MUFFIN MIX<br />INGREDIENTS
          </span>
        </button>

        {/* Packaging Material Card */}
        <button
          type="button"
          onClick={() => setSelectedMaterial('pack')}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-[16px] border-2 py-4 px-2 cursor-pointer transition-all ${
            selectedMaterial === 'pack'
              ? 'border-[#4a8fd4] bg-white shadow-md'
              : 'border-[#f5ead5] bg-[#fffdf9] shadow-sm hover:border-[#b0d0f0]'
          }`}
        >
          {selectedMaterial === 'pack' && (
            <span className="absolute top-2 right-2 w-5 h-5 bg-[#4a8fd4] rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</span>
          )}
          {selectedMaterial !== 'pack' && (
            <span className="absolute top-2 right-2 w-5 h-5 border-2 border-[#d0c8c0] rounded-full" />
          )}
          <span className="text-4xl">📦</span>
          <span className="font-bold text-[#4a8fd4] text-[10px] font-pixel tracking-wide text-center leading-tight">
            MUFFIN<br />PACKAGING<br />MATERIAL
          </span>
        </button>
      </div>

      {/* Configure Inventory Settings label */}
      <div className="px-3 pb-1">
        <p className="text-center text-[8px] font-bold text-[#9a8a80] uppercase tracking-widest">
          Configure Inventory Settings
        </p>
      </div>

      {/* Single set of inputs for selected material */}
      <div className="flex flex-col gap-2 px-3 pb-2">
        <InputRow
          label="ORDER QUANTITY (BOX)"
          value={qty}
          onChange={setQty}
          onIncrement={() => setQty(prev => prev + 100)}
          onDecrement={() => setQty(prev => Math.max(0, prev - 100))}
        />
        <InputRow
          label="REORDER POINT (BOX)"
          value={rop}
          onChange={setRop}
          onIncrement={() => setRop(prev => prev + 50)}
          onDecrement={() => setRop(prev => Math.max(0, prev - 50))}
        />
        <InputRow
          label="SAFETY STOCK (BOX)"
          value={safety}
          onChange={setSafety}
          onIncrement={() => setSafety(prev => prev + 50)}
          onDecrement={() => setSafety(prev => Math.max(0, prev - 50))}
        />
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
