import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { Info } from 'lucide-react';

function InventoryPanel() {
  const { teamState, role, updateInventorySettings } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
      role: state.role,
      updateInventorySettings: state.updateInventorySettings,
    }))
  );

  const [activeTab,  setActiveTab]  = useState<'mix' | 'pack'>('mix');
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

  /** Inline label on left, unified pill-stepper on right */
  function StepperRow({
    label, value, onChange, step = 10,
  }: {
    label: string; value: number; onChange: (v: number) => void; step?: number;
  }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
        <span className="text-[11px] font-extrabold text-[#111111] tracking-wide font-sans select-none">
          {label}
        </span>
        <div className="flex items-center rounded-xl border border-[#d8ccbb] overflow-hidden bg-[#fffdfa] shrink-0 shadow-sm">
          {isController ? (
            <button
              type="button"
              onClick={() => onChange(Math.max(0, value - step))}
              className="w-12 h-10 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-xl flex items-center justify-center cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-80 transition-all border-none select-none leading-none"
            >
              −
            </button>
          ) : null}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={!isController}
            className="w-20 h-10 bg-white text-[#2b2640] text-sm font-extrabold flex items-center justify-center text-center outline-none border-x border-[#d8ccbb] border-y-0"
          />
          {isController ? (
            <button
              type="button"
              onClick={() => onChange(value + step)}
              className="w-12 h-10 bg-gradient-to-b from-[#fffaf4] to-[#f8ecd9] text-[#4a3d30] font-bold text-xl flex items-center justify-center cursor-pointer hover:from-[#fdf6eb] hover:to-[#f2e2cb] active:opacity-80 transition-all border-none select-none leading-none"
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
    <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden flex flex-col shrink-0" style={{ height: '32rem' }}>

      {/* Header */}
      <header className="px-4 py-3 bg-[#0e8a43] text-white font-extrabold tracking-wide text-sm flex items-center gap-2 shrink-0 select-none">
        <span className="size-6 rounded-md bg-white/20 grid place-items-center">📦</span>
        RAW MATERIAL MANAGEMENT
      </header>

      {/* Content */}
      <div className="p-3 overflow-y-auto flex-1 flex flex-col min-h-0">
        {/* Top Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
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

        {/* Tabs */}
        <div className="flex gap-1.5 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('mix')}
            className={`flex-1 py-2.5 text-center text-[10px] font-extrabold tracking-wider rounded-t-xl border transition-all cursor-pointer ${
              activeTab === 'mix'
                ? 'bg-[#0e8a43] text-white border-[#0e8a43] shadow-sm font-bold'
                : 'bg-white text-[#5d4037] border-rose-100/60 hover:bg-rose-50/30'
            }`}
          >
            MUFFIN MIX INTEGRANTS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pack')}
            className={`flex-1 py-2.5 text-center text-[10px] font-extrabold tracking-wider rounded-t-xl border transition-all cursor-pointer ${
              activeTab === 'pack'
                ? 'bg-[#0e8a43] text-white border-[#0e8a43] shadow-sm font-bold'
                : 'bg-white text-[#5d4037] border-rose-100/60 hover:bg-rose-50/30'
            }`}
          >
            MUFFIN PACKAGING MATERIAL
          </button>
        </div>

        {/* Tab Card Body */}
        <div className="rounded-b-2xl border border-t-0 bg-[#fffdfa] border-rose-100 p-4 py-3 flex-1 flex flex-col justify-between min-h-0">
          <div className="space-y-1">
            {activeTab === 'mix' ? (
              <>
                <StepperRow label="ORDER QUANTITY" value={mixQty} onChange={setMixQty} />
                <StepperRow label="REORDER POINT" value={mixROP} onChange={setMixROP} />
                <StepperRow label="SAFETY STOCK" value={mixSafety} onChange={setMixSafety} />
              </>
            ) : (
              <>
                <StepperRow label="ORDER QUANTITY" value={packQty} onChange={setPackQty} />
                <StepperRow label="REORDER POINT" value={packROP} onChange={setPackROP} />
                <StepperRow label="SAFETY STOCK" value={packSafety} onChange={setPackSafety} />
              </>
            )}
          </div>

          {/* Footer Apply Changes Button */}
          <div className="mt-3 pt-2">
            {isController ? (
              <button
                onClick={handleApplyChanges}
                className="w-full py-3 rounded-xl bg-gradient-to-b from-[#0e8a43] to-[#0b7036] text-white font-extrabold text-xs shadow-[0_3px_0_#09592b] hover:translate-y-[1px] hover:shadow-[0_2px_0_#09592b] active:translate-y-[3px] active:shadow-none transition-all border-none cursor-pointer flex items-center justify-center gap-1.5"
              >
                ✓ APPLY ORDER CHANGES
              </button>
            ) : (
              <div className="py-2.5 bg-slate-100 border border-slate-200 text-[10px] rounded-xl text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
                <Info className="w-3.5 h-3.5" />
                <span>OBSERVER MODE – READ ONLY</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default React.memo(InventoryPanel);
