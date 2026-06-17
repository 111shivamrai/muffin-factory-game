// v4 – card-selector design (full rewrite to bust cache)
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Info } from 'lucide-react';

export default function InventoryPanel() {
  const { teamState, role, updateInventorySettings } = useGameStore();

  const [mixQty,     setMixQty]     = useState(1000);
  const [mixROP,     setMixROP]     = useState(300);
  const [mixSafety,  setMixSafety]  = useState(200);
  const [packQty,    setPackQty]    = useState(1000);
  const [packROP,    setPackROP]    = useState(200);
  const [packSafety, setPackSafety] = useState(100);

  const isController = role === 'controller';

  // Which material card is active
  const [sel, setSel] = useState<'mix' | 'pack'>('mix');

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

  // Active values / setters based on selected card
  const qty     = sel === 'mix' ? mixQty     : packQty;
  const rop     = sel === 'mix' ? mixROP     : packROP;
  const safety  = sel === 'mix' ? mixSafety  : packSafety;
  const setQty    = sel === 'mix' ? setMixQty    : setPackQty;
  const setRop    = sel === 'mix' ? setMixROP    : setPackROP;
  const setSafety = sel === 'mix' ? setMixSafety : setPackSafety;

  // ─── Sub-components ──────────────────────────────────────────────────────────

  /** One of the two top material-selector cards */
  function MatCard({
    id, icon, label, line2,
    activeBorder, activeBg, activeText, inactiveBorder, inactiveBg, inactiveText,
    activeCircleBg,
  }: {
    id: 'mix' | 'pack';
    icon: string;
    label: string; line2?: string;
    activeBorder: string; activeBg: string; activeText: string;
    inactiveBorder: string; inactiveBg: string; inactiveText: string;
    activeCircleBg: string;
  }) {
    const active = sel === id;
    return (
      <button
        type="button"
        onClick={() => setSel(id)}
        className={`relative flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left cursor-pointer transition-all w-full ${
          active
            ? `${activeBorder} ${activeBg}`
            : `${inactiveBorder} ${inactiveBg}`
        }`}
      >
        {/* Radio indicator */}
        <span
          className={`absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
            active
              ? `${activeCircleBg} text-white`
              : 'bg-white border-2 border-[#c8c0b8]'
          }`}
        >
          {active ? '✓' : ''}
        </span>

        {/* Icon */}
        <span className="text-[28px] leading-none flex-shrink-0">{icon}</span>

        {/* Text */}
        <span className={`font-bold text-[9px] font-pixel leading-tight pr-4 ${active ? activeText : inactiveText}`}>
          {label}{line2 ? <><br />{line2}</> : null}
        </span>
      </button>
    );
  }

  /** One input row with a coloured icon badge */
  function InputRow({
    iconBg, icon, label,
    value, onChange, onDec, onInc,
  }: {
    iconBg: string; icon: string; label: string;
    value: number;
    onChange: (v: number) => void;
    onDec: () => void;
    onInc: () => void;
  }) {
    return (
      <div className="bg-white border border-[#ede5d8] rounded-xl px-3 py-2 flex items-center gap-2.5">
        {/* Coloured icon square */}
        <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center text-[17px] flex-shrink-0`}>
          {icon}
        </div>

        {/* Label + value */}
        <div className="flex-1 min-w-0">
          <p className="text-[7.5px] font-bold text-[#7a6a5a] uppercase tracking-wide leading-none mb-0.5">
            {label}
          </p>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            disabled={!isController}
            className="w-full text-[13px] font-bold font-mono text-[#1e1408] bg-transparent border-none outline-none p-0"
          />
        </div>

        {/* +/− buttons */}
        {isController && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onDec}
              className="w-7 h-7 bg-[#f3ede3] hover:bg-[#e8ddd0] border border-[#d8ccbb] rounded-lg text-[#4a3d30] font-bold text-[15px] flex items-center justify-center cursor-pointer transition-colors leading-none"
            >
              −
            </button>
            <button
              type="button"
              onClick={onInc}
              className="w-7 h-7 bg-[#f3ede3] hover:bg-[#e8ddd0] border border-[#d8ccbb] rounded-lg text-[#4a3d30] font-bold text-[15px] flex items-center justify-center cursor-pointer transition-colors leading-none"
            >
              +
            </button>
          </div>
        )}
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

      {/* ── Material selector cards ── */}
      <div className="grid grid-cols-2 gap-2.5 p-3 pb-2">
        <MatCard
          id="mix"
          icon="🧁"
          label="MUFFIN MIX"
          line2="INGREDIENTS"
          activeBorder="border-[#e879a0]"
          activeBg="bg-[#fff0f6]"
          activeText="text-[#e05ea0]"
          activeCircleBg="bg-[#e879a0]"
          inactiveBorder="border-[#f5c6d8]"
          inactiveBg="bg-[#fff8fb]"
          inactiveText="text-[#e05ea0]"
        />
        <MatCard
          id="pack"
          icon="📦"
          label="MUFFIN"
          line2="PACKAGING MATERIAL"
          activeBorder="border-[#60a5fa]"
          activeBg="bg-[#eff6ff]"
          activeText="text-[#3b82f6]"
          activeCircleBg="bg-[#60a5fa]"
          inactiveBorder="border-[#bfdbfe]"
          inactiveBg="bg-[#f0f7ff]"
          inactiveText="text-[#3b82f6]"
        />
      </div>

      {/* ── "Configure Inventory Settings" divider ── */}
      <div className="mx-3 mb-2 border-t border-dashed border-[#ddd0be]" />
      <p className="text-center text-[8px] font-bold text-[#5ea861] uppercase tracking-widest mb-2">
        Configure Inventory Settings
      </p>

      {/* ── Input rows ── */}
      <div className="flex flex-col gap-2 px-3 pb-2">
        <InputRow
          iconBg="bg-[#fef3c7]"   icon="🧁"  label="ORDER QUANTITY (BOX)"
          value={qty}   onChange={setQty}
          onDec={() => setQty(v => Math.max(0, v - 100))}
          onInc={() => setQty(v => v + 100)}
        />
        <InputRow
          iconBg="bg-[#dbeafe]"   icon="🔄"  label="REORDER POINT (BOX)"
          value={rop}   onChange={setRop}
          onDec={() => setRop(v => Math.max(0, v - 50))}
          onInc={() => setRop(v => v + 50)}
        />
        <InputRow
          iconBg="bg-[#dcfce7]"   icon="🛡️"  label="SAFETY STOCK (BOX)"
          value={safety} onChange={setSafety}
          onDec={() => setSafety(v => Math.max(0, v - 50))}
          onInc={() => setSafety(v => v + 50)}
        />
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
