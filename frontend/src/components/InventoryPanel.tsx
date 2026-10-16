import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { Info, Check, Coins } from 'lucide-react';
import { FinancesModal } from './FinancesModal.js';

interface StepperRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  isController: boolean;
}

const StepperRow = React.memo(function StepperRow({
  label,
  value,
  onChange,
  step = 10,
  isController,
}: StepperRowProps) {
  const [localStr, setLocalStr] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalStr(String(value));
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Select all existing text immediately so user can replace entire number in one operation
    e.target.select();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty string during editing so user can clear with backspace or select-all + type
    if (raw === '') {
      setLocalStr('');
      return;
    }
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 5);
    setLocalStr(cleaned);
    if (cleaned !== '') {
      const parsed = parseInt(cleaned, 10);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localStr === '' || isNaN(parseInt(localStr, 10))) {
      setLocalStr(String(value));
    } else {
      const parsed = Math.min(99999, Math.max(0, parseInt(localStr, 10)));
      setLocalStr(String(parsed));
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f0e6d6]/70 last:border-0">
      <span className="text-xs font-black text-[#1c1917] tracking-wide font-sans select-none">
        {label}
      </span>
      <div className="w-[176px] h-10.5 flex items-center rounded-2xl border border-[#d8ccbb] overflow-hidden bg-white shrink-0 shadow-2xs">
        {isController ? (
          <button
            type="button"
            onClick={() => {
              const currentVal = parseInt(localStr, 10) || value;
              const next = Math.max(0, currentVal - step);
              setLocalStr(String(next));
              onChange(next);
            }}
            className="w-12 h-full bg-gradient-to-b from-[#faf5eb] to-[#f4e8d4] text-[#4a3d30] font-bold text-xl flex items-center justify-center cursor-pointer hover:from-[#fdf6eb] hover:to-[#f0e0ca] active:opacity-85 transition-all border-none select-none leading-none"
          >
            −
          </button>
        ) : null}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localStr}
          onFocus={handleFocus}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={!isController}
          className="w-[80px] h-full bg-white text-[#1c1917] text-sm font-black font-mono flex items-center justify-center text-center outline-none border-x border-[#d8ccbb] border-y-0 selection:bg-rose-200"
        />
        {isController ? (
          <button
            type="button"
            onClick={() => {
              const currentVal = parseInt(localStr, 10) || value;
              const next = Math.min(99999, currentVal + step);
              setLocalStr(String(next));
              onChange(next);
            }}
            className="w-12 h-full bg-gradient-to-b from-[#faf5eb] to-[#f4e8d4] text-[#4a3d30] font-bold text-xl flex items-center justify-center cursor-pointer hover:from-[#fdf6eb] hover:to-[#f0e0ca] active:opacity-85 transition-all border-none select-none leading-none"
          >
            +
          </button>
        ) : null}
      </div>
    </div>
  );
});

