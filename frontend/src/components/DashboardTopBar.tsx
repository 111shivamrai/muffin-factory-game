import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Settings, LogOut, ClipboardList } from 'lucide-react';

export default function DashboardTopBar() {
  const { room, teamState, role, leaderboard, logout, updateContractStatus } = useGameStore();
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  if (!room || !teamState) return null;

  // Resolve rank
  const rankEntry = leaderboard.find(e => e.teamId === teamState.id);
  const rank = rankEntry ? rankEntry.rank : 'N/A';
  const totalTeams = leaderboard.length || 1;

  // Resolve live lead time based on active events
  let leadTimeDays = 3.0; // Default
  let leadTimeMod = 0;
  teamState.activeEvents.forEach(e => {
    if (e.active && e.targetVariable === 'lead_time') {
      leadTimeMod += e.modifier;
    }
  });
  leadTimeDays = Math.max(1, 3.0 + leadTimeMod);

  // Active contracts count
  const activeContracts = teamState.contracts.filter(c => c.active);

  // Stats cards rendering helpers
  function StatCard({ icon, title, value }: any) {
    return (
      <div className="bg-white rounded-xl p-2.5 border border-[#ffd5c6] shadow-sm flex items-center gap-2">
        <div className="text-xl flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{title}</div>
          <div className="font-bold text-slate-800 text-xs mt-0.5">{value}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#ffe7df] border border-[#ffd5c6] rounded-2xl p-3 shadow-sm select-none relative z-30">
      <div className="flex flex-wrap xl:flex-nowrap gap-2 items-center justify-between">

        {/* Logo block */}
        <div className="bg-white rounded-xl p-2.5 border border-[#ffd5c6] flex items-center gap-2 shrink-0">
          <div className="text-2xl animate-bounce">🧁</div>
          <div>
            <h1 className="font-bold font-pixel text-[11px] tracking-wider text-pink-600">MUFFIN FACTORY</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`px-1.5 py-0.25 rounded text-[8px] font-bold ${
                role === 'controller' ? 'bg-green-100 text-green-700 border border-green-300' :
                'bg-blue-100 text-blue-700 border border-blue-300'
              }`}>
                {role === 'controller' ? 'CONTROLLER' : 'OBSERVER'}
              </span>
              <span className="text-[8px] text-slate-500 font-mono font-bold">ROOM CODE: {room.code}</span>
            </div>
          </div>
        </div>

        {/* Day Timer */}
        <StatCard 
          icon="📅" 
          title="DAY" 
          value={`Day ${room.currentDay}`} 
        />

        {/* Today's Demand */}
        <StatCard 
          icon="📈" 
          title="TODAY'S DEMAND" 
          value={`${teamState.history?.demand?.length ? teamState.history.demand[teamState.history.demand.length - 1] : 0} Muffins`} 
        />

        {/* Total Cash */}
        <StatCard 
          icon="💰" 
          title="TOTAL CASH" 
          value={`₹${teamState.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
        />

        {/* Daily Production */}
        <StatCard 
          icon="🏭" 
          title="DAILY PRODUCTION" 
          value={`${teamState.history?.production?.length ? teamState.history.production[teamState.history.production.length - 1] : 0} Muffins`} 
        />

        {/* Lead Time */}
        <StatCard 
          icon="⏱️" 
          title="LIVE LEAD TIME" 
          value={`${leadTimeDays.toFixed(1)} Days`} 
        />

        {/* Contracts button/stat */}
        <div 
          onClick={() => setShowContractsModal(true)}
          className="bg-white hover:bg-slate-50 rounded-xl p-2.5 border border-[#ffd5c6] shadow-sm flex items-center gap-2 cursor-pointer transition-all"
        >
          <div className="text-xl flex items-center justify-center">
            📋
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CONTRACTS</div>
            <div className="font-bold text-pink-600 text-xs mt-0.5">{activeContracts.length} Active</div>
          </div>
        </div>

        {/* Rank */}
        <StatCard 
          icon="🏆" 
          title="RANK" 
          value={`#${rank} / ${totalTeams}`} 
        />

        {/* Workspace and Settings */}
        <div className="bg-white rounded-xl p-2.5 border border-[#ffd5c6] shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="text-xl">🧁</div>
            <div className="overflow-hidden">
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">TEAM WORKSPACE</div>
              <div className="font-bold text-slate-700 text-[10px] truncate" title={teamState.name}>{teamState.name}</div>
            </div>
          </div>
          
          {/* Settings gear */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="p-1.5 bg-pink-500 hover:bg-pink-600 border border-pink-400 text-white rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-sm"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {showSettingsDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#ffd5c6] rounded-lg shadow-xl z-40 font-sans text-xs overflow-hidden">
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
        </div>

      </div>

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
