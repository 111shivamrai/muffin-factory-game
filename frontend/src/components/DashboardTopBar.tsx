import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { Settings, LogOut, ClipboardList, Menu, X } from 'lucide-react';

function DashboardTopBar() {
  const { room, teamState, role, leaderboard, logout, updateContractStatus } = useGameStore(
    useShallow((state) => ({
      room: state.room,
      teamState: state.teamState,
      role: state.role,
      leaderboard: state.leaderboard,
      logout: state.logout,
      updateContractStatus: state.updateContractStatus,
    }))
  );
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  if (!room || !teamState) return null;

  // Resolve rank
  const rankEntry = leaderboard.find(e => e.teamId === teamState.id);
  const rank = rankEntry ? rankEntry.rank : '1';
  const totalTeams = leaderboard.length || 2;

  // Filter contracts based on 10-day advance offer rule:
  // 1. Each contract pops up for review 10 days before its startDay: [startDay - 10, startDay).
  // 2. On startDay, if not accepted, the contract offer closes and cannot be taken.
  // 3. If accepted, the contract runs from startDay to endDay.
  const currentDay = Math.max(1, room?.currentDay ?? 1);
  
  const visibleContracts = teamState.contracts.filter(c => {
    // Visible once 10-day advance offer window begins:
    const offerStartDay = Math.max(1, c.startDay - 10);
    return currentDay >= offerStartDay;
  });

  const activeContracts = visibleContracts.filter(c => c.active && c.status === 'accepted' && currentDay >= c.startDay && currentDay <= c.endDay);
  
  // Contracts that are currently offered and pending decision (open for 10 days before startDay, closes at startDay)
  const pendingOffers = visibleContracts.filter(c => {
    const offerStartDay = Math.max(1, c.startDay - 10);
    const isOfferOpen = currentDay >= offerStartDay && currentDay < c.startDay;
    return (!c.status || c.status === 'offered') && isOfferOpen;
  });

  // Track dismissed notifications with localStorage persistence scoped by room and team
  const notifStorageKey = `muffin_notif_dismissed_${room.id}_${teamState.id}`;
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`muffin_notif_dismissed_${room.id}_${teamState.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismissNotification = (contractId: string) => {
    setDismissedNoticeIds(prev => {
      if (prev.includes(contractId)) return prev;
      const next = [...prev, contractId];
      try {
        localStorage.setItem(notifStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Notification requirements:
  // 1. Shows exactly 10 days before contract starts (offerStartDay = max(1, startDay - 10))
  // 2. Visible for exactly TWO simulation days [offerStartDay, offerStartDay + 2)
  // 3. Automatically dismisses when currentDay >= offerStartDay + 2
  // 4. Manual dismiss permanently silences that offer toast
  const pendingNotificationContracts = pendingOffers.filter(c => {
    const offerStartDay = Math.max(1, c.startDay - 10);
    const isWithin2DayWindow = currentDay >= offerStartDay && currentDay < (offerStartDay + 2);
    return isWithin2DayWindow && !dismissedNoticeIds.includes(c.id);
  });
  const hasActionableOffers = pendingOffers.length > 0;
  const contractBadgeCount = pendingOffers.length;
  const upcomingContracts = teamState.contracts.filter(c => currentDay < Math.max(1, c.startDay - 10)).sort((a, b) => a.startDay - b.startDay);

  // Active lead time modifier from events
  const leadTimeMod = teamState.activeEvents
    ?.filter(ev => ev.active && ev.targetVariable === 'lead_time')
    .reduce((sum, ev) => sum + ev.modifier, 0) || 0;

  // Raw Material (base_mix) dynamic arrival time
  const rawPoInTransit = teamState.purchaseOrders
    ?.filter(po => po.materialType === 'base_mix' && po.status === 'transit')
    .sort((a, b) => a.arrivalDay - b.arrivalDay)[0];

  const rawArrivalDays = rawPoInTransit 
    ? Math.max(1, rawPoInTransit.arrivalDay - currentDay) 
    : 0;

  const rawArrivalText = rawPoInTransit 
    ? `${rawArrivalDays} Day${rawArrivalDays === 1 ? '' : 's'}`
    : `0 Days`;

  // Packaging Material dynamic arrival time
  const pkgPoInTransit = teamState.purchaseOrders
    ?.filter(po => po.materialType === 'packaging_material' && po.status === 'transit')
    .sort((a, b) => a.arrivalDay - b.arrivalDay)[0];

  const pkgArrivalDays = pkgPoInTransit 
    ? Math.max(1, pkgPoInTransit.arrivalDay - currentDay) 
    : 0;

  const pkgArrivalText = pkgPoInTransit 
    ? `${pkgArrivalDays} Day${pkgArrivalDays === 1 ? '' : 's'}`
    : `0 Days`;

  // Machine Procurement dynamic arrival time
  const machineInTransit = teamState.machineOrders
    ?.filter(mo => mo.status === 'procuring')
    .sort((a, b) => a.arrivalDay - b.arrivalDay)[0];

  const machineArrivalDays = machineInTransit 
    ? Math.max(1, machineInTransit.arrivalDay - currentDay) 
    : 0;

  const machineArrivalText = machineInTransit 
    ? `${machineArrivalDays} Day${machineArrivalDays === 1 ? '' : 's'}`
    : `0 Days`;

  const machineTypeNames: Record<string, string> = {
    mixing: 'Mixer',
    baking: 'Oven',
    icing: 'Icing',
    packaging: 'Packer',
  };

  // Helper to format team name for top bar display:
  // e.g. "Cups" -> "Team Cups"
  // e.g. "Team Rangers" -> "Team Rangers"
  // e.g. "Demo Team" / "Demo" -> "Team Muffin" (removes "Demo" completely)
  const formatTeamDisplayName = (rawName?: string): string => {
    if (!rawName) return 'Team Muffin';
    const trimmed = rawName.trim();
    if (!trimmed || trimmed.toLowerCase() === 'demo' || trimmed.toLowerCase() === 'demo team') {
      return 'Team Muffin';
    }
    if (/^team\b/i.test(trimmed)) {
      const rest = trimmed.replace(/^team\s*/i, '').trim();
      return rest ? `Team ${rest}` : 'Team Muffin';
    }
    return `Team ${trimmed}`;
  };

  const displayTeamName = formatTeamDisplayName(teamState.name);

  // Resolve Live Daily Demand:
  // 1. From history if recorded for currentDay or latest tick
  // 2. Otherwise baseline standard market demand 1,200
  let liveDailyDemand = 1200;
  if (teamState.history?.demand && teamState.history.demand.length > 0) {
    const dayIdx = teamState.history.days?.indexOf(currentDay);
    if (dayIdx !== undefined && dayIdx >= 0 && teamState.history.demand[dayIdx] !== undefined) {
      liveDailyDemand = teamState.history.demand[dayIdx];
    } else {
      liveDailyDemand = teamState.history.demand[teamState.history.demand.length - 1];
    }
  }

  return (
    <div className="flex items-center justify-between gap-1.5 xl:gap-2 select-none relative z-30 w-full">
      
      {/* Sleek, Compact Logo Branding Block */}
      <div className="rounded-2xl bg-white border border-rose-200 shadow-[0_2px_0_#f5d4dc] px-2.5 py-1.5 flex items-center gap-2 shrink-0">
        <div className="size-9 rounded-xl bg-rose-100 grid place-items-center text-xl shrink-0">
          🧁
        </div>
        <div className="leading-tight">
          <div className="font-[Fredoka] text-base font-bold text-rose-500 leading-none tracking-wide">
            MUFFIN FACTORY
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[8.5px] font-extrabold bg-rose-400 text-white px-1.5 py-0.2 rounded uppercase">
              {role === 'controller' ? 'CONTROLLER' : 'OBSERVER'}
            </span>
            <span className="text-[8.5px] font-bold text-stone-500 font-mono">
              ROOM: {room.code}
            </span>
          </div>
        </div>
      </div>

      {/* DESKTOP Stat Cards Grid (9 Balanced Live Cards) */}
      <div className="hidden lg:grid flex-1 grid-cols-9 gap-1 xl:gap-1.5 mx-1 min-w-0">
        
        {/* 1. TOTAL CASH (Zero unwanted truncation) */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <div className="text-lg xl:text-xl shrink-0">🪙</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7.5px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              TOTAL CASH
            </div>
            <div 
              className="text-[11.5px] xl:text-[13px] font-black truncate text-emerald-600 font-mono leading-tight tracking-tight"
              title={`Exact Balance: ₹${teamState.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            >
              ₹{Math.round(teamState.cash).toLocaleString()}
            </div>
            <div className="text-[7px] font-bold text-stone-400 font-mono leading-none truncate">
              {teamState.cash >= 0 ? 'Liquid Capital' : 'Deficit'}
            </div>
          </div>
        </div>

        {/* 2. DAILY DEMAND (Fully visible, zero clipping) */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <div className="text-lg xl:text-xl shrink-0">📈</div>
          <div className="min-w-0 flex-1">
            <div className="text-[6.8px] xl:text-[7.5px] font-black text-stone-500 uppercase tracking-tight leading-none whitespace-nowrap">
              DAILY DEMAND
            </div>
            <div className="text-[11.5px] xl:text-[13px] font-black truncate text-stone-900 font-mono leading-tight tracking-tight mt-0.5">
              {liveDailyDemand.toLocaleString()}
            </div>
            <div className="text-[7px] font-bold text-stone-400 font-mono leading-none truncate">
              Market Target
            </div>
          </div>
        </div>

        {/* 3. LIVE DAY COUNT */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <div className="text-lg xl:text-xl shrink-0">⏱️</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7.5px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              LIVE DAY
            </div>
            <div className="text-[11.5px] xl:text-[13px] font-black truncate text-stone-900 font-mono leading-tight tracking-tight">
              Day {currentDay}
            </div>
            <div className="text-[7px] font-bold text-stone-400 font-mono leading-none truncate">
              of {room.maxDays || 30} Days
            </div>
          </div>
        </div>

        {/* 4. RAW MATERIAL ARRIVAL (Clean 3-Line Layout) */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <div className="text-lg xl:text-xl shrink-0">🚚</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-extrabold text-stone-500 tracking-wider uppercase leading-tight truncate">
              RAW MATERIAL
            </div>
            <div className="text-[7px] font-extrabold text-stone-400 tracking-wider uppercase leading-none truncate">
              ARRIVAL
            </div>
            <div className="text-[11px] xl:text-xs font-black truncate text-stone-800 font-mono mt-0.5 leading-tight">
              {rawArrivalText}
            </div>
          </div>
        </div>

        {/* 5. PACKAGING MATERIAL ARRIVAL (Clean 3-Line Layout) */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <div className="text-lg xl:text-xl shrink-0">📦</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-extrabold text-stone-500 tracking-wider uppercase leading-tight truncate">
              PACKAGING
            </div>
            <div className="text-[7px] font-extrabold text-stone-400 tracking-wider uppercase leading-none truncate">
              ARRIVAL
            </div>
            <div className="text-[11px] xl:text-xs font-black truncate text-stone-800 font-mono mt-0.5 leading-tight">
              {pkgArrivalText}
            </div>
          </div>
        </div>

        {/* 6. MACHINE ARRIVAL (Clean 3-Line Layout) */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <div className="text-lg xl:text-xl shrink-0">🏭</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-extrabold text-stone-500 tracking-wider uppercase leading-tight truncate">
              MACHINE
            </div>
            <div className="text-[7px] font-extrabold text-stone-400 tracking-wider uppercase leading-none truncate">
              ARRIVAL
            </div>
            <div className="text-[11px] xl:text-xs font-black truncate text-stone-800 font-mono mt-0.5 leading-tight">
              {machineArrivalText}
            </div>
          </div>
        </div>

        {/* 7. CONTRACTS */}
        <div 
          onClick={() => setShowContractsModal(true)}
          className={`rounded-2xl px-2 py-1.5 flex items-center gap-1.5 min-w-0 cursor-pointer transition-all relative ${
            hasActionableOffers
              ? 'bg-amber-50/80 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35),0_2px_0_#fcd34d] hover:bg-amber-100/80'
              : 'bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] hover:bg-rose-50/50'
          }`}
          title={hasActionableOffers ? `${pendingOffers.length} actionable wholesale contract offer(s) pending review` : 'View Simulation Contracts'}
        >
          <div className="text-lg xl:text-xl shrink-0">📋</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-extrabold text-stone-500 tracking-wider uppercase flex items-center gap-1 leading-tight truncate">
              <span>CONTRACTS</span>
              {hasActionableOffers && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white border border-amber-600 text-[6.5px] rounded-full font-black">
                  {pendingOffers.length} ACTION
                </span>
              )}
            </div>
            <div className={`text-[11.5px] xl:text-[13px] font-black truncate font-mono mt-0.5 leading-tight ${
              hasActionableOffers ? 'text-amber-700' : 'text-rose-500'
            }`}>
              {activeContracts.length} Active
            </div>
            <div className={`text-[7px] font-bold truncate font-mono leading-none ${
              hasActionableOffers ? 'text-amber-600' : 'text-stone-400'
            }`}>
              {hasActionableOffers ? `${pendingOffers.length} Review Available` : 'View deals'}
            </div>
          </div>
        </div>

        {/* 8. RANK */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0">
          <div className="text-lg xl:text-xl shrink-0">🏆</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7.5px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              RANK
            </div>
            <div className="text-[11.5px] xl:text-[13px] font-black truncate text-amber-600 font-mono leading-tight tracking-tight">
              #{rank} / {totalTeams}
            </div>
            <div className="text-[7px] font-bold text-stone-400 font-mono leading-none truncate">
              Leaderboard
            </div>
          </div>
        </div>

        {/* 9. TEAM */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-2 py-1.5 flex items-center gap-1.5 min-w-0 shrink-0">
          <div className="text-lg xl:text-xl shrink-0" role="img" aria-label="Muffin">🧁</div>
          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-extrabold text-stone-500 tracking-wider uppercase leading-none">
              TEAM
            </div>
            <div className="text-[10px] xl:text-[11.5px] font-black text-stone-800 font-sans mt-0.5 truncate" title={displayTeamName}>
              {displayTeamName}
            </div>
            <div className="text-[7px] font-bold text-stone-400 font-mono leading-none truncate">
              Cohort Team
            </div>
          </div>
        </div>

      </div>

      {/* DESKTOP Settings block (Hidden on mobile) */}
      <div className="hidden lg:block relative shrink-0">
        <button 
          onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
          className="size-12 rounded-xl bg-stone-100 border border-stone-200 grid place-items-center text-xl hover:bg-stone-200 cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          ⚙️
        </button>

        {showSettingsDropdown && (
          <div className="absolute right-0 top-14 w-48 bg-white border border-rose-100 rounded-xl shadow-xl z-40 font-sans text-xs overflow-hidden">
            <button 
              onClick={logout}
              className="w-full text-left p-3 hover:bg-pink-50 text-pink-600 font-bold border-none bg-transparent cursor-pointer flex items-center space-x-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Simulation</span>
            </button>
          </div>
        )}
      </div>

      {/* MOBILE Hamburger Menu Button (Visible only on mobile/tablet) */}
      <button 
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="block lg:hidden size-12 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-500 hover:bg-rose-50 cursor-pointer shadow-[0_2px_0_#f5d4dc] transition-all"
      >
        {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* MOBILE Menu Overlay Drawer */}
      {showMobileMenu && (
        <div className="absolute top-16 left-0 right-0 bg-white border border-rose-100 rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-3 block lg:hidden animate-in slide-in-from-top-3 duration-200">
          <h3 className="font-[Fredoka] text-sm text-stone-500 tracking-wider font-semibold border-b border-rose-50/50 pb-1.5 px-1 uppercase">
            Simulation Metrics
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Cash */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">🪙</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Total Cash</div>
                <div className="text-xs font-extrabold truncate text-emerald-600 font-mono">
                  ₹{teamState.cash.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Daily Demand */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">📈</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Daily Demand</div>
                <div className="text-xs font-extrabold truncate text-stone-900 font-mono">
                  {liveDailyDemand.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Live Day Count */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">⏱️</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Live Day Count</div>
                <div className="text-sm font-black truncate text-stone-900 font-mono">
                  Day {currentDay}
                </div>
              </div>
            </div>

            {/* Raw Material Arrival Time */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">🚚</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Raw Material Arrival Time</div>
                <div className="text-xs font-extrabold truncate text-stone-800 font-mono">
                  {rawArrivalText}
                </div>
              </div>
            </div>

            {/* Packaging Material Arrival Time */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">📦</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Packaging Arrival Time</div>
                <div className="text-xs font-extrabold truncate text-stone-800 font-mono">
                  {pkgArrivalText}
                </div>
              </div>
            </div>

            {/* Machine Arrival Time */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">🏭</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Machine Arrival Time</div>
                <div className="text-xs font-extrabold truncate text-stone-800 font-mono">
                  {machineArrivalText}
                </div>
              </div>
            </div>

            {/* Contracts */}
            <div 
              onClick={() => { setShowContractsModal(true); setShowMobileMenu(false); }}
              className={`rounded-xl p-2.5 flex items-center gap-2 cursor-pointer relative transition-all ${
                hasActionableOffers
                  ? 'bg-amber-50/80 border-2 border-amber-400 shadow-sm'
                  : 'border border-rose-100 bg-rose-50/20'
              }`}
            >
              <div className="text-xl">
                📋
              </div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  Contracts
                  {hasActionableOffers && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white border border-amber-600 text-[6.5px] rounded-md font-bold">
                      {pendingOffers.length} ACTION
                    </span>
                  )}
                </div>
                <div className={`text-xs font-extrabold truncate font-mono ${
                  hasActionableOffers ? 'text-amber-700' : 'text-rose-500'
                }`}>
                  {activeContracts.length} Active {hasActionableOffers ? `(${pendingOffers.length} Review Available)` : ''}
                </div>
              </div>
            </div>

            {/* Rank */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">🏆</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Rank</div>
                <div className="text-xs font-extrabold truncate text-amber-600 font-mono">
                  #{rank} / {totalTeams}
                </div>
              </div>
            </div>
          </div>

          {/* Team & Settings */}
          <div className="rounded-xl border border-rose-100 p-3 bg-rose-50/10 space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-xl shrink-0" role="img" aria-label="Muffin">🧁</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Team</div>
                <div className="text-xs font-bold text-stone-800 truncate" title={displayTeamName}>
                  {displayTeamName}
                </div>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Simulation</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Contract Notification Toast (appears 10 days before start, visible for 2 simulation days) */}
      {pendingNotificationContracts.length > 0 && !showContractsModal && (
        <div className="fixed top-16 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-white/50 flex items-center gap-3 max-w-sm">
            <div className="text-2xl bg-white/20 p-2 rounded-xl">📜</div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-mono tracking-widest text-blue-200 font-bold">
                Wholesale Deal Offer! (Closes Day {pendingNotificationContracts[0].startDay})
              </div>
              <div className="text-xs font-black truncate">
                {pendingNotificationContracts[0].name} (Starts Day {pendingNotificationContracts[0].startDay})
              </div>
              <div className="text-[9px] text-amber-300 font-mono font-bold mt-0.5">
                ⏳ Active {pendingNotificationContracts[0].startDay}-{pendingNotificationContracts[0].endDay} · Target: {pendingNotificationContracts[0].dailyQuantity} Muffins/day
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => setShowContractsModal(true)}
                className="px-2.5 py-1 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-lg text-[9px] cursor-pointer shadow-sm border-none uppercase transition-all"
              >
                Review
              </button>
              <button 
                onClick={() => handleDismissNotification(pendingNotificationContracts[0].id)}
                className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-[8px] cursor-pointer border-none transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contracts Detail Modal */}
      {showContractsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans text-xs">
          <div className="bg-white border-2 border-pink-300 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <span className="font-pixel text-pink-600 text-xs uppercase flex items-center space-x-2">
                <ClipboardList className="w-5 h-5" />
                <span>Simulation Contracts Ledger</span>
              </span>
              <button 
                onClick={() => setShowContractsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl border-none bg-transparent cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              Contracts offer premium price multipliers but carry heavy daily penalties if you fail to deliver. Offers appear 10 days in advance and close on the start day.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {visibleContracts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic">No wholesale contracts in offer window on Day {currentDay}. Contracts will pop up 10 days before their start day.</div>
              ) : (
                visibleContracts.map(c => {
                  const offerStartDay = Math.max(1, c.startDay - 10);
                  const isOfferWindowOpen = currentDay >= offerStartDay && currentDay < c.startDay;
                  const isOfferPending = (!c.status || c.status === 'offered') && isOfferWindowOpen;
                  const isOfferClosed = (!c.status || c.status === 'offered' || c.status === 'closed') && currentDay >= c.startDay;
                  const isFinished = currentDay > c.endDay;

                  return (
                    <div 
                      key={c.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isFinished 
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-400 opacity-60' 
                          : isOfferClosed
                            ? 'bg-stone-100 border-stone-300 text-stone-500 opacity-75'
                            : isOfferPending 
                              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-300 shadow-sm' 
                              : c.status === 'declined' 
                                ? 'bg-red-50/50 border-red-200 text-slate-400 opacity-60' 
                                : c.active 
                                  ? 'bg-pink-50/50 border-pink-300 text-slate-700' 
                                  : 'bg-emerald-50/60 border-emerald-300 text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold font-mono ${isFinished || isOfferClosed ? 'line-through text-stone-500' : ''}`}>{c.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-pixel ${
                          isFinished ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                          isOfferClosed ? 'bg-stone-200 text-stone-600 border border-stone-300' :
                          isOfferPending ? 'bg-blue-600 text-white animate-pulse' :
                          c.status === 'declined' ? 'bg-red-100 text-red-700' :
                          c.status === 'completed' ? 'bg-zinc-800 text-zinc-300' :
                          c.active ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isFinished ? 'CONCLUDED / EXPIRED' :
                           isOfferClosed ? 'OFFER CLOSED ON DAY ' + c.startDay :
                           isOfferPending ? 'OFFER OPEN (CLOSES DAY ' + c.startDay + ')' :
                           c.status === 'declined' ? 'DECLINED' :
                           c.status === 'completed' ? 'COMPLETED' :
                           c.active ? 'ACTIVE (DAYS ' + c.startDay + '-' + c.endDay + ')' :
                           c.status === 'accepted' ? 'ACCEPTED (STARTS DAY ' + c.startDay + ')' : 'UPCOMING'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>Offer Window: <span className="font-bold text-stone-900">Days {offerStartDay} - {c.startDay}</span></div>
                        <div>Runs From / To: <span className="font-bold text-stone-900">Day {c.startDay} - Day {c.endDay}</span></div>
                        <div>Daily Target: {c.dailyQuantity} Muffins</div>
                        <div className={isFinished || isOfferClosed ? 'text-stone-400' : 'text-green-600'}>Price Multiplier: {c.priceMultiplier}x</div>
                        <div className={isFinished || isOfferClosed ? 'text-stone-400' : 'text-red-500 font-bold'}>Penalty: ₹{c.penalty}/missed</div>
                      </div>

                      {isOfferPending ? (
                        <div className="mt-3 pt-2 border-t border-blue-200 flex justify-between items-center">
                          <span className="text-[9px] text-amber-700 font-bold font-mono">
                            ⏳ Closes Day {c.startDay} ({Math.max(0, c.startDay - currentDay)} day(s) left)
                          </span>
                          {role === 'controller' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateContractStatus(c.id, 'declined')}
                                className="px-3 py-1 bg-white hover:bg-red-50 text-red-600 rounded text-[9px] font-bold border border-red-200 cursor-pointer shadow-sm transition-colors"
                              >
                                DECLINE
                              </button>
                              <button
                                onClick={() => updateContractStatus(c.id, 'accepted')}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[9px] font-bold border-none cursor-pointer shadow-sm transition-colors"
                              >
                                ACCEPT DEAL
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Waiting for Controller</span>
                          )}
                        </div>
                      ) : isOfferClosed ? (
                        <div className="mt-2 pt-1 text-[9px] text-stone-500 font-mono italic">
                          Contract offer closed on Day {c.startDay}. Was not accepted during the 10-day advance window.
                        </div>
                      ) : isFinished ? (
                        <div className="mt-2 pt-1 text-[9px] text-zinc-500 font-mono italic">
                          Contract period concluded on Day {c.endDay}.
                        </div>
                      ) : c.status === 'declined' ? null : (c.active || c.status === 'completed' || c.status === 'accepted') ? (
                        <div className="mt-2 pt-2 border-t border-pink-200 flex justify-between text-[10px] text-pink-600 font-bold font-mono">
                          <span>Fulfilled Today: {c.fulfilledToday} / {c.dailyQuantity}</span>
                          <span>Total Fulfilled: {c.totalFulfilled} / {c.totalTarget}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}

              {/* Upcoming Contracts in Scenario */}
              {upcomingContracts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>⏳ Upcoming Scenario Contracts ({upcomingContracts.length})</span>
                  </div>
                  <div className="space-y-2">
                    {upcomingContracts.map(uc => (
                      <div key={uc.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-mono flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-800">{uc.name}</span>
                          <span className="text-stone-500 ml-2">({uc.dailyQuantity} muffins/day • Days {uc.startDay}–{uc.endDay})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[9px]">
                          Arriving on Day {uc.startDay}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setShowContractsModal(false)}
                className="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-xl font-pixel text-[9px] cursor-pointer shadow-sm border-none"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(DashboardTopBar);
