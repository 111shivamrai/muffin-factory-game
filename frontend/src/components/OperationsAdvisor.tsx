import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { HelpCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface HintItem {
  id: string;
  title: string;
  message: string;
  severity: 'urgent' | 'caution' | 'info';
}

function OperationsAdvisor() {
  const { teamState, room } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
      room: state.room,
    }))
  );
  const [isOpen, setIsOpen] = useState(false);
  const [lastReadDay, setLastReadDay] = useState<number>(() => {
    const val = localStorage.getItem('advisor_last_read_day');
    return val ? parseInt(val) : 0;
  });

  const markAsRead = () => {
    if (!room) return;
    localStorage.setItem('advisor_last_read_day', room.currentDay.toString());
    setLastReadDay(room.currentDay);
  };

  const handleOpen = () => {
    setIsOpen(true);
    markAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!teamState || !room) return null;

  // 1. Raw Material Rate
  const baseRate = room.scenarioConfig?.rawMaterialCosts?.baseMix ?? (room.difficulty === 'advanced' ? 6.0 : 5.0);
  let rateMultiplier = 1.0;
  teamState.activeEvents?.forEach(ev => {
    if (ev.active && ev.targetVariable === 'raw_material_cost') {
      rateMultiplier += ev.modifier;
    }
  });
  const currentRawMaterialRate = (typeof baseRate === 'number' && !isNaN(baseRate)) ? (baseRate * rateMultiplier) : null;
  const rateFormatted = currentRawMaterialRate !== null ? `₹${currentRawMaterialRate.toFixed(2)} per unit` : 'Rate unavailable';

  // 2. Cash Status
  let cashSeverity: 'urgent' | 'caution' | 'info' = 'info';
  let cashMsg = '';
  if (teamState.cash <= 5000 || teamState.status === 'bankrupt') {
    cashSeverity = 'urgent';
    cashMsg = `Cash is critically low at ₹${Math.round(teamState.cash).toLocaleString()}. Avoid capital expenses and prioritize immediate sales.`;
  } else if (teamState.cash < 25000) {
    cashSeverity = 'caution';
    cashMsg = `Cash balance is ₹${Math.round(teamState.cash).toLocaleString()}. Keep an eye on expenses before placing large bulk orders.`;
  } else {
    cashSeverity = 'info';
    cashMsg = `Cash reserves are healthy at ₹${Math.round(teamState.cash).toLocaleString()} with sufficient liquidity for daily operations.`;
  }

  // 3. Customer Demand
  const fillRate = teamState.report?.fillRate ?? 100;
  const stockouts = teamState.report?.stockoutDays ?? 0;
  let demandSeverity: 'urgent' | 'caution' | 'info' = 'info';
  let demandMsg = '';
  if (stockouts > 0 || fillRate < 80) {
    demandSeverity = 'urgent';
    demandMsg = `Unmet customer demand detected (${fillRate.toFixed(0)}% fill rate, ${stockouts} stockout days). Expand output to avoid lost revenue.`;
  } else if (fillRate < 95) {
    demandSeverity = 'caution';
    demandMsg = `Customer fulfillment is at ${fillRate.toFixed(0)}%. Minor supply shortfall detected on peak demand days.`;
  } else {
    demandSeverity = 'info';
    demandMsg = `Customer demand is fully satisfied with a ${fillRate.toFixed(0)}% fulfillment rate across all channels.`;
  }

  // 4. Stock Levels
  const mixOnHand = teamState.inventory?.base_mix?.onHand ?? 0;
  const packOnHand = teamState.inventory?.packaging_material?.onHand ?? 0;
  let stockSeverity: 'urgent' | 'caution' | 'info' = 'info';
  let stockMsg = '';
  if (mixOnHand <= 300 && packOnHand <= 300) {
    stockSeverity = 'urgent';
    stockMsg = `Both muffin mix (${mixOnHand}) and packaging (${packOnHand}) are nearly depleted. Production will halt soon.`;
  } else if (mixOnHand <= 500) {
    stockSeverity = 'urgent';
    stockMsg = `Muffin mix is critically low (${mixOnHand} units remaining). Replenish stock to prevent a production halt.`;
  } else if (packOnHand <= 500) {
    stockSeverity = 'urgent';
    stockMsg = `Packaging material is low (${packOnHand} units remaining). Muffins cannot be packaged without materials.`;
  } else if (mixOnHand <= 1500 || packOnHand <= 1500) {
    stockSeverity = 'caution';
    stockMsg = `Material buffer is moderate (${mixOnHand} mix, ${packOnHand} packaging). Monitor daily usage closely.`;
  } else {
    stockSeverity = 'info';
    stockMsg = `Material stock is well-balanced (${mixOnHand} mix, ${packOnHand} packaging on hand). Sufficient inventory for production.`;
  }

  // 5. Reorder Advice
  const mixROP = teamState.inventory?.base_mix?.reorderPoint ?? 0;
  const packROP = teamState.inventory?.packaging_material?.reorderPoint ?? 0;
  const pendingMix = teamState.purchaseOrders?.some(po => po.materialType === 'base_mix' && po.arrivalDay > room.currentDay);
  const pendingPack = teamState.purchaseOrders?.some(po => po.materialType === 'packaging_material' && po.arrivalDay > room.currentDay);

  let reorderSeverity: 'urgent' | 'caution' | 'info' = 'info';
  let reorderMsg = '';
  if (mixOnHand <= mixROP && !pendingMix) {
    reorderSeverity = 'urgent';
    reorderMsg = `Muffin mix (${mixOnHand} units) is below reorder point (${mixROP}) with no incoming shipment. Place an order today.`;
  } else if (packOnHand <= packROP && !pendingPack) {
    reorderSeverity = 'urgent';
    reorderMsg = `Packaging (${packOnHand} units) is below reorder point (${packROP}) with no incoming shipment. Place an order today.`;
  } else if (pendingMix || pendingPack) {
    reorderSeverity = 'info';
    reorderMsg = `Replenishment order is already in transit. Stock will automatically arrive in upcoming days.`;
  } else {
    reorderSeverity = 'info';
    reorderMsg = `All materials remain above their reorder thresholds. No additional orders required today.`;
  }

  // 6. Production Bottleneck
  const bottleneckStage = teamState.currentBottleneck?.stage || 'mixing';
  const bottleneckCap = teamState.currentBottleneck?.capacity ?? 0;
  const stageName = bottleneckStage.charAt(0).toUpperCase() + bottleneckStage.slice(1);
  const bottleneckMsg = `The limiting bottleneck stage is ${stageName} (operating capacity: ${bottleneckCap} units/day). Expanding this stage will unlock higher factory output.`;

  // 7. Machine Status
  const breakdowns = teamState.breakdownStates?.filter(b => b.brokenCount > 0 && b.daysRemaining.length > 0) || [];
  let machineSeverity: 'urgent' | 'caution' | 'info' = 'info';
  let machineMsg = '';
  if (breakdowns.length > 0) {
    machineSeverity = 'urgent';
    const detail = breakdowns.map(b => `${b.brokenCount} ${b.machineType} (${b.daysRemaining[0]} day(s) repair left)`).join(', ');
    machineMsg = `Active machine breakdown: ${detail}. Operating capacity is temporarily reduced during repairs.`;
  } else {
    machineSeverity = 'info';
    machineMsg = `All machines across mixing, baking, icing, and packaging are operating at full nominal efficiency.`;
  }

  // 8. Contract Priority
  const activeContracts = teamState.contracts?.filter(c => c.active && c.status !== 'closed' && c.status !== 'declined') || [];
  let contractSeverity: 'urgent' | 'caution' | 'info' = 'info';
  let contractMsg = '';
  if (activeContracts.length > 0) {
    const behind = activeContracts.find(c => c.dailyQuantity > 0 && (c.fulfilledToday / c.dailyQuantity) < 0.9);
    if (behind) {
      contractSeverity = 'caution';
      contractMsg = `Contract "${behind.name}" delivery fell short (${behind.fulfilledToday}/${behind.dailyQuantity} units). Prioritize contract allocation to avoid penalties.`;
    } else {
      contractSeverity = 'info';
      contractMsg = `${activeContracts.length} active B2B contract(s) are performing well. Daily commitments are on schedule.`;
    }
  } else {
    contractSeverity = 'info';
    contractMsg = `No active B2B contracts. All finished muffin output is sold directly to open consumer markets.`;
  }

  const hints: HintItem[] = [
    {
      id: 'raw-material-rate',
      title: 'CURRENT RAW MATERIAL RATE',
      message: currentRawMaterialRate !== null
        ? `Base muffin mix is currently priced at ₹${currentRawMaterialRate.toFixed(2)} per unit.${rateMultiplier !== 1.0 ? ' Active market event has affected supplier pricing.' : ''}`
        : 'Raw material supplier pricing is currently unavailable.',
      severity: rateMultiplier > 1.0 ? 'caution' : 'info',
    },
    {
      id: 'cash-status',
      title: 'CASH STATUS',
      message: cashMsg,
      severity: cashSeverity,
    },
    {
      id: 'customer-demand',
      title: 'CUSTOMER DEMAND',
      message: demandMsg,
      severity: demandSeverity,
    },
    {
      id: 'stock-levels',
      title: 'STOCK LEVELS',
      message: stockMsg,
      severity: stockSeverity,
    },
    {
      id: 'reorder-advice',
      title: 'REORDER ADVICE',
      message: reorderMsg,
      severity: reorderSeverity,
    },
    {
      id: 'production-bottleneck',
      title: 'PRODUCTION BOTTLENECK',
      message: bottleneckMsg,
      severity: 'info',
    },
    {
      id: 'machine-status',
      title: 'MACHINE STATUS',
      message: machineMsg,
      severity: machineSeverity,
    },
    {
      id: 'contract-priority',
      title: 'CONTRACT PRIORITY',
      message: contractMsg,
      severity: contractSeverity,
    },
  ];

  const hasNewAlerts = room.currentDay > lastReadDay;
  const alertCount = hints.filter(h => h.severity === 'urgent' || h.severity === 'caution').length;
  const unreadCount = hasNewAlerts ? Math.max(1, alertCount) : 0;

  return (
    <>
      {/* Compact advisor bar button */}
      <div 
        onClick={handleOpen}
        className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-3 flex items-center gap-3 shadow-[0_2px_0_#1d4ed8] rounded-2xl cursor-pointer hover:from-sky-600 hover:to-blue-700 transition-all select-none shrink-0"
      >
        <span className="size-9 rounded-lg bg-white/20 grid place-items-center shrink-0">
          <HelpCircle className="w-5 h-5 text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm tracking-wide">OPERATIONS ADVISOR</div>
          <div className="text-[11px] text-white/85 truncate">Live factory hints and analysis</div>
        </div>

        {unreadCount > 0 && (
          <span className="size-6 rounded-full bg-rose-500 text-white text-xs font-extrabold grid place-items-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Modal pop-up */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans text-xs">
          <div className="bg-[#fffdfb] border border-[#e8d9c4] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-[#1e1408] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#f0e6d6] pb-3 shrink-0">
              <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#c8852a] flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-[#c8852a]" />
                <span>OPERATIONS ADVISOR</span>
              </span>
              <button 
                onClick={handleClose} 
                className="text-[#9a7a52] hover:text-[#1e1408] text-xl border-none bg-transparent cursor-pointer font-bold transition-colors"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Current Raw Material Rate Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-950 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-xs uppercase tracking-wide text-emerald-900">Current Raw Material Rate:</span>
              </div>
              <span className="font-mono font-extrabold text-sm text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-sm">
                {rateFormatted}
              </span>
            </div>

            <p className="text-[#6b4e30] text-[11px] leading-relaxed shrink-0">
              Clear, practical advice based on your current factory inventory, machinery capacity, financial runway, and demand fulfillment.
            </p>

            {/* Structured Hints List */}
            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
              {hints.map((hint) => {
                const isUrgent = hint.severity === 'urgent';
                const isCaution = hint.severity === 'caution';

                let cardStyle = 'bg-[#faf6f0] border-[#e8d9c4] text-[#6b4e30]';
                let badgeStyle = 'bg-stone-200 text-stone-700';
                if (isUrgent) {
                  cardStyle = 'bg-red-50/70 border-red-200 text-red-900';
                  badgeStyle = 'bg-red-100 text-red-700';
                } else if (isCaution) {
                  cardStyle = 'bg-amber-50/70 border-amber-200 text-amber-900';
                  badgeStyle = 'bg-amber-100 text-amber-800';
                }

                return (
                  <div 
                    key={hint.id}
                    className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start space-x-3 transition-colors ${cardStyle}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isUrgent ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : isCaution ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : hint.id === 'raw-material-rate' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Info className="w-4 h-4 text-[#c8852a]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[10px] tracking-wider uppercase font-mono">
                          {hint.title}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeStyle}`}>
                          {hint.severity === 'urgent' ? 'Urgent' : hint.severity === 'caution' ? 'Attention' : 'Normal'}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans leading-snug">
                        {hint.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center border-t border-[#f0e6d6] pt-3 shrink-0">
              <span className="text-[9px] text-[#9a7a52] uppercase tracking-widest font-mono">
                Updates automatically every simulation day
              </span>
              <button 
                onClick={handleClose} 
                className="bg-[#c8852a] hover:bg-[#b06818] text-white border-none px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow transition-all active:scale-95"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(OperationsAdvisor);

