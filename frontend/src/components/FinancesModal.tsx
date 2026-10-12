import React from 'react';
import { X, TrendingUp, Package, Box, ShoppingCart, Percent, DollarSign, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';

interface FinancesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FinancesModal({ isOpen, onClose }: FinancesModalProps) {
  const { room, scenarios } = useGameStore(
    useShallow((state) => ({
      room: state.room,
      scenarios: state.scenarios,
    }))
  );

  if (!isOpen) return null;

  // Resolve authoritative active scenario from room.scenarioConfig, or match from scenarios catalog
  const activeScenario = (room as any)?.scenarioConfig || scenarios?.find(
    (s) => s.id === room?.scenarioId || s.difficulty === room?.difficulty
  );

  const muffinRate = activeScenario?.sellingPrice ?? 20.0;
  const rawMaterialCost = activeScenario?.rawMaterialCosts?.baseMix ?? (room?.difficulty === 'advanced' ? 6.0 : 5.0);
  const packagingCost = activeScenario?.rawMaterialCosts?.packaging ?? (room?.difficulty === 'advanced' ? 1.2 : 1.0);
  const orderingCost = activeScenario?.rawMaterialCosts?.orderCost ?? (
    room?.difficulty === 'beginner' ? 100.0 : room?.difficulty === 'advanced' ? 200.0 : 150.0
  );
  const holdingRatePct = (activeScenario?.holdingCostRate ?? 0.02) * 100;
  const rawHoldingCostPerDay = rawMaterialCost * (activeScenario?.holdingCostRate ?? 0.02);

  const totalDirectMaterialCost = rawMaterialCost + packagingCost;
  const grossContributionMargin = muffinRate - totalDirectMaterialCost;
  const grossMarginPercent = Math.round((grossContributionMargin / muffinRate) * 100);

  const financeCards = [
    {
      title: 'Current Muffin Market Rate',
      value: `₹${muffinRate.toFixed(2)}`,
      unit: 'per Finished Muffin',
      icon: TrendingUp,
      iconBg: 'bg-emerald-100 text-emerald-700',
      badge: 'Revenue Baseline',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Standard wholesale market price received for each fulfilled unit sold to distributors.',
    },
    {
      title: 'Cost of Raw Material per Unit',
      value: `₹${rawMaterialCost.toFixed(2)}`,
      unit: 'per kg of Muffin Mix',
      icon: Package,
      iconBg: 'bg-amber-100 text-amber-700',
      badge: 'Direct Material',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Direct procurement cost per unit of raw base mix ingredients consumed during the mixing stage.',
    },
    {
      title: 'Cost of Packaging Material per Unit',
      value: `₹${packagingCost.toFixed(2)}`,
      unit: 'per Box / Wrapper',
      icon: Box,
      iconBg: 'bg-blue-100 text-blue-700',
      badge: 'Direct Packaging',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Direct material cost for packaging containers and wrap used at the packaging machine line.',
    },
    {
      title: 'Ordering Cost',
      value: `₹${orderingCost.toFixed(2)}`,
      unit: 'fixed per Purchase Order',
      icon: ShoppingCart,
      iconBg: 'bg-purple-100 text-purple-700',
      badge: 'Procurement Overhead',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Fixed administrative, logistics, and processing fee incurred each time a purchase order is submitted.',
    },
    {
      title: 'Inventory Holding Cost',
      value: `${holdingRatePct.toFixed(1)}% / Day`,
      unit: `~₹${rawHoldingCostPerDay.toFixed(2)}/unit/day`,
      icon: Percent,
      iconBg: 'bg-rose-100 text-rose-700',
      badge: 'Carrying Fee',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'Daily carrying fee assessed against remaining end-of-day raw mix and finished goods inventory on hand.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl border border-rose-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-white/20 backdrop-blur-xs grid place-items-center text-xl shadow-inner">
              💰
            </div>
            <div>
              <h2 className="font-[Fredoka] text-lg font-bold tracking-wide leading-tight flex items-center gap-2">
                <span>FACTORY FINANCES & COST STRUCTURE</span>
                <span className="text-[10px] font-extrabold bg-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Unit Economics
                </span>
              </h2>
              <p className="text-[11px] text-emerald-100 font-sans mt-0.5">
                Official active parameters governing daily production costs and revenue calculations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center cursor-pointer transition-all border-none"
            title="Close finances modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Unit Economics Highlight Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-emerald-500 text-white grid place-items-center text-lg shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  Unit Gross Contribution
                </div>
                <div className="text-xs text-emerald-700/90 font-medium">
                  Revenue (₹{muffinRate.toFixed(2)}) − Direct Materials (₹{totalDirectMaterialCost.toFixed(2)})
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-emerald-700 font-mono leading-none">
                ₹{grossContributionMargin.toFixed(2)} / unit
              </div>
              <div className="text-[10px] font-extrabold text-emerald-600 mt-1">
                {grossMarginPercent}% Gross Margin
              </div>
            </div>
          </div>

          {/* 5 Parameters Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {financeCards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl bg-white border border-stone-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                    idx === 4 ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`size-8 rounded-xl ${card.iconBg} grid place-items-center shrink-0`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold text-stone-800 font-sans leading-tight">
                          {card.title}
                        </div>
                        <div className="text-[10px] font-semibold text-stone-400 font-sans">
                          {card.unit}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded-full border ${card.badgeColor} shrink-0`}>
                      {card.badge}
                    </span>
                  </div>

                  <div className="my-1.5 flex items-baseline justify-between">
                    <span className="text-lg font-black text-stone-900 font-mono tracking-tight">
                      {card.value}
                    </span>
                  </div>

                  <p className="text-[10.5px] text-stone-500 font-sans leading-relaxed border-t border-stone-100 pt-1.5">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer Guidance Note */}
          <div className="rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2.5 text-[10.5px] text-stone-600 font-sans flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Use Economic Order Quantity (EOQ) principles to balance Ordering Costs against Inventory Holding Costs.</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 active:scale-95 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer shrink-0 ml-3"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
