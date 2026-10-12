import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { Download, GraduationCap, DollarSign, CheckCircle2, FileText, Boxes, Gauge, Award, TrendingUp, Receipt, CalendarX, BarChart3 } from 'lucide-react';
import { generateTeamReportPDF } from '../utils/reportPdfGenerator.js';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

function ReportsPanel() {
  const { teamState, room, leaderboard } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
      room: state.room,
      leaderboard: state.leaderboard,
    }))
  );
  const [selectedChart, setSelectedChart] = useState<'cash' | 'demand' | 'inventory' | 'utilization'>('cash');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    if (!teamState) return;
    setIsGeneratingPdf(true);
    try {
      let rank: number | null = null;
      if (leaderboard && leaderboard.length > 0) {
        const entry = leaderboard.find(t => t.teamId === teamState.id);
        if (entry) rank = entry.rank;
      }
      await generateTeamReportPDF(room, teamState, rank);
    } catch (err) {
      console.error('Failed to generate report PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-3 font-sans">
      
      {/* ── Chart Card ── */}
      <section className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden">
        <div className="p-3">
          <div className="rounded-xl bg-rose-50/40 border border-rose-100 p-3">
            {/* Analytics Header: Progress Badge & Action */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-rose-100/70">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black text-stone-800 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                  <span>📊</span>
                  <span>PERFORMANCE ANALYTICS</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100/80 text-rose-700 border border-rose-200 text-[9.5px] font-extrabold tracking-wider font-mono">
                  SIMULATION DAY {history.days.length} OF {room?.maxDays || 30}
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 border border-rose-300 rounded-xl cursor-pointer transition-all shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                title="Download comprehensive PDF report"
              >
                <Download className="w-3.5 h-3.5 text-rose-500" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'PDF Report'}</span>
              </button>
            </div>

            {/* Senior UI/UX Segmented Graph Tab Bar */}
            <div className="p-1 rounded-2xl bg-white/90 border border-rose-200/80 shadow-2xs mb-3 flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'cash', label: 'Cash & Revenue', icon: '🪙' },
                { id: 'demand', label: 'Demand vs Sales', icon: '📈' },
                { id: 'inventory', label: 'Inventory On Hand', icon: '📦' },
                { id: 'utilization', label: 'Machine Utilizations', icon: '⚙️' }
              ].map(tab => {
                const isActive = selectedChart === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedChart(tab.id as any)}
                    className={`flex-1 min-w-fit px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all border select-none ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-600 shadow-sm shadow-rose-200/60 scale-[1.01]'
                        : 'bg-transparent text-stone-600 border-transparent hover:bg-rose-50/60 hover:text-stone-900'
                    }`}
                  >
                    <span className="text-xs shrink-0">{tab.icon}</span>
                    <span className="whitespace-nowrap tracking-wide">{tab.label}</span>
                  </button>
                );
              })}
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
      <section className="rounded-2xl bg-white border border-stone-200 shadow-xs overflow-hidden">
        <header className="px-4 py-3 bg-stone-50 border-b border-stone-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-extrabold tracking-wide text-xs uppercase text-stone-800">
              Reports & Analytics
            </span>
          </div>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            Operational Summary
          </span>
        </header>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {[
            { l: 'NET REVENUE', v: `₹${report.revenue.toLocaleString()}`, icon: TrendingUp, tint: 'bg-orange-50/80 border-orange-200 text-orange-600' },
            { l: 'TOTAL COST', v: `₹${report.costs.toLocaleString()}`, icon: Receipt, tint: 'bg-amber-50/80 border-amber-200 text-amber-600' },
            { l: 'NET PROFIT', v: `₹${report.profit.toLocaleString()}`, icon: DollarSign, tint: 'bg-emerald-50/80 border-emerald-200 text-emerald-600' },
            { l: 'FILL RATE', v: `${report.fillRate}%`, icon: CheckCircle2, tint: 'bg-sky-50/80 border-sky-200 text-sky-600' },
            { l: 'STOCKOUT DAYS', v: `${report.stockoutDays} Days`, icon: CalendarX, tint: 'bg-rose-50/80 border-rose-200 text-rose-600' }
          ].map(e => {
            const Icon = e.icon;
            return (
              <div key={e.l} className="rounded-xl bg-stone-50/80 border border-stone-200/80 p-2.5 flex items-center gap-2.5 min-w-0 transition-all hover:bg-stone-50">
                <div className={`p-2 rounded-lg border ${e.tint} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold text-stone-500 tracking-wider truncate uppercase">{e.l}</div>
                  <div className="text-sm font-extrabold text-stone-800 truncate font-mono mt-0.5">{e.v}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Academic Performance Score ── */}
      <section className="rounded-2xl bg-white border border-stone-200 shadow-xs overflow-hidden">
        <header className="px-4 py-3 bg-stone-50 border-b border-stone-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-extrabold tracking-wide text-xs uppercase text-stone-800">
              Academic Performance Score
            </span>
          </div>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            Evaluation Rubric
          </span>
        </header>

        <div className="p-4 space-y-3">
          <p className="text-xs text-stone-600 leading-relaxed">
            Your academic score measures financial performance, customer demand fulfillment, contract execution, inventory control, and production capacity using a weighted evaluation rubric.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            {/* 5 Categories Grid */}
            <div className="md:col-span-8 lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { l: 'Cash', w: '40%', v: `${academicScore.cashPerformance}%`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-150' },
                { l: 'Fill Rate', w: '20%', v: `${academicScore.fillRateScore}%`, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50 border-sky-150' },
                { l: 'Contract', w: '15%', v: `${academicScore.contractScore}%`, icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-150' },
                { l: 'Inventory', w: '15%', v: `${academicScore.inventoryScore}%`, icon: Boxes, color: 'text-amber-600 bg-amber-50 border-amber-150' },
                { l: 'Capacity', w: '10%', v: `${academicScore.capacityScore}%`, icon: Gauge, color: 'text-purple-600 bg-purple-50 border-purple-150' }
              ].map(e => {
                const Icon = e.icon;
                return (
                  <div key={e.l} className="rounded-xl bg-stone-50/80 border border-stone-200/80 p-2.5 flex flex-col justify-between text-center transition-all hover:bg-stone-50">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className={`p-1 rounded-md border ${e.color}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-stone-400">{e.w}</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold text-stone-600 uppercase tracking-tight">{e.l}</div>
                      <div className="text-base font-black text-stone-800 font-mono mt-0.5">{e.v}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final Weighted Grade Box */}
            <div className="md:col-span-4 lg:col-span-3 rounded-xl bg-gradient-to-br from-indigo-50 via-white to-stone-50 border border-indigo-150 p-3.5 flex flex-col items-center justify-center text-center shadow-2xs">
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-indigo-700 uppercase tracking-wider mb-1">
                <Award className="w-3.5 h-3.5" />
                <span>Weighted Academic Grade</span>
              </div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-tight">Composite Score</div>
              <div className="text-3xl font-black text-indigo-600 font-mono tracking-tight my-0.5">
                {academicScore.totalScore >= 1 ? academicScore.totalScore : `.${Math.round(academicScore.totalScore * 100)}`}
                <span className="text-sm font-bold text-stone-400 font-sans ml-1">/ 100</span>
              </div>
              <div className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
                {academicScore.totalScore >= 80 ? 'Distinction' : academicScore.totalScore >= 60 ? 'Satisfactory' : 'Needs Review'}
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default React.memo(ReportsPanel);
