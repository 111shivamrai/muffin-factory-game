import React, { useState, useEffect, useMemo } from 'react';
import { useGameStore } from './store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import LandingPage from './components/LandingPage.tsx';
import DashboardTopBar from './components/DashboardTopBar.tsx';
import FactoryVisualization from './components/FactoryVisualization.tsx';
import InventoryPanel from './components/InventoryPanel.tsx';
import MachinePanel from './components/MachinePanel.tsx';
import ReportsPanel from './components/ReportsPanel.tsx';
import OperationsAdvisor from './components/OperationsAdvisor.tsx';
import { AlertCircle, Lock, ShieldAlert, Trophy, Download, CheckCircle, X, Award, TrendingUp, Sparkles, AlertTriangle } from 'lucide-react';
import { isTeamSimulationCompleted, getCompletionReason } from './utils/gameLifecycleTracker.js';
import { generateTeamReportPDF } from './utils/reportPdfGenerator.js';

// Route-level code splitting for heavy admin/instructor dashboards and auth views
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard.tsx'));
const InstructorDashboard = React.lazy(() => import('./components/InstructorDashboard.tsx'));
const AdminLoginPage = React.lazy(() => import('./components/AdminLoginPage.tsx'));
const InstructorLoginPage = React.lazy(() => import('./components/InstructorLoginPage.tsx'));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50/50 font-sans">
      <div className="flex flex-col items-center gap-3 text-stone-600 font-mono text-xs">
        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-semibold text-rose-700">Loading portal workspace...</span>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, user, room, teamState, role, logout, leaderboard } = useGameStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      room: state.room,
      teamState: state.teamState,
      role: state.role,
      logout: state.logout,
      leaderboard: state.leaderboard,
    }))
  );
  const [path, setPath] = useState(window.location.pathname);
  const [hasDismissedCompletionModal, setHasDismissedCompletionModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Sync with browser navigation
  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  // Auto-scale UI by adjusting root font-size (REM)
  useEffect(() => {
    const calculateScale = () => {
      // Base design dimensions
      const designWidth = 1366;
      const designHeight = 768;
      
      // Disable artificial scaling for mobile/tablet to allow native responsive CSS to handle layout
      if (window.innerWidth < 1024) {
        document.documentElement.style.fontSize = '16px';
        return;
      }

      const scaleX = window.innerWidth / designWidth;
      const scaleY = window.innerHeight / designHeight;
      
      // Use the smaller scale to ensure it fits both width and height
      const scale = Math.min(scaleX, scaleY);
      
      // Cap scale between 0.6 and 1.5
      const clampedScale = Math.max(0.6, Math.min(scale, 1.5));
      document.documentElement.style.fontSize = `${16 * clampedScale}px`;
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => {
      window.removeEventListener('resize', calculateScale);
      document.documentElement.style.fontSize = '16px'; // reset on unmount
    };
  }, []);

  // Route 1: Admin Panel Dashboard or Login
  if (path === '/saas-admin' || path === '/admin') {
    return (
      <React.Suspense fallback={<RouteLoadingFallback />}>
        {isAuthenticated && user && user.role === 'admin' ? (
          <AdminDashboard navigate={navigate} />
        ) : (
          <AdminLoginPage navigate={navigate} />
        )}
      </React.Suspense>
    );
  }

  // Route 2: Instructor Panel Dashboard or Login
  if (path === '/instructor') {
    return (
      <React.Suspense fallback={<RouteLoadingFallback />}>
        {isAuthenticated && user && (user.role === 'instructor' || user.role === 'admin') ? (
          <InstructorDashboard navigate={navigate} />
        ) : (
          <InstructorLoginPage navigate={navigate} />
        )}
      </React.Suspense>
    );
  }

  // Route 3: Active Simulation Workfloor (only when actively inside a room with team state)
  if (isAuthenticated && user && room && teamState) {
    // Continue to full Operations Dashboard below
  } else {
    // Default Route: Always render the natural Landing Page
    return <LandingPage navigate={navigate} />;
  }

  // Derive game completion state
  const isCompleted = isTeamSimulationCompleted(room, teamState);
  const completionReason = getCompletionReason(room, teamState);

  // Helper to compute letter grade from academic score
  const getLetterGrade = (score?: number) => {
    if (score === undefined || score === null) return '–';
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  // Derive rank from live cohort leaderboard
  const leaderboardRank = useMemo(() => {
    if (!leaderboard || !teamState) return null;
    const entry = leaderboard.find((t) => t.teamId === teamState.id);
    return entry ? entry.rank : null;
  }, [leaderboard, teamState?.id]);

  const handleDownloadPdf = async () => {
    if (!teamState) return;
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      await generateTeamReportPDF(room, teamState, leaderboardRank);
      setPdfSuccessMessage('Report downloaded successfully!');
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 5. Operator is in a running room -> Render full Operations Dashboard spanning full screen width and height
  return (
    <div className="h-screen w-screen overflow-hidden p-3 flex flex-col gap-3 font-sans select-none relative" style={{ fontFamily: 'Nunito, system-ui, sans-serif', background: 'linear-gradient(135deg, #fff1f3 0%, #fde7ef 40%, #fce7f3 100%)' }}>
      
      {/* Top Status Bar HUD */}
      <DashboardTopBar />

      {/* Main Dashboard Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-3 min-h-0 lg:overflow-hidden">
      
        {/* LEFT SIDEBAR: Inventory & Machine Operations Controls */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-full pr-1 min-h-0">
          <InventoryPanel />
          <OperationsAdvisor />
          <MachinePanel />
        </div>

        {/* FACTORY AREA: Factory View & Reports */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          
          {/* Factory Floor Live Feed */}
          <FactoryVisualization />

          {/* Reports, Analytics & Score */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            <ReportsPanel />
          </div>

        </div>

      </div>

      {/* Persistent Non-Intrusive Bankruptcy Banner after dismissing completion modal */}
      {teamState?.status === 'bankrupt' && hasDismissedCompletionModal && (
        <div className="bg-red-700 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md rounded-xl shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Factory Operations Locked: Cash balance is below ₹0. Reports and data remain accessible.</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-800 hover:bg-red-900 px-3 py-1 rounded text-[11px] font-bold border border-red-500 cursor-pointer text-white"
          >
            Return to Logout
          </button>
        </div>
      )}

      {/* Simulator Paused Overlay screen */}
      {room.status === 'paused' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-auto">
          <div className="bg-slate-950 border border-retro-orange-accent/60 p-6 rounded-lg text-center space-y-3 shadow-2xl max-w-sm">
            <Lock className="w-8 h-8 mx-auto text-retro-orange-accent animate-bounce" />
            <h3 className="font-pixel text-xs text-retro-orange-text">SIMULATION PAUSED</h3>
            <p className="text-[10px] text-slate-400 font-mono">
              The instructor has paused the clock. Calculations are suspended until simulation is resumed.
            </p>
          </div>
        </div>
      )}

      {/* Official Post-Game Completion Popup Modal */}
      {isCompleted && !hasDismissedCompletionModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full bg-white border border-rose-200 rounded-3xl shadow-2xl p-6 sm:p-7 relative space-y-5 text-stone-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setHasDismissedCompletionModal(true)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              title="Close modal and review factory"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Trophy Icon & Status */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center shadow-md text-white shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-lg text-stone-900 tracking-tight">SIMULATION COMPLETED</h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    {completionReason === 'MAX_DAYS_REACHED'
                      ? 'Max Days Reached'
                      : completionReason === 'FACTORY_BANKRUPT'
                      ? 'Operations Locked'
                      : 'Simulation Ended'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Cohort: <strong className="text-stone-800">{teamState.name}</strong> • Session: <strong className="text-stone-800">{room.name} ({room.code})</strong>
                </p>
              </div>
            </div>

            {/* Bankruptcy Notice Alert (if bankrupt) */}
            {teamState.status === 'bankrupt' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 font-sans">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Factory Operations Suspended:</strong> Liquid cash balance has fallen below ₹0. Your full operational timeline, decisions, and bottleneck logs have been recorded for academic review.
                </div>
              </div>
            )}

            {/* Key Performance Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-sans">
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Final Cash</div>
                <div className={`text-base font-extrabold mt-0.5 ${teamState.cash >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{teamState.cash.toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Order Fill Rate</div>
                <div className="text-base font-extrabold text-stone-800 mt-0.5">
                  {teamState.report?.fillRate ?? 0}%
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Academic Grade</div>
                <div className="text-base font-extrabold text-purple-700 mt-0.5">
                  {getLetterGrade(teamState.academicScore?.totalScore)} ({teamState.academicScore?.totalScore ?? '–'}/100)
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Cohort Standing</div>
                <div className="text-base font-extrabold text-amber-600 mt-0.5">
                  {leaderboardRank ? `#${leaderboardRank} of ${leaderboard?.length || 1}` : '–'}
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Days Played</div>
                <div className="text-base font-extrabold text-stone-800 mt-0.5">
                  {room.currentDay || teamState.history.days.length} / {room.maxDays || '–'}
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Muffins Produced</div>
                <div className="text-base font-extrabold text-stone-800 mt-0.5">
                  {teamState.history.production?.reduce((a, b) => a + b, 0).toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 active:from-rose-800 active:to-rose-900 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generating PDF Report...' : '📥 Download Report (PDF)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasDismissedCompletionModal(true)}
                  className="px-5 py-3 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Review Factory Floor
                </button>
              </div>

              {pdfSuccessMessage && (
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4" />
                  <span>{pdfSuccessMessage}</span>
                </div>
              )}

              <p className="text-[10px] text-center text-stone-400">
                💡 You can also access and re-download this report anytime from the Reports tab.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


