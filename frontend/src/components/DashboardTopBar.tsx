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

  // Filter visible contracts based on currentDay
  // 1. Only show contracts whose startDay <= currentDay (future contracts are hidden until startDay arrives)
  // 2. Contracts that have passed endDay are collapsed / closed out
  const currentDay = room?.currentDay ?? 0;
  
  const visibleContracts = teamState.contracts.filter(c => {
    // If contract has not arrived yet, hide it
    if (c.startDay > currentDay) return false;
    return true;
  });

  const activeContracts = visibleContracts.filter(c => c.active && currentDay >= c.startDay && currentDay <= c.endDay);
  
  // Contracts that just arrived today (startDay === currentDay) and haven't been accepted/declined yet
  const newContractsToday = visibleContracts.filter(c => c.startDay === currentDay && (!c.status || c.status === 'offered'));
  const [closedNoticeContractIds, setClosedNoticeContractIds] = useState<string[]>([]);
  const pendingNotificationContracts = newContractsToday.filter(c => !closedNoticeContractIds.includes(c.id));

  // Lead time: static 3.0 Days to match lovable UI design exactly
  const leadTime = '3.0 Days';

  return (
    <div className="flex items-center justify-between gap-2.5 select-none relative z-30 w-full">
      
      {/* Logo block */}
      <div className="rounded-2xl bg-white border border-rose-200 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-3 shrink-0">
        <div className="size-12 rounded-xl bg-rose-100 grid place-items-center text-2xl">
          🧁
        </div>
        <div>
          <div className="font-[Fredoka] text-2xl font-bold text-rose-500 leading-none tracking-wide">
            MUFFIN FACTORY
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-extrabold bg-rose-400 text-white px-2 py-0.5 rounded uppercase">
              {role === 'controller' ? 'CONTROLLER' : 'OBSERVER'}
            </span>
            <span className="text-[10px] font-bold text-stone-500 font-mono">
              ROOM CODE: {room.code}
            </span>
          </div>
        </div>
      </div>

      {/* DESKTOP Stat Cards Grid (Hidden on mobile) */}
      <div className="hidden lg:grid flex-1 grid-cols-6 gap-2 mx-2">
        {/* TOTAL CASH */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2">
          <div className="text-2xl">🪙</div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              TOTAL CASH
            </div>
            <div className="text-sm font-extrabold truncate text-emerald-600 font-mono">
              ₹{teamState.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* LIVE DAY COUNT */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2">
          <div className="text-2xl">⏱️</div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              LIVE DAY COUNT
            </div>
            <div className="text-base font-black truncate text-stone-900 font-mono tracking-tight">
              Day {room.currentDay ?? 0}
            </div>
          </div>
        </div>

        {/* ORDER ARRIVAL TIME */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2">
          <div className="text-2xl">🚚</div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              ORDER ARRIVAL TIME
            </div>
            <div className="text-sm font-extrabold truncate text-stone-800 font-mono">
              3.0 Days
            </div>
          </div>
        </div>

        {/* CONTRACTS */}
        <div 
          onClick={() => setShowContractsModal(true)}
          className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-rose-50/50 transition-colors relative"
        >
          <div className="text-2xl relative">
            📋
            {pendingNotificationContracts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 text-[7px] text-white font-bold items-center justify-center">
                  {pendingNotificationContracts.length}
                </span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase flex items-center gap-1">
              CONTRACTS
              {pendingNotificationContracts.length > 0 && (
                <span className="px-1 py-0.2 bg-rose-500 text-white text-[7px] rounded-full font-bold animate-pulse">NEW</span>
              )}
            </div>
            <div className="text-sm font-extrabold truncate text-rose-500">
              {activeContracts.length} Active
            </div>
          </div>
        </div>

        {/* RANK */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2">
          <div className="text-2xl">🏆</div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              RANK
            </div>
            <div className="text-sm font-extrabold truncate text-amber-600 font-mono">
              #{rank} / {totalTeams}
            </div>
          </div>
        </div>

        {/* TEAM WORKSPACE */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2">
          <div className="text-2xl">🧁</div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              TEAM WORKSPACE
            </div>
            <div className="text-sm font-extrabold truncate text-stone-800" title={teamState.name}>
              {teamState.name}
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
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Cash</div>
                <div className="text-xs font-extrabold truncate text-emerald-600 font-mono">
                  ₹{teamState.cash.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Live Day Count */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">⏱️</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Live Day Count</div>
                <div className="text-sm font-black truncate text-stone-900 font-mono">
                  Day {room.currentDay ?? 0}
                </div>
              </div>
            </div>

            {/* Order Arrival Time */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">🚚</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Order Arrival Time</div>
                <div className="text-xs font-extrabold truncate text-stone-800 font-mono">
                  3.0 Days
                </div>
              </div>
            </div>

            {/* Contracts */}
            <div 
              onClick={() => { setShowContractsModal(true); setShowMobileMenu(false); }}
              className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20 cursor-pointer"
            >
              <div className="text-xl">📋</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Contracts</div>
                <div className="text-xs font-extrabold truncate text-rose-500">
                  {activeContracts.length} Active
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

          {/* Workspace & Settings */}
          <div className="rounded-xl border border-rose-100 p-3 bg-rose-50/10 space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-xl">🧁</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Workspace</div>
                <div className="text-xs font-bold text-stone-800 truncate">
                  {teamState.name}
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

      {/* Floating Contract Notification Toast (appears when new contract unlocks on currentDay) */}
      {pendingNotificationContracts.length > 0 && !showContractsModal && (
        <div className="fixed top-16 right-6 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-white/50 flex items-center gap-3 max-w-sm">
            <div className="text-2xl bg-white/20 p-2 rounded-xl">📜</div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-mono tracking-widest text-blue-200 font-bold">
                New Wholesale Deal Available!
              </div>
              <div className="text-xs font-black truncate">
                {pendingNotificationContracts[0].name} (Day {pendingNotificationContracts[0].startDay})
              </div>
              <div className="text-[9px] text-blue-100 opacity-90 font-mono mt-0.5">
                Target: {pendingNotificationContracts[0].dailyQuantity} Muffins/day
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
                onClick={() => setClosedNoticeContractIds(prev => [...prev, pendingNotificationContracts[0].id])}
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
              Contracts offer premium price multipliers but carry heavy daily penalties if you fail to deliver the targeted volume. Monitor active days closely.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {visibleContracts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic">No wholesale contracts active or available on Day {currentDay}. Contracts will unlock as simulation days progress.</div>
              ) : (
                visibleContracts.map(c => {
                  const isExpired = currentDay > c.endDay;
                  const isOfferPending = !c.status || c.status === 'offered';

                  return (
                    <div 
                      key={c.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isExpired 
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-400 opacity-60' 
                          : isOfferPending 
                            ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-300 shadow-sm' 
                            : c.status === 'declined' 
                              ? 'bg-red-50/50 border-red-200 text-slate-400 opacity-60' 
                              : c.active 
                                ? 'bg-pink-50/50 border-pink-300 text-slate-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold font-mono ${isExpired ? 'text-zinc-300 line-through' : ''}`}>{c.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-pixel ${
                          isExpired ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                          isOfferPending ? 'bg-blue-600 text-white animate-pulse' :
                          c.status === 'declined' ? 'bg-red-100 text-red-700' :
                          c.status === 'completed' ? 'bg-zinc-800 text-zinc-300' :
                          c.active ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {isExpired ? 'COLLAPSED / EXPIRED' :
                           isOfferPending ? 'NEW OFFER (DAY ' + c.startDay + ')' :
                           c.status === 'declined' ? 'DECLINED' :
                           c.status === 'completed' ? 'COMPLETED' :
                           c.active ? 'ACTIVE' : 'UPCOMING'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>Days: {c.startDay} - {c.endDay}</div>
                        <div>Daily Target: {c.dailyQuantity} Muffins</div>
                        <div className={isExpired ? 'text-zinc-400' : 'text-green-600'}>Price Multiplier: {c.priceMultiplier}x</div>
                        <div className={isExpired ? 'text-zinc-500' : 'text-red-500 font-bold'}>Penalty: ₹{c.penalty}/missed</div>
                      </div>

                      {isOfferPending && !isExpired ? (
                        <div className="mt-3 pt-2 border-t border-blue-200 flex justify-end gap-2">
                          {role === 'controller' ? (
                            <>
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
                            </>
                          ) : (
                            <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Waiting for Controller</span>
                          )}
                        </div>
                      ) : isExpired ? (
                        <div className="mt-2 pt-1 text-[9px] text-zinc-500 font-mono italic">
                          Contract period concluded on Day {c.endDay}. Collapsed.
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
