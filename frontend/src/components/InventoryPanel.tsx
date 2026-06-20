// v5 – dual-column layout matching Image 1 target design
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Info } from 'lucide-react';

export default function InventoryPanel() {
  const { teamState, role, updateInventorySettings } = useGameStore();

  const [mixQty,     setMixQty]     = useState(10);
  const [mixROP,     setMixROP]     = useState(40);
  const [mixSafety,  setMixSafety]  = useState(10);
  const [packQty,    setPackQty]    = useState(10);
  const [packROP,    setPackROP]    = useState(40);
  const [packSafety, setPackSafety] = useState(10);

  const isController = role === 'controller';

  // Sync server values into local state (only on real changes)
  const prevRef = React.useRef<{
    mix:  { q: number; r: number; s: number };
    pack: { q: number; r: number; s: number };
  } | null>(null);

  useEffect(() => {
    if (!teamState) return;
    const m = teamState.inventory.base_mix;
    const p = teamState.inventory.packaging_material;
    if (!m || !p) return;

    const cur = {
      mix:  { q: m.orderQty, r: m.reorderPoint, s: m.safetyStock },
      pack: { q: p.orderQty, r: p.reorderPoint, s: p.safetyStock },
    };
    const prev = prevRef.current;

    if (!prev || prev.mix.q !== cur.mix.q || prev.mix.r !== cur.mix.r || prev.mix.s !== cur.mix.s) {
      setMixQty(m.orderQty);
      setMixROP(m.reorderPoint);
      setMixSafety(m.safetyStock);
    }
    if (!prev || prev.pack.q !== cur.pack.q || prev.pack.r !== cur.pack.r || prev.pack.s !== cur.pack.s) {
      setPackQty(p.orderQty);
      setPackROP(p.reorderPoint);
      setPackSafety(p.safetyStock);
    }
    prevRef.current = cur;
  }, [teamState?.inventory]);

  const handleApplyChanges = () => {
    if (!isController) return;
    updateInventorySettings('base_mix',           mixQty,  mixROP,  mixSafety);
    updateInventorySettings('packaging_material', packQty, packROP, packSafety);
    alert('Inventory target levels successfully updated!');
  };

  if (!teamState) return null;

  const inv = teamState.inventory;
  const mixOnHand  = inv.base_mix?.onHand ?? 0;
  const packOnHand = inv.packaging_material?.onHand ?? 0;
  const finishedOnHand = inv.finished_muffin?.onHand ?? 0;
  const mixTransit  = inv.base_mix?.inTransit ?? 0;
  const packTransit = inv.packaging_material?.inTransit ?? 0;

  // ─── Sub-components ──────────────────────────────────────────────────────────

  /** Stepper input with label */
  function StepperRow({
    label, value, onChange, step = 10,
  }: {
    label: string; value: number; onChange: (v: number) => void; step?: number;
  }) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold text-[#5a4d3e] uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1">
          {isController && (
            <button
              type="button"
              onClick={() => onChange(Math.max(0, value - step))}
              className="w-6 h-6 bg-[#f3ede3] hover:bg-[#e8ddd0] border border-[#d8ccbb] rounded-md text-[#4a3d30] font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
            >−</button>
          )}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={!isController}
            className="w-12 text-center text-[12px] font-bold font-mono text-[#1e1408] bg-white border border-[#e5ddd0] rounded-md py-1 outline-none"
          />
          {isController && (
            <button
              type="button"
              onClick={() => onChange(value + step)}
              className="w-6 h-6 bg-[#f3ede3] hover:bg-[#e8ddd0] border border-[#d8ccbb] rounded-md text-[#4a3d30] font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
            >+</button>
          )}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#fdf7ea] rounded-[20px] border-2 border-[#f5ead5] shadow-sm flex flex-col overflow-hidden shrink-0 pb-1">

      {/* ── Header ── */}
      <div className="bg-[#5ea861] text-white font-bold py-2.5 px-4 rounded-t-[16px] font-pixel text-[10px] tracking-wider uppercase flex items-center space-x-2">
        <span className="text-sm">🧁</span>
        <span>Raw Material Management</span>
      </div>

      {/* ── Top stat boxes: MIX ON HAND | PACK ON HAND | FINISHED GOODS ── */}
      <div className="grid grid-cols-3 gap-2 p-3 pb-2">
        <div className="bg-white border border-[#ede5d8] rounded-xl p-2 text-center">
          <p className="text-[7px] font-bold text-[#7a6a5a] uppercase tracking-wide">MIX ON HAND</p>
          <p className="text-[16px] font-bold font-mono text-[#1e1408]">{mixOnHand}</p>
          <p className="text-[7px] text-[#a8977e]">Transits: {mixTransit}</p>
        </div>
        <div className="bg-white border border-[#ede5d8] rounded-xl p-2 text-center">
          <p className="text-[7px] font-bold text-[#7a6a5a] uppercase tracking-wide">PACK ON HAND</p>
          <p className="text-[16px] font-bold font-mono text-[#1e1408]">{packOnHand}</p>
          <p className="text-[7px] text-[#a8977e]">Transits: {packTransit}</p>
        </div>
        <div className="bg-white border border-[#ede5d8] rounded-xl p-2 text-center">
          <p className="text-[7px] font-bold text-[#7a6a5a] uppercase tracking-wide">FINISHED GOODS</p>
          <p className="text-[16px] font-bold font-mono text-[#1e1408]">{finishedOnHand}</p>
          <p className="text-[7px] text-[#a8977e]">Muffins</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-3 mb-2 border-t border-dashed border-[#ddd0be]" />

      {/* ── Two-column side-by-side: MIX INTEGRANTS | PACKAGING MATERIAL ── */}
      <div className="grid grid-cols-2 gap-3 px-3 pb-2">
        {/* LEFT: Muffin Mix Integrants */}
        <div className="bg-[#fff8fb] border border-[#f5c6d8] rounded-xl p-2.5">
          <p className="text-[8px] font-bold text-[#e05ea0] uppercase tracking-wide text-center mb-2.5 font-pixel">
            MUFFIN MIX INTEGRANTS
          </p>
          <div className="flex flex-col gap-2">
            <StepperRow label="ORDER QTY (BOX)" value={mixQty} onChange={setMixQty} />
            <StepperRow label="REORDER POINT (BOX)" value={mixROP} onChange={setMixROP} />
            <StepperRow label="SAFETY STOCK (BOX)" value={mixSafety} onChange={setMixSafety} />
          </div>
        </div>

        {/* RIGHT: Muffin Packaging Material */}
        <div className="bg-[#f0f7ff] border border-[#bfdbfe] rounded-xl p-2.5">
          <p className="text-[8px] font-bold text-[#3b82f6] uppercase tracking-wide text-center mb-2.5 font-pixel">
            MUFFIN PACKAGING MATERIAL
          </p>
          <div className="flex flex-col gap-2">
            <StepperRow label="ORDER QTY (BOX)" value={packQty} onChange={setPackQty} />
            <StepperRow label="REORDER POINT (BOX)" value={packROP} onChange={setPackROP} />
            <StepperRow label="SAFETY STOCK (BOX)" value={packSafety} onChange={setPackSafety} />
          </div>
        </div>
      </div>

      {/* ── Apply / Observer ── */}
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
            <span>OBSERVER MODE – READ ONLY</span>
          </div>
        )}
      </div>
    </div>
  );
}
