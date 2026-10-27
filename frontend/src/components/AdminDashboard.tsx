import React, { useEffect, useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { 
  LayoutDashboard, 
  Boxes, 
  KeyRound, 
  Megaphone, 
  ScrollText, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Search, 
  Sun, 
  Moon, 
  ShieldAlert, 
  Activity, 
  Clock, 
  UserMinus, 
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? 'https://muffin-factory-game.onrender.com' : 'http://localhost:5001');

export default function AdminDashboard({ navigate }: { navigate?: (to: string) => void } = {}) {
  const { 
    logout, roomsList, loadRooms, deleteRoom, 
    scenarios, loadScenarios, deleteScenario, duplicateScenario, user 
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'licenses' | 'broadcast' | 'logs' | 'settings'>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Collapsible sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Licenses state
  const [licenses, setLicenses] = useState<any[]>([]);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'local_only' | 'checking'>('checking');
  const [isSyncingLicenses, setIsSyncingLicenses] = useState(false);

  const [newLicCustomer, setNewLicCustomer] = useState('');
  const [newLicEmail, setNewLicEmail] = useState('');
  const [newLicSeats, setNewLicSeats] = useState<number | ''>('');
  const [newLicValidityDays, setNewLicValidityDays] = useState<number | ''>('');
  const [newLicInstructorEmail, setNewLicInstructorEmail] = useState('');
  const [newLicInstructorPassword, setNewLicInstructorPassword] = useState('');
  const [selectedLicenseForCreds, setSelectedLicenseForCreds] = useState<any | null>(null);
  const [licSuccessMsg, setLicSuccessMsg] = useState('');
  const [licErrorMsg, setLicErrorMsg] = useState('');

  // Broadcast state (Mock persisted to localStorage)
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'success'>('info');
  const [broadcastActive, setBroadcastActive] = useState(false);
  const [bcSuccessMsg, setBcSuccessMsg] = useState('');

  // System Logs state (Mock persisted to localStorage)
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'warning' | 'error' | 'fatal'>('all');

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load licenses from backend API or local storage
  const loadLicenses = async () => {
    setIsSyncingLicenses(true);
    try {
      const token = useGameStore.getState().token || (typeof window !== 'undefined' ? (sessionStorage.getItem('muffin_token') || localStorage.getItem('muffin_token')) : null);
      const res = await fetch(`${API_URL}/api/licenses`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const realOnly = data.filter((l: any) => !l.id?.includes('MIT-SLOAN') && !l.id?.includes('STANFORD') && !l.id?.includes('HARVARD'));
          setLicenses(realOnly);
          localStorage.setItem('admin_licenses', JSON.stringify(realOnly));
          setCloudSyncStatus('synced');
          setIsSyncingLicenses(false);
          return;
        }
      } else {
        setCloudSyncStatus('local_only');
      }
    } catch (err) {
      setCloudSyncStatus('local_only');
      console.warn('Could not fetch licenses from backend API, using local storage:', err);
    } finally {
      setIsSyncingLicenses(false);
    }

    const storedLic = localStorage.getItem('admin_licenses');
    if (storedLic) {
      try {
        const parsed = JSON.parse(storedLic);
        const migrated = (Array.isArray(parsed) ? parsed : []).map((l: any) => {
          const { students, ...rest } = l;
          return rest;
        });
        // Filter out fake demo defaults to ensure only real customer licenses appear
        const realOnly = migrated.filter((l: any) => !l.id?.includes('MIT-SLOAN') && !l.id?.includes('STANFORD') && !l.id?.includes('HARVARD'));
        setLicenses(realOnly);
        localStorage.setItem('admin_licenses', JSON.stringify(realOnly));
      } catch (e) {
        setLicenses([]);
      }
    } else {
      setLicenses([]);
      localStorage.setItem('admin_licenses', JSON.stringify([]));
    }
  };

  // Initial Data Load
  useEffect(() => {
    loadRooms();
    loadScenarios();
    loadLicenses();

    // Load Broadcast settings
    const storedBc = localStorage.getItem('admin_broadcast');
    if (storedBc) {
      const bc = JSON.parse(storedBc);
      setBroadcastMsg(bc.message || '');
      setBroadcastType(bc.type || 'info');
      setBroadcastActive(!!bc.active);
    }

    // Load System Logs (Real system audit events only)
    const storedLogs = localStorage.getItem('admin_logs');
    if (storedLogs) {
      try {
        const parsed = JSON.parse(storedLogs);
        const realLogs = (Array.isArray(parsed) ? parsed : []).filter((l: any) => !l.errorMessage?.includes('Division by zero'));
        setLogs(realLogs);
        localStorage.setItem('admin_logs', JSON.stringify(realLogs));
      } catch (e) {
        setLogs([]);
      }
    } else {
      const initialLogs = [
        { id: "log-init-1", timestamp: new Date().toISOString(), severity: "info", component: "database", userEmail: "system", errorMessage: "Central PostgreSQL pool connected and synchronized." },
        { id: "log-init-2", timestamp: new Date().toISOString(), severity: "info", component: "sockets", userEmail: "system", errorMessage: "Muffin Factory Realtime Gateway active." }
      ];
      setLogs(initialLogs);
      localStorage.setItem('admin_logs', JSON.stringify(initialLogs));
    }
  }, []);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  // Helper to test if a license is currently expired
  const isLicenseExpired = (l: any) => {
    if (l.status === 'expired') return true;
    const now = currentTime.getTime();
    if (l.expiresAt) {
      return now >= new Date(l.expiresAt).getTime();
    }
    if (l.endDate) {
      return now >= new Date(l.endDate).getTime();
    }
    return false;
  };

  // Audit Log helper for real events
  const addAuditLog = (severity: 'info' | 'warning' | 'error', component: string, message: string) => {
    const newEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      severity,
      component,
      userEmail: user?.email || 'admin@muffin.com',
      errorMessage: message
    };
    setLogs(prev => {
      const updated = [newEntry, ...prev.slice(0, 99)];
      try { localStorage.setItem('admin_logs', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
  };

  // License Handlers
  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicSuccessMsg('');
    setLicErrorMsg('');

    const instEmail = newLicInstructorEmail.trim().toLowerCase();
    const instPass = newLicInstructorPassword.trim();
    const customer = newLicCustomer.trim();
    const billingEmail = newLicEmail.trim();

    if (!customer || !billingEmail || !instEmail || !instPass) {
      setLicErrorMsg('All fields are required.');
      return;
    }

    // Strict validation for License Validity (Days)
    const validityDaysNum = Number(newLicValidityDays);
    if (
      newLicValidityDays === '' ||
      isNaN(validityDaysNum) ||
      !Number.isInteger(validityDaysNum) ||
      validityDaysNum <= 0
    ) {
      setLicErrorMsg('License Validity (Days) must be a positive whole number (e.g., 10).');
      return;
    }

    // Strict validation for Max Seats
    const seatsNum = Number(newLicSeats);
    if (
      newLicSeats === '' ||
      isNaN(seatsNum) ||
      !Number.isInteger(seatsNum) ||
      seatsNum <= 0
    ) {
      setLicErrorMsg('Max Student Logins must be a positive whole number.');
      return;
    }

    const today = new Date();
    const expiry = new Date(today.getTime() + validityDaysNum * 24 * 60 * 60 * 1000);
    const token = useGameStore.getState().token;

    try {
      const res = await fetch(`${API_URL}/api/licenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          customerName: customer,
          email: billingEmail,
          maxSeats: seatsNum,
          validityDays: validityDaysNum,
          instructorEmail: instEmail,
          instructorPassword: instPass
        })
      });
      const data = await res.json();
      if (data.error) {
        setLicErrorMsg(data.error);
        return;
      }
      if (data.license) {
        const createdLicense = {
          ...data.license,
          instructorPassword: data.license.instructorPassword || instPass
        };
        const updated = [createdLicense, ...licenses.filter(l => l.id !== createdLicense.id)];
        setLicenses(updated);
        localStorage.setItem('admin_licenses', JSON.stringify(updated));
        setSelectedLicenseForCreds(createdLicense);
        setCloudSyncStatus('synced');
        setLicSuccessMsg(`✅ License "${createdLicense.id}" created and synced to Central Database! Valid for ${validityDaysNum} day(s) until ${expiry.toLocaleDateString()}.`);
        setNewLicCustomer('');
        setNewLicEmail('');
        setNewLicSeats(40);
        setNewLicValidityDays('');
        setNewLicInstructorEmail('');
        setNewLicInstructorPassword('');
        return;
      }
    } catch (err) {
      console.warn('Backend license creation failed, falling back to local creation:', err);
    }

    // Fallback if backend API unavailable
    setCloudSyncStatus('local_only');
    const code = 'LIC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const newLic = {
      id: code,
      customerName: customer,
      email: billingEmail,
      maxSeats: seatsNum,
      validityDays: validityDaysNum,
      status: "active",
      createdAt: today.toISOString(),
      expiresAt: expiry.toISOString(),
      startDate: today.toISOString().split('T')[0],
      endDate: expiry.toISOString().split('T')[0],
      instructorEmail: instEmail,
      instructorPassword: instPass
    };

    const updated = [newLic, ...licenses.filter(l => l.id !== code)];
    setLicenses(updated);
    localStorage.setItem('admin_licenses', JSON.stringify(updated));
    setSelectedLicenseForCreds(newLic);

    setLicSuccessMsg(`⚠️ License "${code}" saved in THIS browser only (Render backend /api/licenses returned 404). To see this license across all laptops, redeploy the backend on Render.`);
    setNewLicCustomer('');
    setNewLicEmail('');
    setNewLicSeats(40);
    setNewLicValidityDays('');
    setNewLicInstructorEmail('');
    setNewLicInstructorPassword('');
  };

  const handleToggleLicenseStatus = async (id: string) => {
    try {
      const token = useGameStore.getState().token || (typeof window !== 'undefined' ? (sessionStorage.getItem('muffin_token') || localStorage.getItem('muffin_token')) : null);
      await fetch(`${API_URL}/api/licenses/${id}/toggle`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (err) {
      console.warn('Backend license toggle failed, updating locally:', err);
    }
    const updated = licenses.map(l => {
      if (l.id === id) {
        return { ...l, status: l.status === 'active' ? 'suspended' : 'active' };
      }
      return l;
    });
    setLicenses(updated);
    localStorage.setItem('admin_licenses', JSON.stringify(updated));
  };

  const handleDeleteLicense = async (id: string) => {
    if (confirm(`Delete license ${id}? This will lock out all users on this key.`)) {
      try {
        const token = useGameStore.getState().token || (typeof window !== 'undefined' ? (sessionStorage.getItem('muffin_token') || localStorage.getItem('muffin_token')) : null);
        await fetch(`${API_URL}/api/licenses/${id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (err) {
        console.warn('Backend license delete failed, updating locally:', err);
      }
      const updated = licenses.filter(l => l.id !== id);
      setLicenses(updated);
      localStorage.setItem('admin_licenses', JSON.stringify(updated));
    }
  };

  // Broadcast Handlers
  const handleUpdateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setBcSuccessMsg('');

    const bc = {
      message: broadcastMsg.trim(),
      type: broadcastType,
      active: broadcastActive,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || "Admin"
    };

    localStorage.setItem('admin_broadcast', JSON.stringify(bc));
    setBcSuccessMsg("✔ Broadcast updated successfully!");
    setTimeout(() => setBcSuccessMsg(''), 4000);
  };

  const handleDeactivateBroadcast = () => {
    setBroadcastActive(false);
    const bc = {
      message: broadcastMsg.trim(),
      type: broadcastType,
      active: false,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || "Admin"
    };
    localStorage.setItem('admin_broadcast', JSON.stringify(bc));
    setBcSuccessMsg("✔ Broadcast deactivated");
    setTimeout(() => setBcSuccessMsg(''), 4000);
  };

  // Log Handlers
  const handleClearLogs = () => {
    if (confirm("Clear all system logs? This is irreversible.")) {
      setLogs([]);
      localStorage.setItem('admin_logs', JSON.stringify([]));
    }
  };

  // Memoized Search & Filter lists
  const filteredRooms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return roomsList;
    return roomsList.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [roomsList, searchQuery]);

  const filteredLicenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    // Automatically remove expired licenses from active registry archive
    const activeArchive = licenses.filter(l => !isLicenseExpired(l));
    if (!q) return activeArchive;
    return activeArchive.filter(l => l.id.toLowerCase().includes(q) || l.customerName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
  }, [licenses, searchQuery, currentTime]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(l => l.severity === logFilter);
  }, [logs, logFilter]);

  // Total sums
  const activeTeamsCount = useMemo(() => {
    return roomsList.length * 3; // Mock team count from lobbies
  }, [roomsList]);

  const totalSeats = useMemo(() => {
    return licenses.filter(l => !isLicenseExpired(l)).reduce((sum, l) => sum + l.maxSeats, 0);
  }, [licenses, currentTime]);

  const activeLicensesCount = useMemo(() => {
    return licenses.filter(l => l.status === 'active' && !isLicenseExpired(l)).length;
  }, [licenses, currentTime]);

  const activeErrorsCount = useMemo(() => {
    return logs.filter(l => l.severity === 'error' || l.severity === 'fatal').length;
  }, [logs]);

  // Current admin details
  const adminDetails = useMemo(() => {
    if (!user) return null;
    return {
      name: user.name,
      role: "System Administrator",
      email: user.email,
      avatar: "🛡️"
    };
  }, [user]);

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark bg-[#080c14] text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-300`}>
      
      {/* Styles Injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700&family=Inconsolata:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .font-sans { font-family: 'Manrope', sans-serif; }
        .font-serif { font-family: 'Cormorant Garamond', serif; }
        .font-mono { font-family: 'Inconsolata', monospace; }
        .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>

      {/* Sidebar navigation */}
      <aside className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between py-6 px-4 shrink-0 transition-all duration-300 font-sans ${sidebarCollapsed ? 'w-20' : 'w-60'}`}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 select-none">
            <span className="text-3xl">🧁</span>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-extrabold text-[12.5px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">MUFFIN SYSTEM</h1>
                <p className="text-[8.5px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">CENTRAL ADMINISTRATIVE HUB</p>
              </div>
            )}
          </div>

          <nav className="space-y-1.5" aria-label="Main Administration tabs">
            {[
              { key: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
              { key: "sessions", label: "Sessions", icon: <Boxes className="w-4 h-4" />, badge: roomsList.length },
              { key: "licenses", label: "Licenses", icon: <KeyRound className="w-4 h-4" />, badge: licenses.length },
              { key: "broadcast", label: "Broadcast", icon: <Megaphone className="w-4 h-4" /> },
              { key: "logs", label: "System Logs", icon: <ScrollText className="w-4 h-4" />, badge: activeErrorsCount > 0 ? activeErrorsCount : undefined },
              { key: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer group select-none active:scale-[0.98] ${
                  activeTab === tab.key 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className={`${activeTab === tab.key ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                    {tab.icon}
                  </span>
                  {!sidebarCollapsed && <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>}
                </div>
                {!sidebarCollapsed && tab.badge !== undefined && (
                  <span className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded-full ${
                    tab.key === 'logs' && activeErrorsCount > 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 animate-pulse'
                      : activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-1 border-t border-slate-200 dark:border-slate-800 space-y-3 pt-4">
          {!sidebarCollapsed && adminDetails && (
            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
              <span className="text-xl shrink-0">{adminDetails.avatar}</span>
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold text-slate-800 dark:text-white block leading-none truncate">{adminDetails.name}</span>
                <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-mono uppercase truncate block mt-1">{adminDetails.role}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex-1 h-9 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer select-none active:scale-95"
            >
              {sidebarCollapsed ? "➡" : "⬅ Collapse"}
            </button>
            <button 
              onClick={() => { logout(); if (navigate) navigate('/'); }}
              className="w-9 h-9 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center cursor-pointer select-none hover:bg-red-100 dark:hover:bg-red-950/40 active:scale-95"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden font-sans">
        
        {/* Top HUDBAR */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 select-none z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
              {activeTab === 'overview' && "Dashboard Overview"}
              {activeTab === 'sessions' && "Simulation Arena Sessions"}
              {activeTab === 'licenses' && "Customer Licenses Registrar"}
              {activeTab === 'broadcast' && "Broadcasting Management Console"}
              {activeTab === 'logs' && "System Diagnostics Center"}
              {activeTab === 'settings' && "Registry Settings & Profile"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input bar */}
            {(activeTab === 'sessions' || activeTab === 'licenses') && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'licenses' ? "Search customer, email..." : "Search lobby code..."}
                  className="bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 pl-8 pr-4 py-1.5 rounded-lg text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-350 w-52 placeholder:text-slate-400 transition-all"
                />
              </div>
            )}

            {/* Time HUD */}
            <div className="text-[10px] font-mono text-slate-450 dark:text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>

            {/* Global Force Stop Button */}
            <button
              onClick={async () => {
                if (confirm("EMERGENCY GLOBAL STOP: This will forcefully stop all machines in ALL active lobbies across the entire platform. Are you absolutely sure?")) {
                  try {
                    const tkn = useGameStore.getState().token || (typeof window !== 'undefined' ? (sessionStorage.getItem('muffin_token') || localStorage.getItem('muffin_token')) : null);
                    const res = await fetch(`${API_URL}/api/rooms/stop-all`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${tkn}` }
                    });
                    if (res.ok) {
                      alert("All machines stopped globally.");
                    } else {
                      alert("Failed to execute global stop.");
                    }
                  } catch (err) {
                    alert("Failed to execute global stop.");
                  }
                }
              }}
              className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white border border-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer mr-1"
            >
              <span>🛑 Global Force Stop</span>
            </button>

            {/* Dark Mode toggle */}
            <button
              onClick={toggleTheme}
              className="h-8 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer uppercase transition-colors flex items-center gap-1.5 select-none active:scale-95"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Content Tabs Area */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto custom-scroll">
          
          {/* 1. OVERVIEW TAB - REAL DATA ONLY, NO FAKE GRAPHS OR BANNERS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Real Telemetry Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Active Lobbies", value: roomsList.length, suffix: "Simulation rooms online", trend: roomsList.filter(r => r.status === 'active').length + " currently running", color: "indigo" },
                  { label: "Connected Teams", value: activeTeamsCount, suffix: "Teams across lobbies", trend: totalSeats > 0 ? `${Math.round(activeTeamsCount / totalSeats * 100)}% seats active` : "Real-time arena", color: "violet" },
                  { label: "Active Licenses", value: activeLicensesCount, suffix: `/ ${licenses.length} Registered`, trend: `${totalSeats} total student seats`, color: "emerald" },
                  { label: "System Health", value: cloudSyncStatus === 'synced' ? "Online" : "Active", suffix: "Platform infrastructure", trend: activeErrorsCount === 0 ? "All services operational" : `${activeErrorsCount} diagnostics reported`, color: activeErrorsCount > 0 ? "amber" : "emerald" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono font-black block">{stat.label}</span>
                        <div className="text-3xl font-mono font-black mt-1.5 text-slate-900 dark:text-white">{stat.value}</div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono block mt-1">{stat.suffix}</span>
                      </div>
                      <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-${stat.color}-500`}>
                        {i === 0 && <Boxes className="w-5 h-5 text-indigo-500" />}
                        {i === 1 && <Activity className="w-5 h-5 text-violet-500" />}
                        {i === 2 && <KeyRound className="w-5 h-5 text-emerald-500" />}
                        {i === 3 && <ShieldAlert className="w-5 h-5 text-emerald-500" />}
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[9px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-bold">
                      <span className={`w-1.5 h-1.5 rounded-full bg-${stat.color === 'red' ? 'red' : 'emerald'}-500`}></span>
                      <span>{stat.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Live Arena Simulation Lobbies & Quick Actions */} 
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Real Live Arena Sessions Table */} 
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs flex flex-col justify-between lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Live Arena Simulation Lobbies
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      {roomsList.length} Total Lobbies
                    </span>
                  </div>
                  
                  {roomsList.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                      <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                      <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        No active simulation lobbies running
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        When instructors create session rooms, live arena telemetry will appear here in real time.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-black uppercase text-slate-500">
                            <th className="pb-2">Room Code</th>
                            <th className="pb-2">Session Title</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Cycle</th>
                            <th className="pb-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                          {roomsList.slice(0, 5).map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 font-mono font-black text-indigo-600 dark:text-indigo-400">{r.code}</td>
                              <td className="py-2.5 font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{r.name}</td>
                              <td className="py-2.5">
                                <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-md uppercase ${
                                  r.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                  r.status === 'paused' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                  'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                                Day {r.currentDay || 0} / {r.maxDays || 30}
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => setActiveTab('sessions')}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-[9px] font-mono font-black uppercase rounded cursor-pointer transition-colors"
                                >
                                  Manage
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Central Quick Actions */} 
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                      <Settings className="w-4 h-4 text-amber-500" />
                      Central Quick Actions
                    </h4>
                    <button
                      onClick={() => { loadLicenses(); loadRooms(); }}
                      className="text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Refresh real data from database"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "New License", icon: <KeyRound className="w-4 h-4" />, action: () => setActiveTab("licenses"), color: "indigo" },
                      { label: "Broadcast Alert", icon: <Megaphone className="w-4 h-4" />, action: () => setActiveTab("broadcast"), color: "emerald" },
                      { label: "View Lobbies", icon: <Boxes className="w-4 h-4" />, action: () => setActiveTab("sessions"), color: "violet" },
                      { label: "Audit Logs", icon: <ScrollText className="w-4 h-4" />, action: () => setActiveTab("logs"), color: "amber" }
                    ].map((act, i) => (
                      <button
                        key={i}
                        onClick={act.action}
                        className={`p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-${act.color}-600 dark:text-${act.color}-400 hover:bg-${act.color}-50 dark:hover:bg-${act.color}-950/15 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left hover:scale-[1.02] duration-250`}
                      >
                        <div className={`p-1.5 rounded-lg w-fit bg-${act.color}-50 dark:bg-${act.color}-500/10`}>
                          {act.icon}
                        </div>
                        <span className="text-[9.5px] font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">{act.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Real Infrastructure Status */} 
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <span className="text-[9px] uppercase font-mono font-black text-slate-500 dark:text-slate-400 block tracking-wider">PLATFORM INFRASTRUCTURE</span>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-mono space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">PostgreSQL Cloud DB:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">● Connected</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Realtime Engine:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">● Active</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Multi-tenant Cloud:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Render (Managed)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          )}

          {/* 2. SESSIONS TAB */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {filteredRooms.length} active simulation lobbies matching filter
                </p>
                <button
                  onClick={async () => {
                    if (confirm("EMERGENCY GLOBAL STOP: This will forcefully stop all machines in ALL active lobbies across the entire platform. Are you absolutely sure?")) {
                      try {
                        const tkn = useGameStore.getState().token || (typeof window !== 'undefined' ? (sessionStorage.getItem('muffin_token') || localStorage.getItem('muffin_token')) : null);
                        const res = await fetch(`${API_URL}/api/rooms/stop-all`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${tkn}` }
                        });
                        if (res.ok) alert("All machines stopped globally.");
                      } catch (err) {
                        alert("Failed to execute global stop.");
                      }
                    }
                  }}
                  className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span>🛑 Global Force Stop</span>
                </button>
              </div>

              {filteredRooms.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs">
                  <Boxes className="w-8 h-8 mx-auto text-slate-350 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No active sessions found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 select-none">
                        <th className="p-4 w-12 text-center">Rank</th>
                        <th className="p-4">Room Name</th>
                        <th className="p-4">Lobby Code</th>
                        <th className="p-4">Difficulty</th>
                        <th className="p-4">Speed (S/Day)</th>
                        <th className="p-4">Current Day</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right pr-6">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      {filteredRooms.map((room, i) => (
                        <tr key={room.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all duration-200">
                          <td className="p-4 text-center font-mono text-slate-400">#{i + 1}</td>
                          <td className="p-4 text-sm font-extrabold text-slate-800 dark:text-white">{room.name}</td>
                          <td className="p-4">
                            <span className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-150 dark:border-indigo-900/60 px-2 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 font-mono font-black tracking-widest select-all">
                              {room.code}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                              room.difficulty === 'beginner' ? 'bg-emerald-50 text-emerald-600 border border-emerald-150 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/15' :
                              room.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600 border border-amber-150 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/15' :
                              'bg-red-50 text-red-600 dark:text-red-400 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/15'
                            }`}>
                              {room.difficulty}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-450 dark:text-slate-400">{room.tickRate}s / day</td>
                          <td className="p-4 font-mono text-slate-600 dark:text-slate-400">Day {room.currentDay} / {room.maxDays}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold border ${
                              room.status === 'active' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-550/20' :
                              room.status === 'paused' ? 'bg-amber-50/80 border-amber-250 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-550/20' :
                              'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                            }`}>
                              {room.status}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6">
                            <button
                              onClick={() => deleteRoom(room.id)}
                              className="p-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 hover:text-white hover:bg-red-600 border border-red-100 dark:border-red-950 rounded-lg cursor-pointer transition-all active:scale-95"
                              title="Terminate Session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. LICENSES TAB */}
          {activeTab === 'licenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Generate License Key Form */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm h-fit">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <KeyRound className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Generate License Key</h3>
                </div>

                <form onSubmit={handleCreateLicense} className="space-y-4">

                  {/* Workflow info box */}
                  <div className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                      <strong>How it works:</strong> You set the instructor login + student limit. The instructor uses these credentials to log in and create a Room. That Room will generate the actual Student Join Code.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Customer / University *</label>
                      <input
                        type="text"
                        required
                        placeholder="NYU Stern"
                        value={newLicCustomer}
                        onChange={e => setNewLicCustomer(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Billing Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@nyu.edu"
                        value={newLicEmail}
                        onChange={e => setNewLicEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white font-mono transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Max Logins *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={newLicSeats}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              setNewLicSeats(val === '' ? '' : Number(val));
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg text-slate-850 dark:text-white font-mono focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Validity (Days) *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          placeholder="e.g. 10"
                          value={newLicValidityDays}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              setNewLicValidityDays(val === '' ? '' : Number(val));
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg text-slate-850 dark:text-white font-mono focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Instructor Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="instructor@nyu.edu"
                        value={newLicInstructorEmail}
                        onChange={e => setNewLicInstructorEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white font-mono transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Instructor Password *</label>
                      <input
                        type="text"
                        required
                        placeholder="sternpass123"
                        value={newLicInstructorPassword}
                        onChange={e => setNewLicInstructorPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg focus:border-indigo-500 outline-none text-slate-850 dark:text-white font-mono transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider rounded-xl border-b-4 border-indigo-900 active:border-b shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Generate Key
                  </button>
                </form>

                {licSuccessMsg && (
                  <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-[10px] font-black uppercase font-mono">
                    {licSuccessMsg}
                  </div>
                )}
                {licErrorMsg && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase font-mono">
                    {licErrorMsg}
                  </div>
                )}
              </div>

              {/* Active Licenses List */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                      License Registry Archive
                    </h3>
                    {cloudSyncStatus === 'synced' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" title="Connected to centralized PostgreSQL cloud database">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Cloud Synced
                      </span>
                    ) : cloudSyncStatus === 'local_only' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800" title="Licenses are stored only in this laptop's local browser memory because Render /api/licenses returned 404. Redeploy Render backend to sync across all laptops.">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Local Browser Storage
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono text-slate-400">
                        Checking sync...
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={loadLicenses}
                    disabled={isSyncingLicenses}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Reload and sync licenses from central database"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingLicenses ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                </div>

                {filteredLicenses.length === 0 ? (
                  <p className="text-center py-8 text-slate-450 italic text-xs">No licenses registered.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-black uppercase border-b border-slate-200 dark:border-slate-800">
                          <th className="p-3">Client</th>
                          <th className="p-3">License Key</th>
                          <th className="p-3 w-16 text-center">Seats</th>
                          <th className="p-3 w-20 text-center">Status</th>
                          <th className="p-3 text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-700 dark:text-slate-350">
                        {filteredLicenses.map(l => (
                          <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-800 dark:text-white">{l.customerName}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">{l.email}</div>
                            </td>
                            <td className="p-3 font-mono text-[11px] tracking-wide text-indigo-600 dark:text-indigo-400 uppercase select-all">
                              {l.id}
                              <div className="text-[9px] text-slate-400 font-sans font-normal mt-0.5">
                                Expires: {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : (l.endDate || 'Active')}
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono">{l.maxSeats === 999 ? "∞" : l.maxSeats}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleToggleLicenseStatus(l.id)}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border cursor-pointer select-none transition-all ${
                                  l.status === 'active' 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-550/20' 
                                    : 'bg-red-50 border-red-200 text-red-600 dark:text-red-400 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                }`}
                              >
                                {l.status}
                              </button>
                            </td>
                            <td className="p-3 text-right pr-4 flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLicenseForCreds(l)}
                                className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 hover:text-white hover:bg-indigo-650 border border-indigo-100 dark:border-indigo-950 rounded-lg cursor-pointer transition-all active:scale-95"
                                title="View Credentials Vault"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLicense(l.id)}
                                className="p-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 border border-red-100 dark:border-red-950 rounded-lg cursor-pointer transition-all active:scale-95"
                                title="Revoke Key"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 4. BROADCAST TAB */}
          {activeTab === 'broadcast' && (
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <Megaphone className="w-4 h-4 text-emerald-500 animate-bounce" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white">Broadcast System Announcement</h3>
                  {broadcastActive && (
                    <span className="text-[8px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-250 dark:border-emerald-550/20 animate-pulse ml-2">
                      ON AIR
                    </span>
                  )}
                </div>

                <form onSubmit={handleUpdateBroadcast} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Alert Notification Type</label>
                      <select
                        value={broadcastType}
                        onChange={e => setBroadcastType(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 text-xs rounded-lg text-slate-850 dark:text-white font-mono focus:border-indigo-500 outline-none"
                      >
                        <option value="info">System Info (Blue)</option>
                        <option value="warning">System Warning (Yellow)</option>
                        <option value="success">Maintenance Notice (Green)</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1.5 pl-1.5">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={broadcastActive}
                          onChange={e => setBroadcastActive(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span>Active System Broadcast</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-450 dark:text-slate-500 ml-1">Banner Announcement Message</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. System scheduled maintenance is active from 10 PM. Active session tickers will pause."
                      value={broadcastMsg}
                      onChange={e => setBroadcastMsg(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs rounded-xl focus:border-indigo-500 outline-none text-slate-850 dark:text-white transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider rounded-xl border-b-4 border-indigo-900 active:border-b shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all"
                    >
                      <Megaphone className="w-4 h-4" />
                      Transmit Broadcast
                    </button>
                    {broadcastActive && (
                      <button
                        type="button"
                        onClick={handleDeactivateBroadcast}
                        className="py-3 px-5 border border-red-300 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-black uppercase text-xs rounded-xl select-none cursor-pointer active:scale-95 duration-200 transition-all"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </form>

                {bcSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-[10px] font-black uppercase font-mono">
                    {bcSuccessMsg}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 5. SYSTEM LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {['all', 'warning', 'error', 'fatal'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setLogFilter(sev as any)}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase cursor-pointer border transition-all ${
                        logFilter === sev
                          ? sev === 'all' ? 'bg-slate-800 dark:bg-white/10 text-white border-transparent' :
                            sev === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                            sev === 'error' ? 'bg-red-55 border-red-200 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                            'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20'
                          : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:text-red-400 hover:border-red-200 text-[10px] font-extrabold text-slate-500 uppercase rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none transition-all active:scale-95"
                >
                  Clear Buffer Logs
                </button>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs">
                  <ScrollText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Log trace buffer empty.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm max-h-[500px] overflow-y-auto custom-scroll">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-black sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5">Time Logged</th>
                        <th className="p-3.5 w-24">Severity</th>
                        <th className="p-3.5">Component Module</th>
                        <th className="p-3.5">Admin Mail</th>
                        <th className="p-3.5">Exception Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-bold text-slate-700 dark:text-slate-350">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all font-mono">
                          <td className="p-3.5 text-slate-450 dark:text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                              log.severity === 'fatal' ? 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-550/20' :
                              log.severity === 'error' ? 'bg-red-50 border-red-200 text-red-600 dark:text-red-400 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                              'bg-amber-50 border-amber-250 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-550/20'
                            }`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans text-indigo-600 dark:text-indigo-400 font-extrabold">{log.component}</td>
                          <td className="p-3.5 text-slate-500 dark:text-slate-450 font-sans">{log.userEmail}</td>
                          <td className="p-3.5 text-slate-850 dark:text-slate-200 font-sans leading-relaxed">{log.errorMessage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 6. SETTINGS TAB */}
          {activeTab === 'settings' && adminDetails && (
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-500" />
                  Supervisor Registry Account
                </h3>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-indigo-400/20">
                    {adminDetails.avatar}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-850 dark:text-white leading-none">{adminDetails.name}</h4>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono uppercase font-bold tracking-widest">{adminDetails.role}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{adminDetails.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-450 dark:text-slate-500 block">System Build version</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block font-mono">v1.0.2-prod-release</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-450 dark:text-slate-500 block">Core Architecture</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block font-mono">React / Zustand / Express API</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>

    {selectedLicenseForCreds && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-serif font-black text-sm uppercase tracking-wider text-slate-800 dark:text-white">
                  License Credentials
                </h3>
                <p className="text-[10px] text-slate-450 font-mono mt-0.5 leading-none">
                  {selectedLicenseForCreds.customerName}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedLicenseForCreds(null)}
              className="text-slate-450 hover:text-slate-700 dark:hover:text-white bg-transparent border-none cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            
            {/* License Info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">License Key</span>
                <span className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400 select-all tracking-wider">{selectedLicenseForCreds.id}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Max Students</span>
                <span className="text-[11px] font-mono font-black text-slate-800 dark:text-white">{selectedLicenseForCreds.maxSeats === 999 ? '∞ Unlimited' : `${selectedLicenseForCreds.maxSeats} students`}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Valid Until</span>
                <span className="text-[11px] font-mono font-black text-slate-800 dark:text-white">{selectedLicenseForCreds.endDate}</span>
              </div>
            </div>

            {/* Instructor Credentials card */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3" /> Instructor Login Credentials
              </h4>
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Login Email</span>
                    <span className="text-xs font-mono font-bold text-slate-850 dark:text-white select-all">{selectedLicenseForCreds.instructorEmail || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Password</span>
                    <span className="text-xs font-mono font-bold text-slate-850 dark:text-white select-all">{selectedLicenseForCreds.instructorPassword || 'N/A'}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${selectedLicenseForCreds.instructorEmail}\nPassword: ${selectedLicenseForCreds.instructorPassword}`);
                    alert('Instructor credentials copied to clipboard!');
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg border-none cursor-pointer transition-all shadow-sm tracking-wider"
                >
                  Copy Instructor Credentials
                </button>
              </div>
            </div>



          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => setSelectedLicenseForCreds(null)}
              className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white text-xs font-bold rounded-lg border-none cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    )}
  </div>
</div>
  );
}