function InventoryPanel() {
  const { teamState, room, role, updateInventorySettings } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
      room: state.room,
      role: state.role,
      updateInventorySettings: state.updateInventorySettings,
    }))
  );

  const [activeTab,  setActiveTab]  = useState<'mix' | 'pack'>('mix');
  const [mixQty,     setMixQty]     = useState(10);
  const [mixROP,     setMixROP]     = useState(40);
  const [mixLT,      setMixLT]      = useState(3);
  const [packQty,    setPackQty]    = useState(10);
  const [packROP,    setPackROP]    = useState(40);
  const [packLT,     setPackLT]     = useState(2);
  const [showFinancesModal, setShowFinancesModal] = useState(false);
  const [isAttentionActive, setIsAttentionActive] = useState(true);

  // Soft attention highlight active only for the first 15 seconds to prevent eye fatigue
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAttentionActive(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  const isController = role === 'controller';

  // Sync server values into local state (only on real changes)
  const prevRef = React.useRef<{
    mix:  { q: number; r: number; lt: number };
    pack: { q: number; r: number; lt: number };
  } | null>(null);

  useEffect(() => {
    if (!teamState) return;
    const m = teamState.inventory.base_mix;
    const p = teamState.inventory.packaging_material;
    if (!m || !p) return;

    const baseRawLT = room?.scenarioConfig?.leadTimes?.rawMaterial 
      ?? m.leadTime 
      ?? (room?.difficulty === 'beginner' ? 2 : room?.difficulty === 'advanced' ? 4 : 3);
    const basePackLT = (room?.scenarioConfig?.leadTimes as any)?.packagingMaterial 
      ?? p.leadTime 
      ?? (room?.difficulty === 'beginner' ? 1 : room?.difficulty === 'advanced' ? 2 : 2);

    const cur = {
      mix:  { q: m.orderQty, r: m.reorderPoint, lt: baseRawLT },
      pack: { q: p.orderQty, r: p.reorderPoint, lt: basePackLT },
    };
    const prev = prevRef.current;

    if (!prev || prev.mix.q !== cur.mix.q || prev.mix.r !== cur.mix.r || prev.mix.lt !== cur.mix.lt) {
      setMixQty(m.orderQty);
      setMixROP(m.reorderPoint);
      setMixLT(baseRawLT);
    }
    if (!prev || prev.pack.q !== cur.pack.q || prev.pack.r !== cur.pack.r || prev.pack.lt !== cur.pack.lt) {
      setPackQty(p.orderQty);
      setPackROP(p.reorderPoint);
      setPackLT(basePackLT);
    }
    prevRef.current = cur;
  }, [teamState?.inventory, room?.scenarioConfig?.leadTimes, room?.difficulty]);

  const [isApplying, setIsApplying] = useState(false);

  const handleApplyChanges = async () => {
    if (!isController || isApplying) return;
    setIsApplying(true);
    try {
      if (activeTab === 'mix') {
        const currentMixLT = room?.scenarioConfig?.leadTimes?.rawMaterial ?? teamState?.inventory?.base_mix?.leadTime ?? mixLT;
        const resMix = await updateInventorySettings('base_mix', mixQty, mixROP, 0, currentMixLT);
        if (resMix && resMix.error) {
          alert(`Failed to update raw material: ${resMix.error}`);
          return;
        }
        alert('Muffin mix order changes applied successfully! Material replenishment in transit.');
      } else {
        const currentPackLT = (room?.scenarioConfig?.leadTimes as any)?.packagingMaterial ?? teamState?.inventory?.packaging_material?.leadTime ?? packLT;
        const resPack = await updateInventorySettings('packaging_material', packQty, packROP, 0, currentPackLT);
        if (resPack && resPack.error) {
          alert(`Failed to update packaging material: ${resPack.error}`);
          return;
        }
        alert('Packaging material order changes applied successfully! Material replenishment in transit.');
      }
    } catch (err: any) {
      alert(`Error applying order changes: ${err.message || err}`);
    } finally {
      setIsApplying(false);
    }
  };

  if (!teamState) return null;

  const inv = teamState.inventory;
  const mixOnHand  = inv.base_mix?.onHand ?? 0;
  const packOnHand = inv.packaging_material?.onHand ?? 0;
  const finishedOnHand = inv.finished_muffin?.onHand ?? 0;
  const mixTransit  = inv.base_mix?.inTransit ?? 0;
  const packTransit = inv.packaging_material?.inTransit ?? 0;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden flex flex-col shrink-0">

      {/* Header with Clean White Financial Hint Box */}
      <header className="px-3.5 py-2.5 bg-[#0e8a43] text-white font-extrabold tracking-wide text-xs flex items-center justify-between gap-1.5 shrink-0 select-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-5 rounded-md bg-white/20 grid place-items-center text-xs shrink-0">📦</span>
          <span className="text-[11.5px] font-black tracking-tight whitespace-nowrap">RAW MATERIAL MANAGEMENT</span>
        </div>
        
        {/* Eye-Friendly White Financial Hint Box with Dedicated Open Button */}
        <div
          onClick={() => {
            setShowFinancesModal(true);
            setIsAttentionActive(false);
          }}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white text-stone-800 shadow-xs border border-emerald-100 cursor-pointer select-none transition-all hover:bg-stone-50 hover:shadow-sm active:scale-95 shrink-0 ${
            isAttentionActive ? 'ring-2 ring-white/90 shadow-md scale-[1.01]' : ''
          }`}
          title="Click to view Financial Hint, unit economics, and cost rules"
        >
          <div className="flex items-center gap-1 font-bold text-[10px]">
            <span className="text-xs">💡</span>
            <span className="font-extrabold text-stone-800 whitespace-nowrap">Financial Hint</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFinancesModal(true);
              setIsAttentionActive(false);
            }}
            className="px-2 py-0.5 rounded-md bg-[#0e8a43] hover:bg-[#0b6e35] text-white font-black text-[9px] uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center"
          >
            Open
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-3 overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Enclosing Inventory Section Container */}
        <div className="rounded-2xl bg-[#faf7f2] border border-[#e8dfd3] p-2.5 mb-2.5 shrink-0 shadow-2xs">
          {/* Centered INVENTORY Header directly above middle card */}
          <div className="text-center mb-1.5 select-none">
            <span className="text-[10px] font-extrabold text-[#1c1917] tracking-widest uppercase bg-white px-2.5 py-0.5 rounded-full border border-[#e6dcce] shadow-2xs">
              INVENTORY
            </span>
          </div>

          {/* Three Inventory Cards Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-xl bg-white border border-[#e6dcce] p-2 text-center shadow-2xs">
              <div className="text-[8.5px] font-bold text-stone-500 tracking-wider">RAW MATERIAL</div>
              <div className="text-xl font-black text-[#0e8a43] leading-tight mt-0.5">{mixOnHand}</div>
              <div className="text-[10px] font-extrabold text-stone-600 mt-0.5">Transits: {mixTransit}</div>
            </div>
            <div className="rounded-xl bg-white border border-[#e6dcce] p-2 text-center shadow-2xs">
              <div className="text-[8.5px] font-bold text-stone-500 tracking-wider">PACKAGING MATERIAL</div>
              <div className="text-xl font-black text-[#ea580c] leading-tight mt-0.5">{packOnHand}</div>
              <div className="text-[10px] font-extrabold text-stone-600 mt-0.5">Transits: {packTransit}</div>
            </div>
            <div className="rounded-xl bg-white border border-[#e6dcce] p-2 text-center shadow-2xs">
              <div className="text-[8.5px] font-bold text-stone-500 tracking-wider">FINISHED GOODS</div>
              <div className="text-xl font-black text-[#0e8a43] leading-tight mt-0.5">{finishedOnHand}</div>
              <div className="text-[10px] font-extrabold text-stone-600 mt-0.5">Muffins</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-[#e6dcce] select-none">
          <button
            type="button"
            onClick={() => setActiveTab('mix')}
            className={`flex-1 py-2.5 text-center text-[10px] font-black tracking-wider rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === 'mix'
                ? 'bg-[#0e8a43] text-white border-[#0e8a43] shadow-sm font-bold'
                : 'bg-white text-[#5d4037] border-transparent hover:bg-stone-50'
            }`}
          >
            MUFFIN MIX INGREDIENTS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pack')}
            className={`flex-1 py-2.5 text-center text-[10px] font-black tracking-wider rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === 'pack'
                ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm font-bold'
                : 'bg-white text-[#5d4037] border-transparent hover:bg-stone-50'
            }`}
          >
            MUFFIN PACKAGING MATERIAL
          </button>
        </div>

        {/* Tab Card Body */}
        <div className={`rounded-b-2xl border border-t-0 bg-white ${activeTab === 'mix' ? 'border-[#0e8a43]/20' : 'border-[#ea580c]/20'} p-3.5 py-3 flex flex-col`}>
          <div className="space-y-1.5 py-0.5">
            {activeTab === 'mix' ? (
              <>
                <StepperRow label="ORDER QUANTITY" value={mixQty} onChange={setMixQty} step={10} isController={isController} />
                <StepperRow label="REORDER POINT" value={mixROP} onChange={setMixROP} step={10} isController={isController} />
              </>
            ) : (
              <>
                <StepperRow label="ORDER QUANTITY" value={packQty} onChange={setPackQty} step={10} isController={isController} />
                <StepperRow label="REORDER POINT" value={packROP} onChange={setPackROP} step={10} isController={isController} />
              </>
            )}

            {/* Fixed Lead Time Specification Row */}
            {(() => {
              const leadTimeModifier = teamState?.activeEvents
                ?.filter(ev => ev.active && ev.targetVariable === 'lead_time')
                ?.reduce((sum, ev) => sum + ev.modifier, 0) || 0;
              const configuredMixLT = room?.scenarioConfig?.leadTimes?.rawMaterial ?? teamState?.inventory?.base_mix?.leadTime ?? mixLT;
              const configuredPackLT = (room?.scenarioConfig?.leadTimes as any)?.packagingMaterial ?? teamState?.inventory?.packaging_material?.leadTime ?? packLT;
              const effectiveMixLT = Math.max(1, configuredMixLT + leadTimeModifier);
              const effectivePackLT = Math.max(1, configuredPackLT + leadTimeModifier);
              const displayLT = activeTab === 'mix' ? effectiveMixLT : effectivePackLT;

              return (
                <div className="flex items-center justify-between py-2.5 border-t border-[#f0e6d6]/80 mt-1 pt-2.5">
                  <div className="flex flex-col select-none">
                    <span className="text-[11.5px] font-black text-[#1c1917] tracking-wide font-sans">
                      LEAD TIME (DAYS)
                    </span>
                    <span className="text-[9px] font-medium text-stone-400">
                      Fixed supplier delivery schedule
                    </span>
                  </div>
                  <div className="w-[176px] h-10.5 flex items-center justify-center rounded-2xl border border-[#d8ccbb] bg-[#fffbf5] shadow-2xs select-none">
                    <span className={`text-sm font-black mr-1.5 ${
                      activeTab === 'mix' ? 'text-[#0e8a43]' : 'text-[#ea580c]'
                    }`}>
                      {displayLT}
                    </span>
                    <span className="text-[10px] font-bold text-stone-600 font-sans uppercase tracking-wide">
                      {leadTimeModifier !== 0 ? `DAYS (${leadTimeModifier > 0 ? `+${leadTimeModifier}` : leadTimeModifier} EVENT)` : 'DAYS (FIXED)'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footer Apply Changes Button */}
          <div className="mt-2.5">
            {isController ? (
              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyChanges}
                className={`w-full py-3 rounded-xl text-white font-extrabold text-xs transition-all border-none flex items-center justify-center gap-1.5 ${
                  activeTab === 'mix'
                    ? 'bg-gradient-to-b from-[#0e8a43] to-[#0b7036] shadow-[0_3px_0_#09592b] hover:translate-y-[1px] hover:shadow-[0_2px_0_#09592b] active:translate-y-[3px] active:shadow-none'
                    : 'bg-gradient-to-b from-[#ea580c] to-[#c2410c] shadow-[0_3px_0_#9a3412] hover:translate-y-[1px] hover:shadow-[0_2px_0_#9a3412] active:translate-y-[3px] active:shadow-none'
                } ${
                  isApplying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Check className="w-4 h-4 font-bold" />
                <span>{isApplying ? 'APPLYING ORDER...' : 'APPLY ORDER CHANGES'}</span>
              </button>
            ) : (
              <div className="py-2 bg-slate-100 border border-slate-200 text-[10px] rounded-xl text-slate-400 text-center flex items-center justify-center space-x-1 font-mono">
                <Info className="w-3.5 h-3.5" />
                <span>OBSERVER MODE – READ ONLY</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Finances & Unit Economics Modal */}
      <FinancesModal isOpen={showFinancesModal} onClose={() => setShowFinancesModal(false)} />
    </div>
  );
}

export default React.memo(InventoryPanel);
