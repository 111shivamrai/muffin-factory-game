import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore.js';
import LandingPage from './components/LandingPage.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import InstructorDashboard from './components/InstructorDashboard.tsx';
import AdminLoginPage from './components/AdminLoginPage.tsx';
import InstructorLoginPage from './components/InstructorLoginPage.tsx';
import DashboardTopBar from './components/DashboardTopBar.tsx';
import FactoryVisualization from './components/FactoryVisualization.tsx';
import InventoryPanel from './components/InventoryPanel.tsx';
import MachinePanel from './components/MachinePanel.tsx';
import ReportsPanel from './components/ReportsPanel.tsx';
import OperationsAdvisor from './components/OperationsAdvisor.tsx';
import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';

export default function App() {
  const { isAuthenticated, user, room, teamState, role, logout } = useGameStore();
  const [path, setPath] = useState(window.location.pathname);

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
  if (path === '/saas-admin') {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        return <AdminDashboard />;
      } else {
        return (
          <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center p-4">
            <div className="bg-white border border-[#e8e8e3] rounded-[24px] max-w-md w-full p-8 shadow-xl text-center space-y-6">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-[#c8852a] border border-[#ebdcc0]">
                <ShieldAlert size={28} />
              </div>
              <h2 className="font-serif font-bold text-2xl text-[#1a1a18]">Console Collision</h2>
              <p className="text-xs text-[#7a7a72] leading-relaxed">
                You are currently logged in as a <strong>{user.role}</strong> ({user.email}). 
                To access the Admin Console, please log out first.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-transparent hover:bg-slate-50 text-[#7a7a72] border border-[#d8d8d0] font-sans font-bold text-xs py-3 rounded-full cursor-pointer transition-all"
                >
                  Back to Lobby
                </button>
                <button
                  onClick={() => logout()}
                  className="flex-1 bg-[#c8852a] hover:bg-[#b06818] text-white font-sans font-bold text-xs py-3 rounded-full cursor-pointer transition-all"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        );
      }
    }
    return <AdminLoginPage navigate={navigate} />;
  }

  // Route 2: Instructor Panel Dashboard or Login
  if (path === '/instructor') {
    if (isAuthenticated && user) {
      if (user.role === 'instructor') {
        return <InstructorDashboard />;
      } else {
        return (
          <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center p-4">
            <div className="bg-white border border-[#e8e8e3] rounded-[24px] max-w-md w-full p-8 shadow-xl text-center space-y-6">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-[#c8852a] border border-[#ebdcc0]">
                <ShieldAlert size={28} />
              </div>
              <h2 className="font-serif font-bold text-2xl text-[#1a1a18]">Console Collision</h2>
              <p className="text-xs text-[#7a7a72] leading-relaxed">
                You are currently logged in as a <strong>{user.role}</strong> ({user.email}). 
                To access the Instructor Console, please log out first.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-transparent hover:bg-slate-50 text-[#7a7a72] border border-[#d8d8d0] font-sans font-bold text-xs py-3 rounded-full cursor-pointer transition-all"
                >
                  Back to Lobby
                </button>
                <button
                  onClick={() => logout()}
                  className="flex-1 bg-[#c8852a] hover:bg-[#b06818] text-white font-sans font-bold text-xs py-3 rounded-full cursor-pointer transition-all"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        );
      }
    }
    return <InstructorLoginPage navigate={navigate} />;
  }

  // Route 3: Standard Lobby & Simulation
  if (!isAuthenticated || !user) {
    return <LandingPage navigate={navigate} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user.role === 'instructor') {
    return <InstructorDashboard />;
  }

  if (user.role === 'operator' && (!room || !teamState)) {
    return <LandingPage navigate={navigate} />;
  }

  if (!room) {
    return <LandingPage navigate={navigate} />;
  }

  // 5. Operator is in a running room -> Render full Operations Dashboard with Aspect Ratio Scale Wrapper
  return (
    <ScaleWrapper>
      <div className="w-full h-full p-3 flex flex-col gap-3 font-sans select-none relative" style={{ fontFamily: 'Nunito, system-ui, sans-serif', background: 'linear-gradient(135deg, #fff1f3 0%, #fde7ef 40%, #fce7f3 100%)' }}>
        
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

        {/* Bankruptcy Overlay Screen */}
        {teamState?.status === 'bankrupt' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
            <div className="max-w-md w-full bg-red-950 border-2 border-red-500 rounded-lg p-8 text-center space-y-6 shadow-2xl animate-pulse">
              <div className="text-6xl">💀</div>
              <h2 className="font-pixel text-lg text-red-400 tracking-wider">FACTORY BANKRUPT</h2>
              <p className="text-xs text-red-200 leading-relaxed font-mono">
                Cash balance has dropped below ₹0. Operations are locked.
                You have been disqualified from the active simulation competition.
              </p>
              <div className="p-3 bg-red-900 border border-red-700 text-[10px] text-red-300 rounded font-mono">
                Instructor review parameters are preserved. Reports remain active.
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-red-800 hover:bg-red-700 text-red-100 border border-red-500 px-6 py-2.5 rounded font-pixel text-[10px] cursor-pointer"
                >
                  RETURN TO LOGOUT
                </button>
              </div>
            </div>
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

        {/* Simulator Finished Overlay screen */}
        {room.status === 'finished' && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-40 pointer-events-auto">
            <div className="bg-slate-950 border border-retro-purple-accent/60 p-8 rounded-lg text-center space-y-4 shadow-2xl max-w-md">
              <span className="text-5xl">🏆</span>
              <h3 className="font-pixel text-xs text-retro-purple-text">SIMULATION COMPLETE</h3>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                The simulation has ended. Analyze your final academic scores and checkout the leaderboard rankings.
              </p>
              <div className="border border-slate-800 bg-slate-900/50 p-4 rounded text-left space-y-1 font-mono text-[10px]">
                <div className="text-slate-500 text-[8px]">FINAL METRICS:</div>
                <div>Final Cash: <strong className="text-retro-green-text">₹{teamState?.cash.toLocaleString()}</strong></div>
                <div>Fill Rate: <strong>{teamState?.report.fillRate}%</strong></div>
                <div>Academic Grade: <strong className="text-retro-purple-text">{teamState?.academicScore.totalScore}/100</strong></div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-retro-purple-bg hover:bg-purple-900 text-retro-purple-text border border-retro-purple-accent px-5 py-2 rounded font-pixel text-[9px] cursor-pointer"
              >
                CLOSE REPORT
              </button>
            </div>
          </div>
        )}

      </div>
    </ScaleWrapper>
  );
}

// ─── Scale Wrapper Viewport Manager Component ─────────────────────────────────
function ScaleWrapper({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const targetWidth = 1440;
      const targetHeight = 960;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calculate scale factors
      const scaleX = windowWidth / targetWidth;
      const scaleY = windowHeight / targetHeight;
      
      // Preserve aspect ratio by using the minimum scale factor (letterboxing / pillarboxing)
      const s = Math.min(scaleX, scaleY);
      setScale(s);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-black relative select-none">
      <div 
        style={{
          width: '1440px',
          height: '960px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
}
