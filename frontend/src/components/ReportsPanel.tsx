import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

function ReportsPanel() {
  const teamState = useGameStore(
    useShallow((state) => state.teamState)
  );
  const [selectedChart, setSelectedChart] = useState<'cash' | 'demand' | 'inventory' | 'utilization'>('cash');

  if (!teamState) return null;

  const { report, history, academicScore } = teamState;

  // Prepare chart data from history arrays (memoized)
  const chartData = useMemo(() => {
    return history.days.map((d, idx) => ({
      day: `Day ${d}`,
      cash: history.cash[idx],
      revenue: history.revenue[idx],
      demand: history.demand[idx],
      baseMix: history.inventory.base_mix[idx],
      packaging: history.inventory.packaging_material[idx],
      muffins: history.inventory.finished_muffin[idx],
      mixing: history.utilization.mixing[idx],
      baking: history.utilization.baking[idx],
      icing: history.utilization.icing[idx],
      packagingUtil: history.utilization.packaging[idx],
      bottleneck: history.bottlenecks[idx],
      bottleneckCap: history.bottleneckCapacity[idx]
    }));
  }, [
    history.days,
    history.cash,
    history.revenue,
    history.demand,
    history.inventory.base_mix,
    history.inventory.packaging_material,
    history.inventory.finished_muffin,
    history.utilization.mixing,
    history.utilization.baking,
    history.utilization.icing,
    history.utilization.packaging,
    history.bottlenecks,
    history.bottleneckCapacity
  ]);

  return (
    <div className="space-y-3 font-sans">
      
      {/* ── Chart Card ── */}
      <section className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden">
        <div className="p-3">
          <div className="rounded-xl bg-rose-50/40 border border-rose-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-4 text-xs font-bold">
                {[
                  { id: 'cash', label: 'Cash & Revenue' },
                  { id: 'demand', label: 'Demand vs Sales' },
                  { id: 'inventory', label: 'Inventory On Hand' },
                  { id: 'utilization', label: 'Machine Utilizations' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedChart(tab.id as any)}
                    className={`pb-0.5 cursor-pointer border-none bg-transparent transition-all ${
                      selectedChart === tab.id
                        ? 'text-rose-500 border-b-2 border-rose-400 font-bold'
                        : 'text-stone-500 font-semibold hover:text-stone-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] font-bold text-stone-500 tracking-wider">
                SIMULATION PROGRESS: DAY {history.days.length}
              </div>
            </div>

            <div className="h-56 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-stone-400 font-mono italic border border-dashed border-stone-200 rounded-xl">
                  Awaiting daily simulation ticks to populate metrics...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {selectedChart === 'cash' ? (
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                      <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#78716c" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                      <Line type="monotone" dataKey="cash" name="Liquid Cash" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 2 }} />
                    </LineChart>
                  ) : selectedChart === 'demand' ? (
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                      <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#78716c" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                      <Line type="monotone" dataKey="demand" name="Market Demand" stroke="#fb923c" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="revenue" name="Sales Proxy" stroke="#60a5fa" strokeWidth={1.5} dot={{ r: 2 }} />
                    </LineChart>
                  ) : selectedChart === 'inventory' ? (
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                      <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#78716c" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                      <Line type="monotone" dataKey="baseMix" name="Mix Ingredients" stroke="#34d399" strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="packaging" name="Packaging Packs" stroke="#60a5fa" strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="muffins" name="Finished Muffins" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                      <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#78716c" tick={{ fontSize: 10 }} tickFormatter={e => `${e}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                      <Line type="monotone" dataKey="mixing" name="Mixing Station" stroke="#34d399" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="baking" name="Baking Oven" stroke="#fb923c" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="icing" name="Icing Station" stroke="#a78bfa" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="packagingUtil" name="Packaging Station" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Reports & Analytics Metrics ── */}
      <section className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden">
        <header className="px-4 py-2.5 bg-gradient-to-r from-rose-100 to-pink-100 font-extrabold tracking-wide text-sm flex items-center gap-2">
          <span className="text-rose-500">📈 REPORTS & ANALYTICS</span>
        </header>
        <div className="p-3 grid grid-cols-5 gap-2">
          {[
            { l: 'NET REVENUE', v: `₹${report.revenue.toLocaleString()}`, icon: '📈', tint: 'bg-orange-50' },
            { l: 'TOTAL COST', v: `₹${report.costs.toLocaleString()}`, icon: '🪙', tint: 'bg-amber-50' },
            { l: 'NET PROFIT', v: `₹${report.profit.toLocaleString()}`, icon: '💰', tint: 'bg-emerald-50' },
            { l: 'FILL RATE', v: `${report.fillRate}%`, icon: '🍩', tint: 'bg-sky-50' },
            { l: 'STOCKOUT DAYS', v: `${report.stockoutDays} Days`, icon: '📅', tint: 'bg-rose-50' }
          ].map(e => (
            <div key={e.l} className={`rounded-xl ${e.tint} border border-stone-100 p-2 flex items-center gap-2 min-w-0`}>
              <div className="text-xl shrink-0">{e.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold text-stone-500 tracking-wider truncate">{e.l}</div>
                <div className="text-sm font-extrabold text-stone-800 truncate font-mono">{e.v}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Academic Performance Score ── */}
      <section className="rounded-2xl bg-gradient-to-r from-violet-50 to-pink-50 border border-violet-100 shadow-[0_2px_0_#e9d5ff] overflow-hidden">
        <header className="px-4 py-2.5 font-extrabold tracking-wide text-sm flex items-center gap-2">
          <span className="text-violet-500">🧁 ACADEMIC PERFORMANCE SCORE</span>
        </header>
        <div className="p-3 grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className="text-[10px] text-stone-500 leading-snug max-w-xs mb-2">
              Indicators evaluate operational analysis based on a weighted academic rubric. This score strengthens leaderboard call balance.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { l: 'CASH (40%)', v: `${academicScore.cashPerformance}%`, icon: '💵' },
                { l: 'FILL RATE (20%)', v: `${academicScore.fillRateScore}%`, icon: '🍩' },
                { l: 'CONTRACT (15%)', v: `${academicScore.contractScore}%`, icon: '🧁' },
                { l: 'INVENTORY (15%)', v: `${academicScore.inventoryScore}%`, icon: '🧁' },
                { l: 'CAPACITY (10%)', v: `${academicScore.capacityScore}%`, icon: '🧁' }
              ].map(e => (
                <div key={e.l} className="rounded-xl bg-white/70 border border-violet-100 p-2 text-center">
                  <div className="text-[9px] font-bold text-stone-500 tracking-wider">{e.l}</div>
                  <div className="mt-1 text-lg">{e.icon}</div>
                  <div className="text-sm font-extrabold text-stone-800 mt-0.5 font-mono">{e.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weighted Academic Grade Score Box */}
          <div className="rounded-xl bg-white border border-violet-100 p-3 flex flex-col items-center justify-center min-w-[180px]">
            <div className="text-[10px] font-extrabold text-stone-500 tracking-wider">WEIGHTED ACADEMIC GRADE</div>
            <div className="text-3xl font-extrabold text-rose-500 leading-none mt-1">SCORE:</div>
            <div className="text-3xl font-extrabold text-rose-500 leading-none mt-1 font-mono">
              {academicScore.totalScore >= 1 ? academicScore.totalScore : `.${Math.round(academicScore.totalScore * 100)}`} / 100
            </div>
            <div className="text-2xl mt-1">🧁</div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default React.memo(ReportsPanel);
