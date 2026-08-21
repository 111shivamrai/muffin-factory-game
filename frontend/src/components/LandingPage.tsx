import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { useGameStore } from '../store/gameStore.js';
import { UserRole } from '../../../backend/src/types/index.js';
import { 
  Play, Sparkles, User, Key, Mail, Landmark, Layers, LogOut, Heart, 
  HelpCircle, Activity, AlertTriangle, X, ChevronRight, Check, Eye, EyeOff, BookOpen, Clock, ShieldAlert, Award,
  Users, BarChart2
} from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return 'https://muffin-factory-game.onrender.com';
  }
  return 'http://localhost:5001';
};
const API_URL = getApiUrl();

interface FeatureItem {
  label: string;
  title: string;
  body: string;
  icon: any;
  checks: string[];
}

export default function LandingPage({ navigate }: { navigate: (to: string) => void }) {
  const { login, joinRoom, isAuthenticated, user, logout, room, teamState } = useGameStore();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [error, setError] = useState('');
  
  // Auth Form
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Join Room Form
  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [joinName, setJoinName] = useState('');

  // Features active tab
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  // Quote Calculator States
  const [studentsCount, setStudentsCount] = useState(60);
  const [sessionsCount, setSessionsCount] = useState(4);
  const [duration, setDuration] = useState('Semester (16 weeks)');
  const [institutionType, setInstitutionType] = useState('University / Business School');

  // FAQ State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Active Navigation Tab (Hero / Features / Simulator / Pricing / FAQ)
  const [activeNavTab, setActiveNavTab] = useState<'hero' | 'features' | 'simulator' | 'pricing' | 'faq'>('hero');

  // Book a Demo Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoInstitution, setDemoInstitution] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Formal Quote Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quoteOrg, setQuoteOrg] = useState('');
  const [quoteDept, setQuoteDept] = useState('');
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);

  // Demo launch loading state
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160; // offset for sticky navbar
      const sections = ['hero', 'features', 'simulator', 'pricing', 'faq'];
      
      // If we are at the top, always highlight hero
      if (window.scrollY < 50) {
        setActiveNavTab('hero');
        return;
      }

      // If we are close to the bottom, highlight the last section (faq)
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80) {
        setActiveNavTab('faq');
        return;
      }

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          const bottom = top + rect.height;
          if (scrollPos >= top && scrollPos < bottom) {
            setActiveNavTab(sectionId as any);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Defer the initial run to let DOM layout calculate sizes properly
    const timer = setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  // Handle Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Use auth login endpoint
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        login(data.token, data.user);
        setIsLoginModalOpen(false);
      }
    } catch (err) {
      setError('Connection failed. Is the server running?');
    }
  };

  // Handle Join Room (for student operator entry)
  const handleJoinRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomCode || !teamName || !joinName) {
      setError('All fields are required to join');
      return;
    }

    try {
      // First, get student authentication token dynamically (with retry for rolling deployments)
      let res;
      let data;
      for (let i = 0; i < 3; i++) {
        res = await fetch(`${API_URL}/api/auth/student-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: joinName, roomCode: roomCode.toUpperCase() })
        });
        data = await res.json();
        if (!data.error) break; // Success!
        if (data.error && i < 2) {
          // Wait 1.5 seconds before retrying to hit the other container
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      // Log in and save token/user to store/socket
      login(data.token, data.user);

      // Now join the room/team
      await joinRoom(roomCode.toUpperCase(), teamName);
    } catch (err: any) {
      setError(err?.message || err || 'Failed to join the simulation room');
    }
  };

  const handleLaunchDemo = async () => {
    setError('');
    setIsDemoLoading(true);
    try {
      // 1. Fetch active demo room code
      const roomRes = await fetch(`${API_URL}/api/rooms/active-demo`);
      const roomData = await roomRes.json();
      if (roomData.error) {
        setError(roomData.error);
        setIsDemoLoading(false);
        return;
      }
      
      const code = roomData.code;

      // 2. Log in with Operator seed credentials
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'operator@factory.com', password: 'muffin123' })
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setIsDemoLoading(false);
        return;
      }

      // Log in and save token/user to store/socket
      login(data.token, data.user);
      setIsLoginModalOpen(false);

      // 3. Automatically join the demo room
      await joinRoom(code, 'Demo Team');
    } catch (err: any) {
      setError(err?.message || err || 'Connection failed. Is the server running?');
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Features mapping
  const featuresList: FeatureItem[] = [
    {
      label: "Factory Flow",
      title: "End-to-End Factory Flow Simulation",
      body: "Students manage raw materials through mixing, baking, and packaging stages. Each station has realistic capacity constraints, processing times, and failure probabilities that mirror real manufacturing environments.",
      icon: Layers,
      checks: [
        "Configurable station capacities & processing rates",
        "Realistic queue buildup and WIP tracking",
        "Visual flow diagram with live throughput data",
        "Bottleneck identification through constraint analysis"
      ]
    },
    {
      label: "Inventory Policy",
      title: "Safety Stock & Reorder Calculations",
      body: "Master the classic Q, R inventory models. Configure safety stock, track material lead-times, and avoid costly stockouts or backorders during class simulations.",
      icon: BookOpen,
      checks: [
        "Continuous review inventory policy",
        "Automatic reorder point replenishment",
        "Supplier lead time delay variables",
        "Inventory holding vs stockout cost balance"
      ]
    },
    {
      label: "Bottleneck Theory",
      title: "Identifying & Resolving Bottlenecks",
      body: "Analyze line capacity to find the constraint (bottleneck). Students make strategic upgrades, procure additional equipment, or schedule overtime to maximize system throughput.",
      icon: AlertTriangle,
      checks: [
        "Station utilization rates calculation",
        "Machine procurement cost evaluation",
        "Dynamic cycle time comparisons",
        "Little's Law application in practice"
      ]
    },
    {
      label: "Live Multiplayer",
      title: "Competitive Real-Time Marketrooms",
      body: "Compete in real-time against other student teams in the same cohort. Respond to market demand shifts, fulfill active contracts, and watch team rankings update live on the projector.",
      icon: Users,
      checks: [
        "Synchronized clock server engine",
        "Real-time classroom leaderboard update",
        "Shared market demand model",
        "Team-specific workspace consoles"
      ]
    },
    {
      label: "Overtime Arcade",
      title: "Labor Scheduling & Overtime Shifts",
      body: "Configure labor constraints and schedule overtime to handle sudden demand surges. Balance employee cost overhead against late-delivery contract penalties.",
      icon: Clock,
      checks: [
        "Hourly wage and overtime multiplier calculator",
        "Dynamic shift planning panel",
        "Employee morale and productivity impact",
        "Penalty cost minimization strategy"
      ]
    },
    {
      label: "Analytics Engine",
      title: "Comprehensive Operational Analytics",
      body: "Post-game analytics and real-time dashboards track student decisions. Drill down into cash flow, inventory levels, machine utilization rates, and final academic grades.",
      icon: BarChart2,
      checks: [
        "Interactive utilization line charts",
        "Historical cash flow reporting",
        "Customer fill rate metrics tracking",
        "Instructor grading rubric builder"
      ]
    }
  ];

  // If user is already authenticated as operator, but has no active session room yet
  if (isAuthenticated && user && user.role === 'operator' && (!room || !teamState) && user.email !== 'operator@factory.com' && !isDemoLoading) {
    return (
      <div className="muffin-landing min-h-screen flex flex-col items-center justify-between p-4 md:p-8">
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Inconsolata:wght@400;500;700&display=swap');
          .muffin-landing {
            --bg: #f7f0e6;
            --ink: #1e1408;
            background-color: var(--bg);
            color: var(--ink);
            font-family: 'Manrope', sans-serif;
            position: relative;
          }
          .muffin-landing::after {
            content: '';
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 9999;
            opacity: .018;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E");
          }
          .font-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        `}} />
        
        {/* Header */}
        <header className="w-full max-w-lg flex flex-col items-center text-center mt-6 select-none relative z-10">
          <div className="inline-flex items-center gap-3 bg-white border border-[#e8d9c4] rounded-2xl px-4 py-2.5 shadow-[0_4px_15px_rgba(44,26,10,0.02)]">
            <div className="w-9 h-9 rounded-lg bg-[#1e1408] flex items-center justify-center text-xl shadow-md">🧁</div>
            <div className="text-left">
              <h1 className="font-serif text-lg font-bold text-[#1e1408] leading-none">Muffin Factory Lab</h1>
              <p className="text-[#9a7a52] font-mono text-[8px] uppercase tracking-widest mt-0.5">Operations Strategy Engine</p>
            </div>
          </div>
        </header>

        {/* Join classroom box */}
        <main className="w-full max-w-md bg-white border border-[#e8d9c4] p-8 rounded-3xl shadow-[0_8px_35px_rgba(44,26,10,0.03)] relative z-10 my-auto">
          <div className="flex items-center space-x-2 text-[#1d7a45] mb-3">
            <Play className="w-4 h-4 fill-[#1d7a45]" />
            <h3 className="font-serif font-bold text-xl uppercase tracking-wide">Enter Classroom</h3>
          </div>
          <p className="text-xs text-[#6b4e30] mb-6 leading-relaxed">
            Welcome back, <span className="font-bold text-[#1e1408]">{user.name}</span>! Ready to join the simulation? Provide a team name and the room code shared by your instructor.
          </p>

          <form onSubmit={handleJoinRoomSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#6b4e30] tracking-wider uppercase mb-1.5">OPERATOR NAME</label>
              <input
                type="text"
                required
                placeholder="e.g. Shivam"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                className="w-full bg-[#faf8f5] border border-[#e2d6c5] rounded-xl px-4 py-2.5 text-xs text-[#1e1408] placeholder-[#b5a796] focus:outline-none focus:border-[#1d7a45] focus:ring-1 focus:ring-[#1d7a45] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b4e30] tracking-wider uppercase mb-1.5">TEAM NAME (OR CREATE NEW)</label>
              <input
                type="text"
                required
                placeholder="e.g. Cupcake Crew"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-[#faf8f5] border border-[#e2d6c5] rounded-xl px-4 py-2.5 text-xs text-[#1e1408] placeholder-[#b5a796] focus:outline-none focus:border-[#1d7a45] focus:ring-1 focus:ring-[#1d7a45] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#6b4e30] tracking-wider uppercase mb-1.5">ROOM CODE</label>
              <input
                type="text"
                required
                placeholder="6-CHARACTER CODE"
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full bg-[#faf8f5] border border-[#e2d6c5] rounded-xl py-2.5 px-4 text-sm text-center text-[#1e1408] placeholder-[#b5a796] font-mono tracking-widest uppercase font-bold focus:outline-none focus:border-[#1d7a45] focus:ring-1 focus:ring-[#1d7a45] transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-[#1d7a45] hover:bg-[#155a32] text-[#f0f9f4] font-bold text-xs py-3.5 rounded-full flex items-center justify-center space-x-2 transition-all shadow-md active:translate-y-0.5 select-none cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>JOIN TEAM WORKFLOOR</span>
            </button>
          </form>

          {error && (
            <div className="mt-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center shadow-sm">
              ⚠️ {error}
            </div>
          )}
        </main>

        <footer className="w-full max-w-lg mt-6 text-center select-none relative z-10">
          <button onClick={logout} className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center gap-1.5 mx-auto">
            <LogOut className="w-4 h-4" />
            <span>Switch Accounts / Log Out</span>
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="muffin-landing min-h-screen flex flex-col justify-between overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Inconsolata:wght@400;500;700&display=swap');
        
        .muffin-landing {
          --bg: #fdfbf7;
          --bg-card: #ffffff;
          --border: #f0ede4;
          --border2: #e5e2d9;
          --ink: #1c1917;
          --ink2: #44403c;
          --ink3: #78716c;
          --ink4: #a8a29e;
          --green: #1d7a45;
          --green2: #25a05a;
          --greenBg: #f0f9f4;
          --greenBorder: #b8deca;
          --white: #ffffff;
          --off: #fcfaf6;
          
          font-family: 'Manrope', sans-serif;
          background-color: var(--bg);
          color: var(--ink);
          position: relative;
        }
        
        .font-serif {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        
        .font-mono {
          font-family: 'Inconsolata', monospace;
        }

        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }

        /* Custom range slider styling */
        input[type=range].green-slider {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
        }
        input[type=range].green-slider:focus {
          outline: none;
        }
        input[type=range].green-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: #e5e2d9;
          border-radius: 9999px;
        }
        input[type=range].green-slider::-webkit-slider-thumb {
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: #1d7a45;
          cursor: pointer;
          -webkit-appearance: none;
          margin-top: -6px;
          transition: background 0.15s;
        }
        input[type=range].green-slider::-webkit-slider-thumb:hover {
          background: #155a32;
        }
        input[type=range].green-slider::-moz-range-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: #e5e2d9;
          border-radius: 9999px;
        }
        input[type=range].green-slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: #1d7a45;
          cursor: pointer;
          border: none;
          transition: background 0.15s;
        }
        input[type=range].green-slider::-moz-range-thumb:hover {
          background: #155a32;
        }
      `}} />

      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/92 backdrop-blur-md border-b border-[#f0ede4] px-6 select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <div className="w-9 h-9 rounded-xl bg-[#1c1917] flex items-center justify-center text-xl shadow-sm">
              🧁
            </div>
            <div>
              <div className="font-serif text-[17px] font-bold leading-tight text-[#1c1917]">
                Muffin Factory Lab
              </div>
              <div className="font-mono text-[9px] font-medium tracking-widest text-[#78716c] uppercase leading-none mt-0.5">
                OPERATIONS STRATEGY ENGINE
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-[#44403c]">
            <button 
              type="button"
              onClick={() => scrollToSection('features')}
              className={`hover:text-[#1c1917] transition-colors cursor-pointer bg-transparent border-none font-sans font-bold text-[13px] ${
                activeNavTab === 'features' ? 'text-[#1d7a45]' : 'text-[#44403c]'
              }`}
            >
              Features
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('simulator')}
              className={`hover:text-[#1c1917] transition-colors cursor-pointer bg-transparent border-none font-sans font-bold text-[13px] ${
                activeNavTab === 'simulator' ? 'text-[#1d7a45]' : 'text-[#44403c]'
              }`}
            >
              Simulator
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('simulator')}
              className={`hover:text-[#1c1917] transition-colors cursor-pointer bg-transparent border-none font-sans font-bold text-[13px] ${
                activeNavTab === 'simulator' ? 'text-[#1d7a45]' : 'text-[#44403c]'
              }`}
            >
              Dashboards
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('pricing')}
              className={`hover:text-[#1c1917] transition-colors cursor-pointer bg-transparent border-none font-sans font-bold text-[13px] ${
                activeNavTab === 'pricing' ? 'text-[#1d7a45]' : 'text-[#44403c]'
              }`}
            >
              Pricing
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('faq')}
              className={`hover:text-[#1c1917] transition-colors cursor-pointer bg-transparent border-none font-sans font-bold text-[13px] ${
                activeNavTab === 'faq' ? 'text-[#1d7a45]' : 'text-[#44403c]'
              }`}
            >
              FAQ
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="font-sans text-[13px] font-bold text-[#1c1917] bg-transparent border border-[#e5e2d9] rounded-full px-5 py-2 cursor-pointer hover:border-[#1c1917] transition-all"
            >
              Sign in
            </button>
            <button 
              onClick={handleLaunchDemo}
              disabled={isDemoLoading}
              className="font-sans text-[13px] font-bold text-white bg-[#1c1917] border-none rounded-full px-5 py-2 cursor-pointer hover:bg-[#44403c] transition-all flex items-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isDemoLoading ? (
                <><span className="animate-pulse">Launching...</span></>
              ) : (
                <>Try for free <ChevronRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Active Section Content */}
      <main className="flex-1">
          <section id="hero" className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 select-none">
              <h1 className="font-serif text-4xl md:text-5xl lg:text-[54px] font-bold leading-[1.1] text-[#1c1917] mb-6 tracking-tight">
                The factory simulator built for <span className="text-[#1d7a45] underline decoration-[#b8deca] underline-offset-4 decoration-2">operations</span> education.
              </h1>

              <p className="font-sans text-[15px] md:text-base leading-relaxed text-[#78716c] mb-8 max-w-xl">
                Muffin Factory Lab lets students run a virtual bakery — managing inventory, scheduling production, and competing in live multiplayer markets. Used by top business schools worldwide.
              </p>

              <div className="flex items-center gap-3.5 flex-wrap">
                <button 
                  onClick={handleLaunchDemo}
                  className="bg-[#1c1917] hover:bg-[#44403c] text-white font-sans font-bold text-sm px-6 py-3.5 rounded-full flex items-center gap-2 shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Launch Demo Free</span>
                </button>
                
                <button 
                  onClick={() => navigate('/instructor')}
                  className="border border-[#e5e2d9] hover:border-[#1c1917] text-[#1c1917] font-sans font-bold text-sm px-6 py-3.5 rounded-full flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Instructor Login</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hero image frame */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-[28px] overflow-hidden border-[6px] border-[#f0ede4] shadow-2xl bg-white relative z-10 transition-transform duration-500 hover:scale-[1.01]">
                <img 
                  src="/hero_factory_3d.jpg" 
                  alt="Muffin Factory Simulation Dashboard Preview" 
                  className="w-full h-auto object-cover block" 
                />
              </div>
              {/* Decorative background blur blobs */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#fdf2d0] rounded-full filter blur-3xl opacity-60 z-0"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#d2ebd9] rounded-full filter blur-3xl opacity-60 z-0"></div>
            </div>
          </section>

          <section id="features" className="bg-[#fcfaf6] border-t border-[#f0ede4] border-b border-[#f0ede4] py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16 select-none">
                <div className="font-mono text-[10px] font-bold tracking-widest text-[#1d7a45] uppercase mb-3">
                  Platform Capabilities
                </div>
                <h2 className="font-serif text-3xl md:text-[40px] font-bold text-[#1c1917] mb-4 tracking-tight">
                  Everything you need to teach operations
                </h2>
                <p className="font-sans text-[15px] text-[#78716c] max-w-lg mx-auto leading-relaxed">
                  Six integrated modules that cover the complete operations management curriculum — from inventory theory to live competitive simulations.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Features list left sidebar */}
                <div className="lg:col-span-4 flex flex-col gap-2">
                  {featuresList.map((feat, idx) => {
                    const isActive = idx === activeFeatureTab;
                    const FeatIcon = feat.icon;
                    return (
                      <button 
                        key={idx}
                        onClick={() => setActiveFeatureTab(idx)}
                        className={`flex items-center gap-3.5 px-5 py-4 rounded-xl text-left border cursor-pointer select-none transition-all ${
                          isActive 
                            ? 'bg-white border-[#f0ede4] text-[#1c1917] shadow-sm font-bold' 
                            : 'bg-transparent border-transparent text-[#78716c] hover:text-[#44403c]'
                        }`}
                      >
                        <FeatIcon className={`w-4 h-4 ${isActive ? 'text-[#1d7a45]' : 'text-[#a8a29e]'}`} />
                        <span className="text-[13px]">{feat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feature details box */}
                <div className="lg:col-span-8 bg-white border border-[#f0ede4] rounded-2xl p-6 md:p-10 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#f0f9f4] border border-[#b8deca] flex items-center justify-center text-[#1d7a45] mb-6">
                      {React.createElement(featuresList[activeFeatureTab].icon, { size: 22 })}
                    </div>
                    <h3 className="font-serif text-2xl md:text-3xl font-bold text-[#1c1917] mb-3 tracking-tight">
                      {featuresList[activeFeatureTab].title}
                    </h3>
                    <p className="font-sans text-[14px] leading-relaxed text-[#78716c] mb-6">
                      {featuresList[activeFeatureTab].body}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-6 border-t border-[#fcfaf6]">
                    {featuresList[activeFeatureTab].checks.map((check, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-3 text-xs text-[#44403c]">
                        <div className="w-5 h-5 rounded-md bg-[#f0f9f4] border border-[#b8deca] flex items-center justify-center text-[#1d7a45] shrink-0">
                          <Check className="w-3.5 h-3.5 text-[#1d7a45]" strokeWidth={3} />
                        </div>
                        <span>{check}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>

          <section id="simulator" className="py-20 px-6 bg-white border-b border-[#f0ede4]">
            <div className="max-w-6xl mx-auto text-center">
              <div className="font-mono text-[10px] font-bold tracking-widest text-[#1d7a45] uppercase mb-3 select-none">
                Interactive Preview
              </div>
              <h2 className="font-serif text-3xl md:text-[40px] font-bold text-[#1c1917] mb-4 tracking-tight select-none">
                See the simulator in action
              </h2>
              <p className="font-sans text-[15px] text-[#78716c] max-w-lg mx-auto leading-relaxed mb-12 select-none">
                A complete factory operations environment — from raw materials to finished goods, with real-time analytics and competitive multiplayer.
              </p>

              <div className="rounded-[24px] shadow-2xl max-w-4xl mx-auto overflow-hidden relative border-8 border-white bg-white">
                <img 
                  src="/hero_factory_3d.jpg" 
                  alt="Muffin Factory Simulation Scene" 
                  className="w-full h-auto object-cover block"
                />
              </div>
            </div>
          </section>

          <section id="pricing" className="py-20 px-6 bg-[#fcfaf6] border-b border-[#f0ede4]">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16 select-none">
                <div className="font-mono text-[10px] font-bold tracking-widest text-[#1d7a45] uppercase mb-3">
                  Interactive Pricing
                </div>
                <h2 className="font-serif text-3xl md:text-[40px] font-bold text-[#1c1917] mb-4 tracking-tight">
                  Build your custom quote
                </h2>
                <p className="font-sans text-[15px] text-[#78716c] max-w-lg mx-auto leading-relaxed">
                  Pricing scales with your class size. Adjust the parameters below to get an instant estimate.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
                {/* Left side inputs */}
                <div className="lg:col-span-7 bg-white border border-[#f0ede4] p-8 rounded-3xl space-y-8 shadow-sm flex flex-col justify-center">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-[10px] font-bold text-[#44403c] tracking-wider uppercase">Number of Students</label>
                      <div className="w-20 bg-[#fdfbf7] border border-[#e5e2d9] rounded-xl py-1.5 px-3 text-center text-sm font-bold font-mono text-[#1c1917]">
                        {studentsCount}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="10" 
                        max="500" 
                        step="10"
                        value={studentsCount} 
                        onChange={(e) => setStudentsCount(parseInt(e.target.value))}
                        className="green-slider flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#44403c] tracking-wider uppercase mb-3">Number of Sessions</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 4, 6, 8, 10].map((num) => {
                        const isSelected = sessionsCount === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSessionsCount(num)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer select-none ${
                              isSelected 
                                ? 'bg-[#f0f9f4] border-2 border-[#1d7a45] text-[#1d7a45]' 
                                : 'bg-[#fcfaf6] border-[#e5e2d9] text-[#78716c] hover:border-[#1c1917] hover:text-[#1c1917]'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#44403c] tracking-wider uppercase mb-2">Duration</label>
                      <select 
                        value={duration} 
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-[#fcfaf6] border border-[#e5e2d9] rounded-xl px-4 py-3 text-xs text-[#1c1917] font-semibold focus:outline-none focus:border-[#1d7a45] transition-all cursor-pointer"
                      >
                        <option value="One-off Workshop">One-off Workshop</option>
                        <option value="Semester (16 weeks)">Semester (16 weeks)</option>
                        <option value="Full Year">Full Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#44403c] tracking-wider uppercase mb-2">Institution Type</label>
                      <select 
                        value={institutionType} 
                        onChange={(e) => setInstitutionType(e.target.value)}
                        className="w-full bg-[#fcfaf6] border border-[#e5e2d9] rounded-xl px-4 py-3 text-xs text-[#1c1917] font-semibold focus:outline-none focus:border-[#1d7a45] transition-all cursor-pointer"
                      >
                        <option value="University / Business School">University / Business School</option>
                        <option value="Corporate Training / Workshop">Corporate Training / Workshop</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right side summary card */}
                {(() => {
                  const baseRatePerStudent = institutionType === 'University / Business School' ? 1000.00 : 2500.00;
                  const durationModifier = duration === 'One-off Workshop' ? 0.8 : duration === 'Semester (16 weeks)' ? 1.0 : 1.8;
                  const ratePerStudentSession = baseRatePerStudent * durationModifier;
                  const totalCost = Math.round(studentsCount * sessionsCount * ratePerStudentSession);
                  return (
                    <div className="lg:col-span-5 bg-[#121210] rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                      <div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-[#a8a29e] uppercase block mb-1">ESTIMATED COST</span>
                        <div className="flex items-baseline gap-1 mt-2 mb-1">
                          <span className="text-4xl md:text-5xl font-bold font-serif text-white">
                            ₹{totalCost.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#25a05a] block mb-6">
                          ₹{ratePerStudentSession.toFixed(0)}/student/session
                        </span>

                        <div className="border-t border-[#44403c] pt-6 space-y-3.5 text-xs text-[#a8a29e]">
                          <div className="flex justify-between">
                            <span>Base rate per student</span>
                            <span className="font-mono text-white">₹{baseRatePerStudent.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duration modifier</span>
                            <span className="font-mono text-white">x{durationModifier}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Students</span>
                            <span className="font-mono text-white">{studentsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sessions</span>
                            <span className="font-mono text-white">{sessionsCount}</span>
                          </div>
                          <div className="border-t border-[#44403c] pt-3.5 flex justify-between font-bold">
                            <span className="text-white">Total</span>
                            <span className="font-mono text-[15px] text-[#25a05a]">₹{totalCost.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsQuoteModalOpen(true)}
                        className="w-full mt-8 bg-white hover:bg-slate-100 text-[#121210] font-sans font-bold text-xs py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
                      >
                        <span>Request Formal Quote</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>

          <section id="faq" className="py-20 px-6 bg-white border-b border-[#f0ede4]">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column info */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold tracking-widest text-[#1d7a45] uppercase block mb-3">FAQ</span>
                  <h2 className="font-serif text-3xl md:text-[40px] font-bold text-[#1c1917] mb-4 tracking-tight leading-tight">
                    Common questions
                  </h2>
                  <p className="font-sans text-[14px] text-[#78716c] leading-relaxed mb-8 max-w-sm">
                    Can't find what you're looking for? Reach out to our team for a personalized walkthrough.
                  </p>
                </div>

                {/* Book a Demo card */}
                <div className="bg-[#f0f9f4] border border-[#b8deca] rounded-2xl p-6 shadow-[0_4px_15px_rgba(29,122,69,0.02)]">
                  <h4 className="font-serif text-base font-bold text-[#1d7a45] mb-2">Still have questions?</h4>
                  <p className="text-[11px] text-[#1d7a45]/80 leading-relaxed mb-5">
                    Book a 15-minute demo call with our team. We'll walk you through the platform and answer any questions.
                  </p>
                  <button 
                    type="button"
                    onClick={() => setIsDemoModalOpen(true)}
                    className="bg-[#1d7a45] hover:bg-[#155a32] text-white font-sans font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <span>📞 Book a Demo</span>
                  </button>
                </div>
              </div>

              {/* Right Column Accordion */}
              <div className="lg:col-span-7 divide-y divide-[#f0ede4]">
                {[
                  {
                    q: "How many students can participate in a single session?",
                    a: "Our standard room setup supports up to 50 active student operators grouped into teams of 1-5 players. For larger cohorts, multiple parallel simulation rooms can be launched under the same instructor console."
                  },
                  {
                    q: "Do students need to install any software?",
                    a: "No installation is required. Muffin Factory Lab is a 100% web-based application that runs smoothly on any modern browser (Chrome, Safari, Firefox, Edge) across laptops, tablets, and mobile devices."
                  },
                  {
                    q: "Can I customize the scenarios for my course?",
                    a: "Yes! Instructors have access to a Scenario Wizard where they can customize customer demand curves, machine processing limits, replenishment times, supplier delay frequencies, and credit lines to align with specific syllabus objectives."
                  },
                  {
                    q: "Is there a free trial available?",
                    a: "Yes, any user can click \"Launch Demo Free\" to access the instant Sandbox playground room. This allows instructors to test the conveyor controls, review reports, and explore student dashboard layout without any setup."
                  },
                  {
                    q: "What kind of support do you offer for instructors?",
                    a: "We provide comprehensive onboarding support, slide decks for lecture integration, pre-configured scenario templates for operations classes, and real-time technical support during live classroom sessions."
                  }
                ].map((item, index) => {
                  const isOpen = activeFaq === index;
                  return (
                    <div key={index} className="py-4 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setActiveFaq(isOpen ? null : index)}
                        className="w-full flex items-center justify-between text-left font-serif text-sm md:text-base font-bold text-[#1c1917] hover:text-[#1d7a45] py-2 transition-colors cursor-pointer select-none bg-transparent border-none"
                      >
                        <span>{item.q}</span>
                        <ChevronRight 
                          className={`w-4 h-4 text-[#a8a29e] transform transition-transform duration-200 ${isOpen ? 'rotate-90 text-[#1d7a45]' : ''}`} 
                        />
                      </button>
                      <div 
                        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 mt-2 opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <p className="text-xs md:text-[13px] leading-relaxed text-[#78716c] font-sans pb-2">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
      </main>

      {/* ==================== BOOK A DEMO MODAL (Image 1 style) ==================== */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setIsDemoModalOpen(false); setDemoSubmitted(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex" onClick={e => e.stopPropagation()}>
            
            {/* Left Panel */}
            <div className="w-[42%] bg-white p-8 flex flex-col justify-between border-r border-[#f0ede4]">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-[#fcfaf6] border border-[#f0ede4] flex items-center justify-center text-lg">🧁</div>
                  <span className="font-serif font-bold text-[#1c1917] text-sm">Muffin Lab</span>
                </div>
                <h2 className="font-serif text-2xl font-bold text-[#1c1917] mb-6 leading-tight">15-Min Operations Strategy Demo</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2.5 text-[13px] text-[#44403c]">
                    <span className="text-base">⏱</span>
                    <span>15 minutes</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[13px] text-[#44403c]">
                    <span className="text-base">📞</span>
                    <span>Google Meet video call</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[13px] text-[#44403c]">
                    <span className="text-base">🌏</span>
                    <span className="font-semibold text-[#1d7a45]">India Standard Time</span>
                  </div>
                </div>
                <p className="text-[12px] text-[#78716c] leading-relaxed">
                  Book a quick call with our learning design team to walkthrough custom integrations, course mapping, and pricing plans.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-[#f0ede4]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">AS</div>
                <div>
                  <p className="font-bold text-[#1c1917] text-sm leading-none">Aarav Sharma</p>
                  <p className="text-[11px] text-[#78716c] mt-0.5">Operations Strategy Lead</p>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-sans font-bold text-lg text-[#1c1917]">
                  {demoSubmitted ? '✅ Request Received!' : 'Request a Professional Demo'}
                </h3>
                <button onClick={() => { setIsDemoModalOpen(false); setDemoSubmitted(false); }} className="text-[#78716c] hover:text-[#1c1917] bg-transparent border-none cursor-pointer p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {demoSubmitted ? (
                <div className="py-8 text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <p className="font-sans text-[14px] text-[#44403c] leading-relaxed">
                    Thank you <strong>{demoName}</strong>! Our team will reach out to <strong>{demoEmail}</strong> within 24 hours to schedule your personalized walkthrough.
                  </p>
                  <button onClick={() => { setIsDemoModalOpen(false); setDemoSubmitted(false); }} className="mt-6 bg-[#1d7a45] text-white font-bold text-xs px-6 py-2.5 rounded-full cursor-pointer border-none transition-all hover:bg-[#155a32]">Close</button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-[#78716c] mb-6 leading-relaxed">Fill in your details below and our Operations Strategy team will reach out to schedule your personalized walkthrough.</p>
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    emailjs.send(
                      'service_5pcx4hw',
                      'template_r9639yf',
                      {
                        to_email: 'muffinmegafactory@gmail.com',
                        from_name: demoName,
                        name: demoName,
                        user_name: demoName,
                        sender: demoName,
                        from_email: demoEmail,
                        email: demoEmail,
                        reply_to: demoEmail,
                        user_email: demoEmail,
                        message: `New Request: Book a Demo\n\nName: ${demoName}\nEmail: ${demoEmail}\nInstitution/Company: ${demoInstitution}`,
                        type: 'Book a Demo'
                      },
                      'TmzldpiycMQDEttvp'
                    ).then(() => {
                      setDemoSubmitted(true);
                    }).catch((err) => {
                      console.error('Failed to send demo request', err);
                      alert('Failed to send request. Please try again.');
                    });
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#44403c] mb-1.5">FULL NAME <span className="text-red-500">*</span></label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Sarah Jenkins"
                        value={demoName}
                        onChange={e => setDemoName(e.target.value)}
                        className="w-full border border-[#e5e2d9] rounded-lg px-4 py-2.5 text-sm text-[#1c1917] focus:outline-none focus:border-[#1d7a45] transition-all bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#44403c] mb-1.5">WORK / UNIVERSITY EMAIL <span className="text-red-500">*</span></label>
                      <input
                        required
                        type="email"
                        placeholder="e.g. s.jenkins@university.edu"
                        value={demoEmail}
                        onChange={e => setDemoEmail(e.target.value)}
                        className="w-full border border-[#e5e2d9] rounded-lg px-4 py-2.5 text-sm text-[#1c1917] focus:outline-none focus:border-[#1d7a45] transition-all bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#44403c] mb-1.5">INSTITUTION / COMPANY <span className="text-red-500">*</span></label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Stanford University"
                        value={demoInstitution}
                        onChange={e => setDemoInstitution(e.target.value)}
                        className="w-full border border-[#e5e2d9] rounded-lg px-4 py-2.5 text-sm text-[#1c1917] focus:outline-none focus:border-[#1d7a45] transition-all bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl cursor-pointer border-none transition-all mt-2 shadow-md"
                    >
                      Request Demo
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== FORMAL QUOTE MODAL (Image 2 style) ==================== */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setIsQuoteModalOpen(false); setQuoteSubmitted(false); }}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            style={{ border: '2px solid #b5763a' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#f0e8d8', background: '#fffdf9' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="font-serif font-bold text-[#1c1917] text-base">Request Formal Price Quote</h3>
              </div>
              <button onClick={() => { setIsQuoteModalOpen(false); setQuoteSubmitted(false); }} className="text-[#78716c] hover:text-[#1c1917] bg-transparent border-none cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {quoteSubmitted ? (
                <div className="py-8 text-center">
                  <div className="text-4xl mb-4">📨</div>
                  <h4 className="font-serif font-bold text-[#1c1917] mb-2">Quote Request Sent!</h4>
                  <p className="text-[13px] text-[#78716c] leading-relaxed">
                    Thank you <strong>{quoteName}</strong>! We'll generate your formal quote and send it to <strong>{quoteEmail}</strong> within 1 business day.
                  </p>
                  <button onClick={() => { setIsQuoteModalOpen(false); setQuoteSubmitted(false); }} className="mt-6 bg-[#1c1917] text-white font-bold text-xs px-6 py-2.5 rounded-full cursor-pointer border-none transition-all hover:bg-black">Close</button>
                </div>
              ) : (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  emailjs.send(
                    'service_5pcx4hw',
                    'template_r9639yf',
                    {
                      to_email: 'muffinmegafactory@gmail.com',
                      from_name: quoteName,
                      name: quoteName,
                      user_name: quoteName,
                      sender: quoteName,
                      from_email: quoteEmail,
                      email: quoteEmail,
                      reply_to: quoteEmail,
                      user_email: quoteEmail,
                      message: `New Request: Formal Quote\n\nName: ${quoteName}\nEmail: ${quoteEmail}\nOrganization: ${quoteOrg}\nDepartment/Role: ${quoteDept}`,
                      type: 'Request Formal Quote'
                    },
                    'TmzldpiycMQDEttvp'
                  ).then(() => {
                    setQuoteSubmitted(true);
                  }).catch((err) => {
                    console.error('Failed to send quote request', err);
                    alert('Failed to send request. Please try again.');
                  });
                }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#44403c] mb-1.5">YOUR FULL NAME <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Professor Sarah Jenkins"
                      value={quoteName}
                      onChange={e => setQuoteName(e.target.value)}
                      className="w-full border border-[#e5e2d9] rounded-lg px-4 py-2.5 text-sm text-[#1c1917] focus:outline-none focus:border-[#b5763a] transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#44403c] mb-1.5">WORK EMAIL <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. s.jenkins@university.edu"
                      value={quoteEmail}
                      onChange={e => setQuoteEmail(e.target.value)}
                      className="w-full border border-[#e5e2d9] rounded-lg px-4 py-2.5 text-sm text-[#1c1917] focus:outline-none focus:border-[#b5763a] transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#44403c] mb-1.5">UNIVERSITY / ORGANIZATION <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Harvard Business School"
                      value={quoteOrg}
                      onChange={e => setQuoteOrg(e.target.value)}
                      className="w-full border border-[#e5e2d9] rounded-lg px-4 py-2.5 text-sm text-[#1c1917] focus:outline-none focus:border-[#b5763a] transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#44403c] mb-1.5">DEPARTMENT / ACADEMIC ROLE</label>
                    <input
                      type="text"
                      placeholder="e.g. Operations Strategy"
                      value={quoteDept}
                      onChange={e => setQuoteDept(e.target.value)}
                      className="w-full border border-[#e5e2d9] rounded-lg px-4 py-2.5 text-sm text-[#1c1917] focus:outline-none focus:border-[#b5763a] transition-all bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full text-white font-bold text-sm py-3.5 rounded-xl cursor-pointer border-none transition-all mt-2 flex items-center justify-center gap-2"
                    style={{ background: '#1c1917' }}
                  >
                    Generate Formal Quote →
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Premium dark directory footer */}
      <footer className="bg-[#121210] text-[#a8a29e] py-16 px-6 select-none border-t border-[#44403c]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12">
            {/* Logo and About col */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-xl shadow-md">
                  🧁
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-white leading-none">Muffin Factory Lab</h3>
                  <p className="text-[#a8a29e] font-mono text-[8px] uppercase tracking-widest mt-1">Operations Strategy Engine</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed max-w-sm text-[#a8a29e]/80">
                The leading operations management simulator for business schools and corporate training programs worldwide.
              </p>
            </div>

            {/* Product col */}
            <div className="grid grid-cols-3 md:col-span-7 gap-6">
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold font-mono tracking-wider text-white uppercase">Product</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('features')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Features
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('simulator')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Simulator
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('simulator')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Dashboards
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('pricing')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Pricing
                    </button>
                  </li>
                </ul>
              </div>

              {/* Company col */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold font-mono tracking-wider text-white uppercase">Company</h4>
                <ul className="space-y-2 text-xs font-sans">
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      About
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Blog
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Careers
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Contact
                    </button>
                  </li>
                </ul>
              </div>

              {/* Legal col */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold font-mono tracking-wider text-white uppercase">Legal</h4>
                <ul className="space-y-2 text-xs font-sans">
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Privacy Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Terms of Service
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      Cookie Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => scrollToSection('faq')}
                      className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-[#a8a29e] text-xs font-sans font-medium"
                    >
                      FERPA Compliance
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-[#44403c]/60 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[10px] flex items-center gap-2 flex-wrap font-sans">
              <span>© 2026 Muffin Factory Lab. All rights reserved.</span>
              <span className="text-[#44403c]">•</span>
              <button 
                type="button"
                onClick={() => navigate('/instructor')} 
                className="hover:text-white hover:underline bg-transparent border-none p-0 cursor-pointer font-semibold transition-colors"
              >
                Instructor Console
              </button>
              <span className="text-[#44403c]">•</span>
              <button 
                type="button"
                onClick={() => navigate('/saas-admin')} 
                className="hover:text-white hover:underline bg-transparent border-none p-0 cursor-pointer font-semibold transition-colors"
              >
                Admin Console
              </button>
            </div>
            <div className="text-[10px] flex items-center gap-1 font-sans text-[#a8a29e]/60">
              <span>Operations and Supply Chain Strategy Education.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modern Vercel-like Authentication Modal Overlay */}
      {isLoginModalOpen && (
        <div 
          onClick={() => setIsLoginModalOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#f0ede4] rounded-[24px] max-w-4xl w-full shadow-2xl overflow-hidden animate-fade-in relative flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0ede4] bg-[#fcfaf6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1c1917] flex items-center justify-center text-sm text-white">
                  🧁
                </div>
                <span className="font-serif font-bold text-base text-[#1c1917]">Muffin Factory Lab Portal</span>
              </div>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-[#78716c] hover:text-[#1c1917] bg-transparent border-none cursor-pointer p-1"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#f0ede4] bg-white">
              
              {/* Left Column: Enter Factory (Student direct room join) */}
              <div className="p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[#1d7a45] mb-3">
                    <Play className="w-4 h-4 fill-[#1d7a45] text-[#1d7a45]" />
                    <h3 className="font-serif font-bold text-lg uppercase tracking-wide">Enter Factory</h3>
                  </div>
                  <p className="text-[11px] text-[#78716c] mb-6 leading-relaxed">
                    Joining an active classroom competition? Provide your operator name, team details, and the room code shared by your instructor below to enter the workfloor directly.
                  </p>

                  <form onSubmit={handleJoinRoomSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#44403c] tracking-wider uppercase mb-1.5">Operator Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-[#a8a29e]" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Shivam"
                          value={joinName}
                          onChange={(e) => setJoinName(e.target.value)}
                          className="w-full bg-[#fcfaf6] border border-[#e5e2d9] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#44403c] tracking-wider uppercase mb-1.5">Team Name (or Create New)</label>
                      <div className="relative">
                        <Layers className="absolute left-3.5 top-3 w-4 h-4 text-[#a8a29e]" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Cupcake Crew"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="w-full bg-[#fcfaf6] border border-[#e5e2d9] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#44403c] tracking-wider uppercase mb-1.5">Room Code</label>
                      <input
                        type="text"
                        required
                        placeholder="6-CHARACTER CODE"
                        maxLength={6}
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        className="w-full bg-[#fcfaf6] border border-[#e5e2d9] rounded-xl py-2.5 px-4 text-xs text-center text-[#1c1917] placeholder-[#a8a29e] font-mono tracking-widest uppercase font-bold focus:outline-none focus:border-[#1c1917] transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 bg-[#1d7a45] hover:bg-[#155a32] text-white font-sans font-bold text-xs py-3.5 rounded-full flex items-center justify-center space-x-2 transition-all shadow-sm active:translate-y-0.5 select-none cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>JOIN TEAM WORKFLOOR</span>
                    </button>
                    {error && !error.includes('email') && !error.includes('password') && !error.includes('Access denied') && !error.includes('Connection failed') && (
                      <div className="text-[11px] text-[#c0392b] font-semibold text-center mt-2">
                        ⚠️ {error}
                      </div>
                    )}
                  </form>
                </div>
                <div className="border-t border-[#f0ede4] mt-8 pt-4 text-center">
                  <span className="text-[9px] text-[#78716c] uppercase tracking-widest font-mono">
                    Maximum 50 operators per room
                  </span>
                </div>
              </div>

              {/* Right Column: Console Access (Instructor/Admin login) */}
              <div className="p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-[#c8852a] mb-3">
                    <Landmark className="w-4 h-4 text-[#c8852a]" />
                    <h3 className="font-serif font-bold text-lg uppercase tracking-wide">Console Access</h3>
                  </div>
                  <p className="text-[11px] text-[#78716c] mb-6 leading-relaxed">
                    Sign in to access Saved Scenarios, configure Rooms, monitor active teams, or audit global user metrics. Are you looking for the dedicated consoles? Go directly to the <button type="button" onClick={() => { setIsLoginModalOpen(false); navigate('/instructor'); }} className="text-[#c8852a] hover:underline bg-transparent border-none p-0 cursor-pointer font-bold transition-all">Instructor Portal</button> or the <button type="button" onClick={() => { setIsLoginModalOpen(false); navigate('/saas-admin'); }} className="text-[#c8852a] hover:underline bg-transparent border-none p-0 cursor-pointer font-bold transition-all">Admin Console</button>.
                  </p>

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#44403c] uppercase mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#a8a29e]" />
                        <input 
                          type="email"
                          required
                          placeholder="email@example.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full bg-[#fcfaf6] border border-[#e5e2d9] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#44403c] uppercase mb-1.5">Password</label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-3 w-4 h-4 text-[#a8a29e]" />
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-[#fcfaf6] border border-[#e5e2d9] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1c1917] transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3 bg-transparent border-none cursor-pointer p-0.5 text-[#a8a29e] hover:text-[#44403c]"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="text-[11px] text-[#c0392b] font-semibold text-center mt-2">
                        ⚠️ {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full mt-4 bg-[#c8852a] hover:bg-[#b06818] text-white font-sans font-bold text-xs py-3.5 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                    >
                      Sign In to Console
                    </button>
                  </form>
                </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
