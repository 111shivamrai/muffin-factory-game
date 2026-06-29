import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { HelpCircle, Activity, AlertTriangle } from 'lucide-react';

export default function OperationsAdvisor() {
  const { teamState, room } = useGameStore();
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

  const logs: string[] = [];

  const history = teamState.history;
  if (history && history.bottlenecks && history.bottlenecks.length > 0) {
    const lastIdx = history.bottlenecks.length - 1;
    const currentBottleneck = history.bottlenecks[lastIdx];
    const capacity = history.bottleneckCapacity[lastIdx];
    logs.push(`Day ${room.currentDay}: ${currentBottleneck} was the limiting bottleneck stage (Capacity: ${capacity} units).`);
    if (history.bottlenecks.length > 5) {
      const prevB = history.bottlenecks[lastIdx - 3];
      if (prevB !== currentBottleneck) {
        logs.push(`Note: Bottleneck shifted from ${prevB} to ${currentBottleneck} over the past 3 days.`);
      }
    }
  }

  if (teamState.report.stockoutDays > 0) {
    logs.push(`Alert: Your factory has experienced ${teamState.report.stockoutDays} stockout day(s) due to missing raw materials.`);
  }

  teamState.activeEvents.forEach(ev => {
    if (ev.active && ev.targetVariable === 'lead_time') {
      logs.push(`Alert: Material transportation disruption has increased lead times by ${ev.modifier} day(s).`);
    }
  });

  const activeContracts = teamState.contracts.filter(c => c.active);
  activeContracts.forEach(c => {
    const fulfillRatio = c.dailyQuantity > 0 ? (c.fulfilledToday / c.dailyQuantity) : 1.0;
    if (fulfillRatio < 0.90) {
      logs.push(`Warning: Contract "${c.name}" fulfillment fell below target. Delivery: ${c.fulfilledToday}/${c.dailyQuantity}. Penalty incurred.`);
    }
  });

  if (teamState.breakdownStates) {
    teamState.breakdownStates.forEach(bs => {
      if (bs.daysRemaining.length > 0) {
        logs.push(`Incident: ${bs.brokenCount} ${bs.machineType} machine(s) broke down. Repair duration remaining: ${bs.daysRemaining.join(', ')} day(s).`);
      }
    });
  }

  if (logs.length === 0) {
    logs.push("Day 01: Factory setup normal. Current operations metrics are stable.");
  }

  const hasNewAlerts = room.currentDay > lastReadDay;
  const alertLogsCount = logs.filter(log => 
    log.includes('Alert') || log.includes('Warning') || log.includes('Incident')
  ).length;
  const unreadCount = hasNewAlerts ? Math.max(1, alertLogsCount) : 0;

  return (
    <>
      {/* Compact advisor bar button */}
      <div 
        onClick={handleOpen}
        className="bg-gradient-to-r from-sky-400 to-blue-500 text-white p-3 flex items-center gap-3 shadow-[0_2px_0_#1d4ed8] rounded-2xl cursor-pointer hover:from-sky-500 hover:to-blue-600 transition-all select-none shrink-0"
      >
        <span className="size-9 rounded-lg bg-white/20 grid place-items-center text-xl shrink-0">
          👨‍🍳
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm tracking-wide">OPERATIONS ADVISOR</div>
          <div className="text-[11px] text-white/85 truncate">Retrospective factory insights</div>
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
          <div className="bg-[#fffdfb] border border-[#e8d9c4] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-[#1e1408]">
            <div className="flex justify-between items-center border-b border-[#f0e6d6] pb-3">
              <span className="font-serif font-bold text-sm uppercase tracking-wider text-[#c8852a] flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-[#c8852a]" />
                <span>OPERATIONS ADVISOR INTEL</span>
              </span>
              <button 
                onClick={handleClose} 
                className="text-[#9a7a52] hover:text-[#1e1408] text-xl border-none bg-transparent cursor-pointer font-bold transition-colors"
              >
                &times;
              </button>
            </div>

            <p className="text-[#6b4e30] text-[11px] leading-relaxed">
              The advisor analyzes previous ticks retrospectively to identify workflow bottlenecks, material stockouts, and contract performance deficits.
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {logs.map((log, idx) => {
                const isWarning = log.includes('Warning') || log.includes('Alert') || log.includes('Incident');
                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed flex items-start space-x-2.5 ${
                      isWarning 
                        ? 'bg-red-50/60 border-red-200 text-red-700' 
                        : 'bg-[#faf6f0] border-[#e8d9c4] text-[#6b4e30]'
                    }`}
                  >
                    {isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <Activity className="w-4 h-4 text-[#c8852a] shrink-0 mt-0.5" />
                    )}
                    <span>{log}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center border-t border-[#f0e6d6] pt-4">
              <span className="text-[9px] text-[#9a7a52] uppercase tracking-widest font-mono">
                Logs auto-update on day increments
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
