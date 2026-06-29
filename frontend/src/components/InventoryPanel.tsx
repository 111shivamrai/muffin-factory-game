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

  /** Centered label & stepper controls matching the reference design */
  function StepperRow({
    label, value, onChange, step = 10,
  }: {
    label: string; value: number; onChange: (v: number) => void; step?: number;
  }) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-1">
        <span className="text-[8.5px] font-extrabold tracking-wider text-stone-600 text-center uppercase leading-none">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {isController ? (
            <button
              type="button"
              onClick={() => onChange(Math.max(0, value - step))}
              className="w-7 h-7 rounded-md bg-[#fffdfa] border border-[#d8ccbb] text-[#4a3d30] font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors leading-none"
            >
              −
            </button>
          ) : null}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={!isController}
            className="w-12 h-7 rounded-md bg-[#2b2640] text-white text-sm font-bold flex items-center justify-center text-center border-none outline-none"
          />
          {isController ? (
            <button
              type="button"
              onClick={() => onChange(value + step)}
              className="w-7 h-7 rounded-md bg-[#fffdfa] border border-[#d8ccbb] text-[#4a3d30] font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors leading-none"
            >
              +
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden flex flex-col shrink-0" style={{ height: '29.375rem' }}>

      {/* Header */}
      <header className="px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-extrabold tracking-wide text-sm flex items-center gap-2 shrink-0">
        <span className="size-6 rounded-md bg-white/25 grid place-items-center">🧺</span>
        RAW MATERIAL MANAGEMENT
      </header>

      {/* Content */}
      <div className="p-3 overflow-y-auto flex-1">
        {/* Top Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-2 text-center">
            <div className="text-[9px] font-bold text-stone-500 tracking-wider">MIX ON HAND</div>
            <div className="text-xl font-extrabold text-stone-800 leading-tight">{mixOnHand}</div>
            <div className="text-[9px] text-stone-400 font-bold">Transits: {mixTransit}</div>
          </div>
          <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-2 text-center">
            <div className="text-[9px] font-bold text-stone-500 tracking-wider">PACK ON HAND</div>
            <div className="text-xl font-extrabold text-stone-800 leading-tight">{packOnHand}</div>
            <div className="text-[9px] text-stone-400 font-bold">Transits: {packTransit}</div>
          </div>
          <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-2 text-center">
            <div className="text-[9px] font-bold text-stone-500 tracking-wider">FINISHED GOODS</div>
            <div className="text-xl font-extrabold text-stone-800 leading-tight">{finishedOnHand}</div>
            <div className="text-[9px] text-stone-400 font-bold">Muffins</div>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-amber-50 border-amber-100 p-2.5 py-1.5 space-y-1">
            <div className="text-[10px] font-extrabold text-emerald-600 tracking-wider text-center mb-1 font-[Fredoka]">MUFFIN MIX INTEGRANTS</div>
            <StepperRow label="ORDER QTY (BOX)" value={mixQty} onChange={setMixQty} />
            <StepperRow label="REORDER POINT (BOX)" value={mixROP} onChange={setMixROP} />
            <StepperRow label="SAFETY STOCK (BOX)" value={mixSafety} onChange={setMixSafety} />
          </div>
          <div className="rounded-xl border bg-sky-50 border-sky-100 p-2.5 py-1.5 space-y-1">
            <div className="text-[10px] font-extrabold text-emerald-600 tracking-wider text-center mb-1 font-[Fredoka]">MUFFIN PACKAGING MATERIAL</div>
            <StepperRow label="ORDER QTY (BOX)" value={packQty} onChange={setPackQty} />
            <StepperRow label="REORDER POINT (BOX)" value={packROP} onChange={setPackROP} />
            <StepperRow label="SAFETY STOCK (BOX)" value={packSafety} onChange={setPackSafety} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2.5 shrink-0">
        {isController ? (
          <button
            onClick={handleApplyChanges}
            className="w-full py-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 text-white font-extrabold text-sm shadow-[0_3px_0_#16a34a] hover:translate-y-[1px] hover:shadow-[0_2px_0_#16a34a] active:translate-y-[3px] active:shadow-none transition-all border-none cursor-pointer"
          >
            🧁 APPLY ORDER CHANGES
          </button>
        ) : (
          <div className="py-2.5 bg-slate-100 border border-slate-200 text-[10px] rounded-xl text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
            <Info className="w-3.5 h-3.5" />
            <span>OBSERVER MODE – READ ONLY</span>
          </div>
        )}
      </div>
    </div>
  );
}
