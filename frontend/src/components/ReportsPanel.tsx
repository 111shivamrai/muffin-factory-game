import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { 
  Download, GraduationCap, DollarSign, CheckCircle2, FileText, 
  Boxes, Gauge, Award, TrendingUp, Receipt, CalendarX, BarChart3, X
} from 'lucide-react';
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
  const [activeModal, setActiveModal] = useState<'performance' | 'reports' | 'academic' | null>(null);

  // Keyboard accessibility: ESC key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      const { generateTeamReportPDF } = await import('../utils/reportPdfGenerator.js');
      await generateTeamReportPDF(room, teamState, rank);
    } catch (err) {
      console.error('Failed to generate report PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="font-sans">
      
      {/* ── 3 Clickable Analytics Hub Cards directly below Factory Animation ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        
        {/* Card 1: Performance Analytics */}
        <button
          type="button"
          onClick={() => setActiveModal('performance')}
          className="group text-left p-3 rounded-2xl bg-white border border-rose-200/90 shadow-2xs hover:shadow-md hover:border-rose-400 active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between h-[110px] relative overflow-hidden"
          title="Click to view interactive graphs and metrics"
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-black tracking-wide uppercase text-stone-800 block truncate font-sans">
                  Performance Analytics
                </span>
                <span className="text-[9px] font-medium text-stone-500 block truncate">
                  Graphs, trends & trajectories
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-full shrink-0">
              Day {history.days.length}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-extrabold text-rose-600 pt-2 border-t border-rose-100/60 mt-1 w-full">
            <span className="text-[10px] text-stone-500 font-mono">4 Live Graphs</span>
            <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              View Analytics <span>→</span>
            </span>
          </div>
        </button>

        {/* Card 2: Reports & Analytics */}
        <button
          type="button"
          onClick={() => setActiveModal('reports')}
          className="group text-left p-3 rounded-2xl bg-white border border-amber-200/90 shadow-2xs hover:shadow-md hover:border-amber-400 active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between h-[110px] relative overflow-hidden"
          title="Click to view financial statements and operational summary"
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-black tracking-wide uppercase text-stone-800 block truncate font-sans">
                  Reports & Analytics
                </span>
                <span className="text-[9px] font-medium text-stone-500 block truncate">
                  Financial & operational audit
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full shrink-0">
              {report.fillRate}% Fill
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-700 pt-2 border-t border-amber-100/60 mt-1 w-full">
            <span className="text-[10px] text-stone-600 font-mono font-bold">
              ₹{report.profit.toLocaleString()} Profit
            </span>
            <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Open Reports <span>→</span>
            </span>
          </div>
        </button>

        {/* Card 3: Academic Performance Score */}
        <button
          type="button"
          onClick={() => setActiveModal('academic')}
          className="group text-left p-3 rounded-2xl bg-white border border-indigo-200/90 shadow-2xs hover:shadow-md hover:border-indigo-400 active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between h-[110px] relative overflow-hidden"
          title="Click to view weighted academic score and evaluation rubric"
        >
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-black tracking-wide uppercase text-stone-800 block truncate font-sans">
                  Academic Performance
                </span>
                <span className="text-[9px] font-medium text-stone-500 block truncate">
                  Score, weights & rubric grade
                </span>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full shrink-0">
              {academicScore.totalScore >= 1 ? academicScore.totalScore : `.${Math.round(academicScore.totalScore * 100)}`}/100
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-extrabold text-indigo-600 pt-2 border-t border-indigo-100/60 mt-1 w-full">
            <span className="text-[10px] text-stone-500 font-mono">
              {academicScore.totalScore >= 80 ? '🌟 Distinction' : academicScore.totalScore >= 60 ? '✨ Satisfactory' : '⚠️ Needs Review'}
            </span>
            <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              View Score <span>→</span>
            </span>
          </div>
        </button>
      </div>

      {/* ── Modal Pop-up Overlays ── */}
      {activeModal && (
        <div 
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header showing ONLY the selected section's title & icon */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200 bg-stone-50/95 shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {activeModal === 'performance' ? (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xs shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black tracking-tight uppercase text-stone-900 font-sans">
                        PERFORMANCE ANALYTICS
                      </h3>
                      <p className="text-[10px] text-stone-500 font-medium truncate">
                        Graphs, trends & simulation trajectories
                      </p>
                    </div>
                  </>
                ) : activeModal === 'reports' ? (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black tracking-tight uppercase text-stone-900 font-sans">
                        REPORTS & ANALYTICS
                      </h3>
                      <p className="text-[10px] text-stone-500 font-medium truncate">
                        Financial statements & operational summary
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-xs shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black tracking-tight uppercase text-stone-900 font-sans">
                        ACADEMIC PERFORMANCE SCORE
                      </h3>
                      <p className="text-[10px] text-stone-500 font-medium truncate">
                        Weighted evaluation rubric & academic grading
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors cursor-pointer shrink-0 border-none"
                title="Close dialog (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* ── MODAL VIEW 1: Performance Analytics ── */}
              {activeModal === 'performance' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="rounded-2xl bg-white border border-rose-100 shadow-xs p-4 sm:p-5">
                    {/* Header with Day badge and PDF Report button */}
                    <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-rose-100 gap-2">
                      <span className="px-3 py-1 rounded-full bg-rose-100/80 text-rose-700 border border-rose-200 text-[10px] font-extrabold tracking-wider font-mono">
                        SIMULATION DAY {history.days.length} OF {room?.maxDays || 30}
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 border border-rose-300 rounded-xl cursor-pointer transition-all shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        title="Download comprehensive PDF report"
                      >
                        <Download className="w-3.5 h-3.5 text-rose-500" />
                        <span>{isGeneratingPdf ? 'Generating PDF...' : 'PDF Report'}</span>
                      </button>
                    </div>

                    {/* Chart Tabs */}
                    <div className="p-1 rounded-2xl bg-stone-100/80 border border-rose-200/80 mb-4 flex items-center gap-1.5 overflow-x-auto">
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

                    {/* Responsive Line Chart Area */}
                    <div className="h-72 w-full">
                      {chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-stone-400 font-mono italic border border-dashed border-stone-200 rounded-xl">
                          Awaiting daily simulation ticks to populate metrics...
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          {selectedChart === 'cash' ? (
                            <LineChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                              <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#78716c" tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                              <Line type="monotone" dataKey="cash" name="Liquid Cash (₹)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                              <Line type="monotone" dataKey="revenue" name="Daily Revenue (₹)" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 2 }} />
                            </LineChart>
                          ) : selectedChart === 'demand' ? (
                            <LineChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                              <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#78716c" tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                              <Line type="monotone" dataKey="demand" name="Market Demand" stroke="#fb923c" strokeWidth={2} dot={{ r: 2 }} />
                              <Line type="monotone" dataKey="revenue" name="Sales Proxy" stroke="#60a5fa" strokeWidth={1.5} dot={{ r: 2 }} />
                            </LineChart>
                          ) : selectedChart === 'inventory' ? (
                            <LineChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                              <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#78716c" tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                              <Line type="monotone" dataKey="baseMix" name="Mix Ingredients" stroke="#34d399" strokeWidth={1.5} dot={{ r: 2 }} />
                              <Line type="monotone" dataKey="packaging" name="Packaging Packs" stroke="#60a5fa" strokeWidth={1.5} dot={{ r: 2 }} />
                              <Line type="monotone" dataKey="muffins" name="Finished Muffins" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
                            </LineChart>
                          ) : (
                            <LineChart data={chartData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f5d4dc" />
                              <XAxis dataKey="day" stroke="#78716c" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#78716c" tick={{ fontSize: 11 }} tickFormatter={e => `${e}%`} />
                              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#fcd0c5', color: '#1e293b' }} />
                              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
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
              )}

              {/* ── MODAL VIEW 2: Reports & Analytics ── */}
              {activeModal === 'reports' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="rounded-2xl bg-white border border-stone-200 shadow-xs overflow-hidden">
                    <header className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-extrabold tracking-wide text-xs uppercase text-stone-800">
                          Operational Financial Summary
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                        Day {history.days.length} Ledger
                      </span>
                    </header>
                    <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        { l: 'NET REVENUE', v: `₹${report.revenue.toLocaleString()}`, desc: 'Total realized sales' },
                        { l: 'TOTAL COST', v: `₹${report.costs.toLocaleString()}`, desc: 'Materials, ops & fees' },
                        { l: 'NET PROFIT', v: `₹${report.profit.toLocaleString()}`, desc: 'Cumulative bottom-line' },
                        { l: 'FILL RATE', v: `${report.fillRate}%`, desc: 'Orders fulfilled on-time' },
                        { l: 'STOCKOUT DAYS', v: `${report.stockoutDays} Days`, desc: 'Zero inventory days' }
                      ].map(e => (
                        <div key={e.l} className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 flex flex-col justify-between min-w-0 transition-all hover:border-stone-300 h-[80px]">
                          <div className="text-[10px] font-bold text-stone-500 tracking-wider truncate uppercase">{e.l}</div>
                          <div className="text-base font-black text-stone-800 truncate font-mono mt-0.5">{e.v}</div>
                          <div className="text-[8.5px] text-stone-400 truncate">{e.desc}</div>
                        </div>
                      ))}
                    </div>

                    {/* Operational Details Sub-card */}
                    <div className="p-4 border-t border-stone-150 bg-stone-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 font-mono">
                      <div>
                        <span>Inventory Turnover: </span>
                        <strong className="text-stone-900 font-bold">{report.inventoryTurnover?.toFixed(2) || '0.00'}x</strong>
                      </div>
                      <div>
                        <span>Lost Sales: </span>
                        <strong className="text-stone-900 font-bold">{report.lostSales?.toLocaleString() || '0'} units</strong>
                      </div>
                      <div>
                        <span>Final Liquid Cash: </span>
                        <strong className="text-emerald-700 font-bold">₹{teamState.cash?.toLocaleString() || '0'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MODAL VIEW 3: Academic Performance Score ── */}
              {activeModal === 'academic' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="rounded-2xl bg-white border border-stone-200 shadow-xs overflow-hidden">
                    <header className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-extrabold tracking-wide text-xs uppercase text-stone-800">
                          Weighted Grading Rubric
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                        Evaluation Weights
                      </span>
                    </header>

                    <div className="p-4 sm:p-6 space-y-4">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Your academic score measures financial performance, customer demand fulfillment, contract execution, inventory control, and production capacity using a weighted evaluation rubric.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
                        {/* 5 Categories Grid */}
                        <div className="md:col-span-8 lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                          {[
                            { l: 'Cash', w: '40%', v: `${academicScore.cashPerformance}%` },
                            { l: 'Fill Rate', w: '20%', v: `${academicScore.fillRateScore}%` },
                            { l: 'Contract', w: '15%', v: `${academicScore.contractScore}%` },
                            { l: 'Inventory', w: '15%', v: `${academicScore.inventoryScore}%` },
                            { l: 'Capacity', w: '10%', v: `${academicScore.capacityScore}%` }
                          ].map(e => (
                            <div key={e.l} className="rounded-xl bg-stone-50 border border-stone-200 p-3 flex flex-col justify-between text-center transition-all hover:bg-stone-100/70 h-[76px]">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-extrabold text-stone-600 uppercase tracking-tight">{e.l}</span>
                                <span className="text-[9px] font-mono font-bold text-stone-400">{e.w}</span>
                              </div>
                              <div className="text-lg font-black text-stone-800 font-mono">{e.v}</div>
                            </div>
                          ))}
                        </div>

                        {/* Final Weighted Grade Box */}
                        <div className="md:col-span-4 lg:col-span-3 rounded-xl bg-gradient-to-br from-indigo-50 via-white to-stone-50 border border-indigo-200 p-4 flex flex-col items-center justify-center text-center shadow-xs">
                          <div className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider mb-1">
                            Weighted Academic Grade
                          </div>
                          <div className="text-3xl font-black text-indigo-600 font-mono tracking-tight my-0.5">
                            {academicScore.totalScore >= 1 ? academicScore.totalScore : `.${Math.round(academicScore.totalScore * 100)}`}
                            <span className="text-xs font-bold text-stone-400 font-sans ml-1">/ 100</span>
                          </div>
                          <div className="text-[9.5px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full mt-1.5">
                            {academicScore.totalScore >= 80 ? 'Distinction' : academicScore.totalScore >= 60 ? 'Satisfactory' : 'Needs Review'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Bottom Status Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 bg-stone-50 text-xs text-stone-500 shrink-0">
              <span className="font-mono text-[10px]">
                {room?.name} ({room?.code}) • Press ESC to close
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(ReportsPanel);
