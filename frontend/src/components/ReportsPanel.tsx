import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function ReportsPanel() {
  const { teamState } = useGameStore();
  const [selectedChart, setSelectedChart] = useState<'cash' | 'demand' | 'inventory' | 'utilization'>('cash');

  if (!teamState) return null;

  const { report, history, academicScore } = teamState;

  // Prepare chart data from history arrays
  const chartData = history.days.map((d, idx) => ({
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

  // Resolve grading color
  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600 border-green-200 bg-green-50/50';
    if (score >= 75) return 'text-purple-600 border-purple-200 bg-purple-50/50';
    if (score >= 50) return 'text-orange-600 border-orange-200 bg-orange-50/50';
    return 'text-pink-600 border-pink-200 bg-pink-50/50';
  };

  function ReportCard({ icon, title, value, colorClass = 'text-slate-800' }: any) {
    return (
      <div className="border border-slate-150 rounded-xl p-2.5 bg-slate-50 text-center flex flex-col justify-between h-full">
        <div className="flex items-center justify-center space-x-1">
          {icon}
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        </div>
        <div className={`font-bold text-sm mt-1 ${colorClass}`}>{value}</div>
      </div>
    );
  }

  function AcademicReportCard({ title, value }: any) {
    return (
      <div className="border border-[#ffd5c6] rounded-xl p-2 bg-white text-center flex flex-col justify-between h-full shadow-sm">
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{title}</div>
        <div className="flex items-center justify-center space-x-1.5 mt-1.5">
          <span className="text-sm">🧁</span>
          <span className="font-bold text-slate-800 text-xs">{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      
      {/* Reports & Analytics Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-pink-600" />
          <h2 className="font-bold text-pink-600 font-pixel text-[10px] tracking-wider uppercase">
            Reports & Analytics
          </h2>
        </div>

        {/* Financial Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3">
          <ReportCard 
            icon={<span className="text-pink-500">📈</span>}
            title="NET REVENUE" 
            value={`₹${report.revenue.toLocaleString()}`} 
          />
          <ReportCard 
            icon={<span className="text-amber-500">🪙</span>}
            title="TOTAL COST" 
            value={`₹${report.costs.toLocaleString()}`} 
          />
          <ReportCard 
            icon={<span className="text-green-500">💰</span>}
            title="NET PROFIT" 
            value={`₹${report.profit.toLocaleString()}`} 
            colorClass={report.profit >= 0 ? 'text-green-600' : 'text-pink-600'}
          />
          <ReportCard 
            icon={<span className="text-blue-500">📊</span>}
            title="FILL RATE" 
            value={`${report.fillRate}%`} 
          />
          <ReportCard 
            icon={<span className="text-red-400">📅</span>}
            title="STOCKOUT DAYS" 
            value={`${report.stockoutDays} Days`} 
            colorClass={report.stockoutDays > 3 ? 'text-pink-600 animate-pulse' : 'text-slate-800'}
          />
        </div>

        {/* Chart Selector and Recharts Container */}
        <div className="px-3 pb-3 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-1.5">
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
                  className={`px-3 py-1.5 text-[8px] font-pixel border rounded-xl transition-all cursor-pointer ${
                    selectedChart === tab.id
                      ? 'bg-pink-500 border-pink-600 text-white shadow-sm'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">SIMULATION PROGRESS: DAY {history.days.length}</span>
          </div>

          <div className="h-48 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono italic border border-dashed border-slate-200 rounded-xl">
                Awaiting daily simulation ticks to populate metrics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {selectedChart === 'cash' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="cash" name="Liquid Cash" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#a855f7" strokeWidth={1.5} />
                  </LineChart>
                ) : selectedChart === 'demand' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="demand" name="Market Demand" stroke="#f97316" strokeWidth={2} />
                    <Line type="monotone" dataKey="revenue" name="Sales Proxy" stroke="#3b82f6" strokeWidth={1.5} />
                  </LineChart>
                ) : selectedChart === 'inventory' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="baseMix" name="Mix Ingredients" stroke="#10b981" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="packaging" name="Packaging Packs" stroke="#3b82f6" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="muffins" name="Finished Muffins" stroke="#ec4899" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="mixing" name="Mixing Station" stroke="#a855f7" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="baking" name="Baking Oven" stroke="#f97316" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="icing" name="Icing Station" stroke="#10b981" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="packagingUtil" name="Packaging Station" stroke="#3b82f6" strokeWidth={1.5} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Academic Score Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center space-x-2 text-green-700">
          <span className="text-lg">🧁</span>
          <h4 className="font-pixel text-[9px] uppercase tracking-wider font-bold">Academic Performance Score</h4>
        </div>
        
        <p className="text-[9px] text-slate-400 font-sans leading-relaxed">
          Indicators evaluate operational analysis based on a weighted academic rubric. This score strengthens leaderboard cash balance.
        </p>

        <div className="grid grid-cols-7 gap-2 items-stretch">
          <AcademicReportCard title="Cash (40%)" value={`${academicScore.cashPerformance}%`} />
          <AcademicReportCard title="Fill Rate (20%)" value={`${academicScore.fillRateScore}%`} />
          <AcademicReportCard title="Contract (15%)" value={`${academicScore.contractScore}%`} />
          <AcademicReportCard title="Inventory (15%)" value={`${academicScore.inventoryScore}%`} />
          <AcademicReportCard title="Capacity (10%)" value={`${academicScore.capacityScore}%`} />

          {/* Score display block styled exactly like the user's mockup */}
          <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-2.5 flex items-center justify-between h-full col-span-2 shadow-sm">
            <div className="text-left space-y-0.5">
              <div className="text-[8px] uppercase tracking-wider font-bold text-slate-400">WEIGHTED ACADEMIC GRADE</div>
              <div className="text-[10px] font-bold text-pink-600">SCORE :</div>
              <div className="text-lg font-bold text-pink-600 tracking-wider">
                {academicScore.totalScore >= 1 ? academicScore.totalScore : `.${Math.round(academicScore.totalScore * 100)}`} / 100
              </div>
            </div>
            <div className="text-4xl filter drop-shadow">🧁</div>
          </div>
        </div>
      </div>

    </div>
  );
}
