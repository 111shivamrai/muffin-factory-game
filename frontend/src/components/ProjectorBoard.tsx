import React, { useEffect, useState, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, useGameStore } from '../store/gameStore.js';
import { 
  Trophy, Maximize, Minimize, Volume2, VolumeX, Monitor, 
  ExternalLink, Sparkles, Check, Copy, ArrowLeft, RefreshCw, X
} from 'lucide-react';
import { Room, TeamState, SavedScenario } from '../../../backend/src/types/index.js';

interface ProjectorBoardProps {
  navigate?: (to: string) => void;
}

export default function ProjectorBoard({ navigate }: ProjectorBoardProps) {
  // Query / hash parameter parsing
  const getInitialParams = () => {
    if (typeof window === 'undefined') return { roomCode: '', token: '' };
    
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hash);

    const roomCode = (
      searchParams.get('room') || 
      searchParams.get('code') || 
      hashParams.get('room') || 
      hashParams.get('code') || 
      localStorage.getItem('muffin_projector_room') || 
      ''
    ).replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    const token = (
      hashParams.get('token') || 
      searchParams.get('token') || 
      sessionStorage.getItem('muffin_token') || 
      localStorage.getItem('muffin_projector_token') || 
      useGameStore.getState().token || 
      ''
    );

    return { roomCode, token };
  };

  const initialParams = getInitialParams();
  const [roomCode, setRoomCode] = useState(initialParams.roomCode);
  const [token, setToken] = useState(initialParams.token);
  const [roomInput, setRoomInput] = useState(initialParams.roomCode);

  // Live state
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<TeamState[]>([]);
  const [members, setMembers] = useState<{ userId: string; userName: string; teamId: string; teamName: string }[]>([]);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  
  // Controls & indicators
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Play audio tone
  const playTone = (freq: number, type: 'sine' | 'triangle' | 'square' = 'sine', duration: number = 0.1) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Calculate student stars
  const calculateStars = (cash: number, thresholds?: number[]) => {
    const t1 = typeof thresholds?.[0] === 'number' ? thresholds[0] : 85000;
    const t2 = typeof thresholds?.[1] === 'number' ? thresholds[1] : 120000;
    const t3 = typeof thresholds?.[2] === 'number' ? thresholds[2] : 180000;
    if (cash >= t3) return 3;
    if (cash >= t2) return 2;
    if (cash >= t1) return 1;
    return 0;
  };

  // BroadcastChannel sync with InstructorDashboard on the same browser
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel('muffin_projector_channel');
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'PROJECTOR_SYNC') {
        if (data.room) {
          setRoom(data.room);
          setRoomCode(data.room.code);
        }
        if (Array.isArray(data.instructorTeams)) {
          setTeams(data.instructorTeams);
        }
        if (Array.isArray(data.members)) {
          setMembers(data.members);
        }
        if (Array.isArray(data.scenarios)) {
          setScenarios(data.scenarios);
        }
        setIsConnected(true);
        setConnectionError(null);
      }
    };

    // Request initial sync from existing instructor dashboard
    channel.postMessage({ type: 'PROJECTOR_REQUEST_SYNC' });

    return () => {
      channel.close();
    };
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!roomCode) return;

    setIsConnecting(true);
    setConnectionError(null);

    // Save active room code in localStorage for quick reload
    try {
      localStorage.setItem('muffin_projector_room', roomCode);
    } catch (e) {}

    const authToken = token || sessionStorage.getItem('muffin_token') || localStorage.getItem('muffin_projector_token') || '';

    const socket = io(API_URL, {
      auth: { token: authToken }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join room as observer/instructor
      socket.emit('join_room', { token: authToken, roomCode }, (response: any) => {
        setIsConnecting(false);
        if (response?.error) {
          setConnectionError(response.error);
        } else if (response?.room) {
          setRoom(response.room);
          if (Array.isArray(response.teamStates)) {
            setTeams(response.teamStates);
          }
          if (Array.isArray(response.members)) {
            setMembers(response.members);
          }
          setConnectionError(null);
        }
      });
    });

    socket.on('connect_error', (err) => {
      setIsConnecting(false);
      setIsConnected(false);
      setConnectionError(`Connection failed: ${err.message}`);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time synchronization events
    socket.on('room_updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      playTone(523.25, 'triangle', 0.05);
    });

    socket.on('instructor_teams_list', (updatedTeams: TeamState[]) => {
      setTeams(updatedTeams);
      playTone(659.25, 'triangle', 0.05);
    });

    socket.on('instructor_team_updated', (updatedTeam: TeamState) => {
      setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    });

    socket.on('members_updated', (updatedMembers: any[]) => {
      setMembers(updatedMembers);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode, token]);

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomInput.trim().toUpperCase();
    if (clean) {
      setRoomCode(clean);
      const url = new URL(window.location.href);
      url.searchParams.set('room', clean);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Sorted teams list
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.cash - a.cash);
  }, [teams]);

  const scenarioThresholds = useMemo(() => {
    if (!room?.scenarioId) return undefined;
    const sc = scenarios.find(s => s.id === room.scenarioId);
    return sc?.starsThresholds;
  }, [room?.scenarioId, scenarios]);

  return (
    <div className="min-h-screen bg-[#0d0c0a] text-white flex flex-col p-4 sm:p-8 select-none relative overflow-x-hidden font-sans">
      {/* Subtle background ambient dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#f7f0e6_0.15px,transparent_1px)] [background-size:14px_14px] opacity-[0.03] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex flex-wrap justify-between items-center border-b-2 border-stone-800 pb-4 mb-6 gap-4">
        
        {/* Left: Branding & Cohort Title */}
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-3xl">🏆</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif italic text-2xl sm:text-3xl lg:text-4xl text-amber-300 uppercase tracking-wide leading-none">
                Muffin Factory Cohorts Leaderboard
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] sm:text-xs text-stone-400 uppercase tracking-wider">
              <span>Live Corporate Net Treasury Liquidity Rankings</span>
              {isConnected && (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Badges: Room Info */}
        {room && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Room Code Badge */}
            <div 
              onClick={() => {
                if (room?.code) {
                  navigator.clipboard.writeText(room.code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }
              }}
              className="bg-stone-900 border border-amber-500/30 hover:border-amber-500/60 px-3.5 py-1.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md group"
              title="Click to copy Room Code"
            >
              <span className="text-[9px] uppercase font-mono font-bold text-stone-400">ROOM:</span>
              <span className="font-mono font-black text-base sm:text-lg text-amber-300 tracking-wider">
                {room.code}
              </span>
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-stone-500 group-hover:text-amber-300 transition-colors" />
              )}
            </div>

            {/* Simulation Day Badge */}
            <div className="bg-stone-900 border border-stone-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-[9px] uppercase font-mono font-bold text-stone-400">DAY:</span>
              <span className="font-mono font-black text-base sm:text-lg text-white">
                {room.currentDay} <span className="text-stone-500 font-normal text-xs">/ {room.maxDays}</span>
              </span>
            </div>

            {/* Status Indicator */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono font-bold text-xs uppercase ${
              room.status === 'active' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                : room.status === 'paused'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                : 'bg-stone-900 border-stone-750 text-stone-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                room.status === 'active' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`} />
              <span>{room.status === 'active' ? 'Simulation Running' : room.status === 'paused' ? 'Paused' : room.status}</span>
              <span className="text-stone-500 text-[10px]">({room.tickRate}s/d)</span>
            </div>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer"
            title={soundEnabled ? 'Mute audio' : 'Enable audio feedback'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 hover:border-amber-500/50 hover:text-amber-300 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-stone-200 transition-all cursor-pointer active:scale-95 shadow-md"
            title="Toggle Fullscreen for Projector (F11)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          {/* Close Window Button */}
          <button
            onClick={() => {
              if (window.opener) {
                window.close();
              } else if (navigate) {
                navigate('/instructor');
              } else {
                window.location.href = '/instructor';
              }
            }}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-stone-200 transition-all cursor-pointer"
            title="Close Projector Window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        
        {/* If no room code entered */}
        {!roomCode ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-6 shadow-2xl">
              <Monitor className="w-10 h-10 text-amber-300" />
            </div>
            <h2 className="font-serif italic text-3xl text-amber-300 uppercase tracking-wide mb-2">
              Classroom Projector Board
            </h2>
            <p className="font-mono text-xs text-stone-400 mb-6">
              Enter the 6-character room code from your Instructor Console to project this live session on the display.
            </p>
            <form onSubmit={handleManualConnect} className="w-full flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="flex-1 bg-stone-900 border-2 border-stone-750 focus:border-amber-400 text-white font-mono text-lg font-black tracking-widest text-center uppercase p-3 rounded-xl outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black text-xs uppercase px-6 py-3 rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                Connect
              </button>
            </form>
          </div>
        ) : isConnecting && !room ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-stone-400 font-mono text-sm">
            <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Connecting to room {roomCode}...</span>
          </div>
        ) : connectionError && !room ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto">
            <div className="text-4xl">⚠️</div>
            <h3 className="font-sans font-bold text-red-400 text-lg">Unable to Connect</h3>
            <p className="font-mono text-xs text-stone-400">{connectionError}</p>
            <form onSubmit={handleManualConnect} className="w-full flex gap-2 mt-4">
              <input
                type="text"
                maxLength={6}
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="RE-ENTER CODE"
                className="flex-1 bg-stone-900 border border-stone-700 text-white font-mono text-sm p-2.5 rounded-xl text-center uppercase"
              />
              <button
                type="submit"
                className="bg-stone-800 hover:bg-stone-700 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-white cursor-pointer"
              >
                Retry
              </button>
            </form>
          </div>
        ) : (
          /* Live Leaderboard Display */
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scroll">
            {sortedTeams.map((team, idx) => {
              const stars = calculateStars(team.cash, scenarioThresholds);
              const teamMembers = members?.filter(m => m.teamId === team.id || m.teamName === team.name) || [];
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <div
                  key={team.id}
                  className={`border p-5 rounded-2xl flex items-center justify-between shadow-xl transition-all duration-300 relative overflow-hidden ${
                    isFirst
                      ? 'bg-gradient-to-r from-amber-950/40 via-stone-900/90 to-stone-900/95 border-amber-400/50 shadow-amber-950/20'
                      : isSecond
                      ? 'bg-gradient-to-r from-slate-900/60 via-stone-900/90 to-stone-900/95 border-slate-400/40'
                      : isThird
                      ? 'bg-gradient-to-r from-orange-950/30 via-stone-900/90 to-stone-900/95 border-orange-600/40'
                      : 'bg-stone-900/90 border-stone-800/80 hover:border-amber-400/20'
                  }`}
                >
                  {/* Subtle top ranking accent glow */}
                  {isFirst && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                  )}

                  {/* Left: Rank, Team Name, Stars & Players */}
                  <div className="flex items-center gap-5 sm:gap-7 text-left">
                    {/* Rank Badge */}
                    <div className="w-14 sm:w-16 text-center shrink-0">
                      <span className={`font-mono font-black text-3xl sm:text-4xl block leading-none ${
                        isFirst ? 'text-amber-400' : isSecond ? 'text-slate-300' : isThird ? 'text-orange-400' : 'text-stone-500'
                      }`}>
                        #{idx + 1}
                      </span>
                      {isFirst && (
                        <span className="font-mono text-[8px] uppercase font-black text-amber-400 block tracking-widest mt-1">
                          👑 LEADER
                        </span>
                      )}
                    </div>

                    {/* Team Details */}
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-wider text-stone-400 font-bold block">
                          TEAM CREW
                        </span>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-sans font-black text-2xl sm:text-3xl text-white tracking-tight">
                            {team.name}
                          </span>
                          {/* Stars */}
                          <div className="flex gap-1 ml-1" title={`${stars} Star Rating`}>
                            {Array.from({ length: 3 }).map((_, sidx) => (
                              <span 
                                key={sidx} 
                                className={`text-xl ${sidx < stars ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-stone-700'}`}
                              >
                                ⭐
                              </span>
                            ))}
                          </div>
                          {team.status === 'bankrupt' && (
                            <span className="bg-red-900/80 text-red-200 border border-red-700 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                              Operations Halted (Bankrupt)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Roster of Players */}
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-wider text-stone-500 font-bold block">
                          ROSTER
                        </span>
                        {teamMembers.length === 0 ? (
                          <span className="text-xs text-stone-500 italic font-mono">No student players joined yet</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {teamMembers.map((m, midx) => (
                              <span 
                                key={midx}
                                className="px-2.5 py-0.5 bg-stone-800/90 border border-stone-700 text-stone-200 rounded-md text-xs font-mono font-semibold"
                              >
                                {m.userName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Cash & Satisfaction */}
                  <div className="text-right space-y-1 shrink-0 pl-4">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-stone-400 font-bold block">
                      NET TREASURY
                    </span>
                    <span className="font-mono font-black text-2xl sm:text-4xl text-emerald-400 block tracking-tight">
                      ₹{team.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className="font-mono text-xs text-stone-400 uppercase tracking-widest font-extrabold">
                      <span className="text-white font-black">{team.report?.fillRate ?? 100}%</span> customer satisfaction
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty state when room has no teams */}
            {sortedTeams.length === 0 && (
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-stone-800 rounded-3xl bg-stone-900/40 space-y-4">
                <span className="text-7xl animate-bounce mb-2">🧁</span>
                <h3 className="font-serif italic text-2xl text-amber-300 uppercase tracking-wide">
                  Waiting for Student Crews to Register
                </h3>
                <div className="bg-stone-900 border border-amber-500/30 px-6 py-3 rounded-2xl inline-block shadow-xl">
                  <span className="text-xs font-mono uppercase text-stone-400 block mb-1">Students: Join this room code</span>
                  <span className="font-mono font-black text-3xl sm:text-4xl text-amber-300 tracking-widest">
                    {room?.code || roomCode}
                  </span>
                </div>
                <div className="font-mono text-xs text-stone-400 max-w-md mt-2 space-y-1">
                  <div>1. Open <span className="text-white font-bold underline">https://muffin-factory-game.vercel.app</span></div>
                  <div>2. Enter Room Code <span className="text-amber-300 font-bold">{room?.code || roomCode}</span></div>
                  <div>3. Enter your Team Name and start your bakery factory!</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Bar */}
      <footer className="relative z-10 pt-4 mt-4 border-t border-stone-900 flex justify-between items-center text-[10px] font-mono text-stone-500">
        <div>
          Muffin Factory Game • Academic Cohort Operations Simulation
        </div>
        <div className="flex items-center gap-3">
          <span>Press F11 for Fullscreen</span>
          <span>•</span>
          <span>{sortedTeams.length} Active {sortedTeams.length === 1 ? 'Team' : 'Teams'}</span>
        </div>
      </footer>
    </div>
  );
}
