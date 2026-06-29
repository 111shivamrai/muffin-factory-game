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

  // Active contracts count
  const activeContracts = teamState.contracts.filter(c => c.active);

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
      <div className="hidden lg:grid flex-1 grid-cols-5 gap-2 mx-2">
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

        {/* LIVE LEAD TIME */}
        <div className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2">
          <div className="text-2xl">⏱️</div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              LIVE LEAD TIME
            </div>
            <div className="text-sm font-extrabold truncate text-stone-800 font-mono">
              {leadTime}
            </div>
          </div>
        </div>

        {/* CONTRACTS */}
        <div 
          onClick={() => setShowContractsModal(true)}
          className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-rose-50/50 transition-colors"
        >
          <div className="text-2xl">📋</div>
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold text-stone-500 tracking-wider truncate uppercase">
              CONTRACTS
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

            {/* Lead Time */}
            <div className="rounded-xl border border-rose-100 p-2.5 flex items-center gap-2 bg-rose-50/20">
              <div className="text-xl">⏱️</div>
              <div className="min-w-0">
                <div className="text-[8px] font-bold text-stone-500 uppercase tracking-wider">Lead Time</div>
                <div className="text-xs font-extrabold truncate text-stone-800 font-mono">
                  {leadTime}
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
              {teamState.contracts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic">No active contracts assigned to this room.</div>
              ) : (
                teamState.contracts.map(c => (
                  <div 
                    key={c.id}
                    className={`p-3 rounded-xl border ${
                      c.status === 'offered' ? 'bg-blue-50/50 border-blue-300' :
                      c.status === 'declined' ? 'bg-red-50/50 border-red-200 text-slate-400 opacity-75' :
                      c.active 
                        ? 'bg-pink-50/50 border-pink-300 text-slate-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold font-mono">{c.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-pixel ${
                        c.status === 'offered' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'declined' ? 'bg-red-100 text-red-700' :
                        c.status === 'completed' ? 'bg-green-100 text-green-700' :
                        c.active ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {c.status === 'offered' ? 'NEW OFFER' :
                         c.status === 'declined' ? 'DECLINED' :
                         c.status === 'completed' ? 'COMPLETED' :
                         c.active ? 'ACTIVE' : 'UPCOMING'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>Days: {c.startDay} - {c.endDay}</div>
                      <div>Daily Target: {c.dailyQuantity} Muffins</div>
                      <div className="text-green-600">Price Multiplier: {c.priceMultiplier}x</div>
                      <div className="text-red-500 font-bold">Penalty: ₹{c.penalty}/missed</div>
                    </div>

                    {c.status === 'offered' ? (
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
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[9px] font-bold border-none cursor-pointer shadow-sm transition-colors"
                            >
                              ACCEPT DEAL
                            </button>
                          </>
                        ) : (
                          <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Waiting for Controller</span>
                        )}
                      </div>
                    ) : c.status === 'declined' ? null : (c.active || c.status === 'completed' || c.status === 'accepted') ? (
                      <div className="mt-2 pt-2 border-t border-pink-200 flex justify-between text-[10px] text-pink-600 font-bold font-mono">
                        <span>Fulfilled Today: {c.fulfilledToday} / {c.dailyQuantity}</span>
                        <span>Total Fulfilled: {c.totalFulfilled} / {c.totalTarget}</span>
                      </div>
                    ) : null}
                  </div>
                ))
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
