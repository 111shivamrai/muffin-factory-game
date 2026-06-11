import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { 
  Play, Pause, StepForward, Settings, Radio, Sparkles, LogOut, Plus, Trash2, 
  Copy, ShieldAlert, Award, FileSpreadsheet, Eye, RefreshCw, BarChart2, Landmark,
  Volume2, VolumeX, Zap, Download, Trash, ChevronLeft, ChevronRight, Check,
  AlertTriangle, Monitor, Clock, X, HelpCircle
} from 'lucide-react';
import { SavedScenario, Room, TeamState } from '../../../backend/src/types/index.js';

export default function InstructorDashboard() {
  const { 
    logout, exitRoom, scenarios, loadScenarios, roomsList, loadRooms, createRoom, deleteRoom,
    room, role, joinRoom, socket, instructorTeams, instructorControl, user
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'live' | 'scenarios'>('live');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);

  // Sound Safeguard states
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Safeguard limits
  const [safeguards, setSafeguards] = useState({
    cashEnabled: true,
    cashMin: 100000,
    satisfactionEnabled: true,
    satisfactionMin: 75,
  });

  // Disruptions Suite
  const [disruptionType, setDisruptionType] = useState<'demand_surge' | 'material_shortage' | 'machine_breakdown'>('demand_surge');
  const [disruptionSeverity, setDisruptionSeverity] = useState<'low' | 'medium' | 'high'>('low');

  // Room Creation / Lobby states
  const [roomName, setRoomName] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [roomDifficulty, setRoomDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [roomTickRate, setRoomTickRate] = useState(8);
  const [roomMaxDays, setRoomMaxDays] = useState(30);

  // Inspected Team Correction Modal states
  const [inspectedTeam, setInspectedTeam] = useState<TeamState | null>(null);
  const [overrideCash, setOverrideCash] = useState('');
  const [overrideFlour, setOverrideFlour] = useState('');
  const [overrideQ, setOverrideQ] = useState('');
  const [overrideR, setOverrideR] = useState('');

  // Scenario Wizard Modal states
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

  // Wizard Fields
  const [scName, setScName] = useState('Muffin Experience Preset');
  const [scDesc, setScDesc] = useState('Custom crafted baking operations scenario');
  const [scMaxDays, setScMaxDays] = useState(30);
  const [scRealTime, setScRealTime] = useState(15);
  const [scBaseMixCost, setScBaseMixCost] = useState(5.0);
  const [scSellingPrice, setScSellingPrice] = useState(20.0);

  // Wizard Step 2: Wholesale Contracts
  interface WizardContract {
    id: string;
    name: string;
    beginsAtDay: number;
    endsAtDay: number;
    dailyDemand: number;
    pricePerUnit: number;
    fillRatePenalty: number;
  }
  const [scContracts, setScContracts] = useState<WizardContract[]>([]);
  const [newConName, setNewConName] = useState('');
  const [newConDemand, setNewConDemand] = useState(40);
  const [newConRate, setNewConRate] = useState(30);
  const [newConStart, setNewConStart] = useState(10);
  const [newConEnd, setNewConEnd] = useState(25);
  const [newConPenalty, setNewConPenalty] = useState(5);

  // Wizard Step 3: Walk-in Retail Breaking Points
  const [scPoissonDemand, setScPoissonDemand] = useState(true);
  interface BreakingPoint {
    day: number;
    demand: number;
  }
  const [scBreakingPoints, setScBreakingPoints] = useState<BreakingPoint[]>([
    { day: 0, demand: 100 },
    { day: 30, demand: 100 }
  ]);
  const [newBpDay, setNewBpDay] = useState(15);
  const [newBpDemand, setNewBpDemand] = useState(120);

  // Wizard Step 4: Starting Parameters
  const [scStartCash, setScStartCash] = useState(100000);
  const [scStartMaterials, setScStartMaterials] = useState(12000);
  const [scStartQ, setScStartQ] = useState(12000);
  const [scStartR, setScStartR] = useState(2300);
  const [scStartMachinesMixing, setScStartMachinesMixing] = useState(1);
  const [scStartMachinesBaking, setScStartMachinesBaking] = useState(1);
  const [scStartMachinesIcing, setScStartMachinesIcing] = useState(1);
  const [scStartMachinesPackaging, setScStartMachinesPackaging] = useState(1);

  // Wizard Step 5: Capacity speeds & Purchase Costs
  const [scMixingCap, setScMixingCap] = useState(100);
  const [scMixingCost, setScMixingCost] = useState(2000);
  const [scBakingCap, setScBakingCap] = useState(80);
  const [scBakingCost, setScBakingCost] = useState(3000);
  const [scIcingCap, setScIcingCap] = useState(120);
  const [scIcingCost, setScIcingCost] = useState(1500);
  const [scPackagingCap, setScPackagingCap] = useState(150);
  const [scPackagingCost, setScPackagingCost] = useState(1000);

  // Wizard Step 6: Star Thresholds
  const [scStarsThreshold1, setScStarsThreshold1] = useState(85000);
  const [scStarsThreshold2, setScStarsThreshold2] = useState(120000);
  const [scStarsThreshold3, setScStarsThreshold3] = useState(180000);

  // Real-time local ticking timers
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  useEffect(() => {
    loadScenarios();
    loadRooms();
  }, []);

  // Sync elapsed clocks and tickers client-side
  useEffect(() => {
    if (room && room.status === 'active') {
      setSecondsRemaining(room.tickRate);
      const interval = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev === null || prev <= 1) {
            return room.tickRate;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setSecondsRemaining(null);
    }
  }, [room?.status, room?.currentDay, room?.tickRate]);

  useEffect(() => {
    if (room && room.status === 'active') {
      const startTime = Date.now() - (room.currentDay * room.tickRate * 1000);
      const interval = setInterval(() => {
        const diff = Date.now() - startTime;
        const totalSecs = Math.max(0, Math.floor(diff / 1000));
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime('00:00');
    }
  }, [room?.status, room?.currentDay]);

  // Audio tone generator
  const playTone = (freq: number, type: 'sine' | 'triangle' | 'square' | 'sawtooth' = 'sine', duration: number = 0.1) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Browser blocked audio context
    }
  };

  // Check team safeguard breaches
  const getSafeguardBreaches = (team: TeamState) => {
    const breaches = [];
    if (safeguards.cashEnabled && team.cash < safeguards.cashMin) {
      breaches.push({ type: 'cash', message: `capital falls below ₹${safeguards.cashMin.toLocaleString()}` });
    }
    if (safeguards.satisfactionEnabled && (team.report?.fillRate ?? 100) < safeguards.satisfactionMin) {
      breaches.push({ type: 'sat', message: `customer satisfaction falls below ${safeguards.satisfactionMin}%` });
    }
    return breaches;
  };

  // Play alarm sound if any team breaches safeguards
  const anyBreach = instructorTeams.some(t => getSafeguardBreaches(t).length > 0);
  useEffect(() => {
    if (anyBreach && soundEnabled && room && room.status === 'active') {
      const interval = setInterval(() => {
        playTone(330, 'sawtooth', 0.25);
        setTimeout(() => playTone(220, 'sawtooth', 0.2), 300);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [anyBreach, soundEnabled, room?.status]);

  // Calculate student stars based on thresholds
  const calculateStars = (cash: number, thresholds?: number[]) => {
    const t1 = thresholds?.[0] ?? scStarsThreshold1;
    const t2 = thresholds?.[1] ?? scStarsThreshold2;
    const t3 = thresholds?.[2] ?? scStarsThreshold3;
    if (cash >= t3) return 3;
    if (cash >= t2) return 2;
    if (cash >= t1) return 1;
    return 0;
  };

  // Export cohort sheet (CSV)
  const handleExportCSV = () => {
    try {
      playTone(587.33, 'triangle', 0.1);
      const headers = "Rank,Team Name,Status,Total Cash (INR),Fulfillment Rate (%),Stockout Days,CSAT (%),Academic Score\n";
      const rows = [...instructorTeams]
        .sort((a, b) => b.cash - a.cash)
        .map((t, idx) => {
          const stars = calculateStars(t.cash, room?.scenarioId ? scenarios.find(s => s.id === room.scenarioId)?.starsThresholds : undefined);
          return `${idx + 1},"${t.name}",${t.status},₹${t.cash.toFixed(2)},${t.report.fillRate}%,${t.report.stockoutDays}d,${t.report?.fillRate ?? 100}%,${t.academicScore.totalScore}/100`;
        })
        .join("\n");
      const blob = new Blob([headers + rows], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Session_${room?.code}_AllTeams_DailyLog.csv`;
      link.click();
    } catch {
      alert("Failed compiling transaction sheets.");
    }
  };

  // Download individual team ledger CSV
  const handleDownloadLedger = (teamId: string, teamName: string) => {
    try {
      playTone(587.33, 'triangle', 0.1);
      const team = instructorTeams.find(t => t.id === teamId);
      if (!team || !team.history || !team.history.cash || team.history.cash.length === 0) {
        alert("This team hasn't committed decisions or processed days yet.");
        return;
      }
      const headers = "Day Offset,Hours Offset,Daily Revenue,Daily Profit,Material Purchase cost,Production expenses,Holding charges,Contract compliance penalties,Total Cash\n";
      const rows = team.history.cash.map((cash, idx) => {
        const day = idx + 1;
        const rev = team.history.revenue[idx] || 0;
        const profit = cash - (team.history.cash[idx-1] || team.cash) || 0;
        const rawMatCost = team.history.inventory.base_mix[idx] * 5; // proxy cost
        const prodCost = team.history.utilization.mixing[idx] * 50;
        const holding = team.history.inventory.base_mix[idx] * 0.1;
        const penalties = 0;
        return `${day},${day * 24},${rev},${profit},${rawMatCost},${prodCost},${holding},${penalties},${cash}`;
      }).join("\n");
      const blob = new Blob([headers + rows], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${teamName.replace(/\s+/g, "_")}_DailyBalanceReport.csv`;
      link.click();
    } catch {
      alert("Failed compiling ledger file.");
    }
  };

  // Kick student team
  const handleKickTeam = (teamId: string, teamName: string) => {
    playTone(220, 'sawtooth', 0.15);
    if (confirm(`Are you sure you want to kick team "${teamName}" from the session?`)) {
      instructorControl('kick_team', { teamId });
    }
  };

  // Trigger Economics Disruption Shocks
  const handleInjectDisruption = () => {
    playTone(330, 'sawtooth', 0.2);
    let eventName = '';
    let description = '';
    let targetVariable: 'demand' | 'raw_material_cost' | 'lead_time' | 'breakdowns' = 'demand';
    let modifier = 0;

    const mult = disruptionSeverity === 'low' ? 0.3 : disruptionSeverity === 'medium' ? 0.6 : 1.0;

    if (disruptionType === 'demand_surge') {
      eventName = 'Demand Surge Wave';
      description = `A viral social media post drives massive interest in bakery goods. Walk-in demand rises by +${Math.round(mult * 100)}%!`;
      targetVariable = 'demand';
      modifier = mult;
    } else if (disruptionType === 'material_shortage') {
      eventName = 'Flour & Sugar Cost Spike';
      description = `Global supply chain congestion increases raw material costs by +${Math.round(mult * 150)}%!`;
      targetVariable = 'raw_material_cost';
      modifier = mult * 1.5;
    } else if (disruptionType === 'machine_breakdown') {
      eventName = 'Severe Oven Breakdown Wave';
      description = `Electrical grid power volatility damages machinery, doubling oven breakdown probability!`;
      targetVariable = 'breakdowns';
      modifier = 1.0; // 100% probability increase
    }

    instructorControl('inject_event', {
      name: eventName,
      description,
      targetVariable,
      modifier,
      startDay: room?.currentDay || 1,
      endDay: (room?.currentDay || 1) + 5
    });

    alert(`Disruption dispatched: "${eventName}" successfully injected!`);
  };

  // Launch Room / Start Line
  const handleInitializeLobby = () => {
    playTone(587.33, 'triangle', 0.1);
    if (!roomName) {
      alert('Session title / section name is required');
      return;
    }
    const finalScenarioId = selectedScenarioId || scenarios[0]?.id;
    const selectedSc = scenarios.find(s => s.id === finalScenarioId);
    const diff = selectedSc ? selectedSc.difficulty : roomDifficulty;
    const rate = selectedSc ? selectedSc.tickRate : roomTickRate;
    const days = selectedSc ? selectedSc.maxDays : roomMaxDays;

    createRoom(roomName, diff, rate, days, finalScenarioId || undefined).then(created => {
      joinRoom(created.code);
    }).catch(err => alert(err.message || 'Failed to create room'));
  };

  // Inspect / Intervene Modal controls
  const handleOpenIntervene = (team: TeamState) => {
    setInspectedTeam(team);
    setOverrideCash(team.cash.toString());
    setOverrideFlour(team.inventory.base_mix.onHand.toString());
    setOverrideQ(team.inventory.base_mix.orderQty.toString());
    setOverrideR(team.inventory.base_mix.reorderPoint.toString());
  };

  const handleApplyOverride = () => {
    if (!inspectedTeam) return;
    playTone(587.33, 'triangle', 0.1);
    instructorControl('override_team_state', {
      teamId: inspectedTeam.id,
      balance: parseFloat(overrideCash),
      rawMaterials: parseInt(overrideFlour),
      orderQuantity: parseInt(overrideQ),
      reorderPoint: parseInt(overrideR)
    }).then(() => {
      alert(`Factory parameters override for ${inspectedTeam.name} successfully applied!`);
      setInspectedTeam(null);
    }).catch(() => alert('Correction override failed.'));
  };

  // Wizard Helper: Initialize wizard fields for a scenario (new, copy or edit)
  const openScenarioWizard = (sc?: SavedScenario | null) => {
    playTone(440, 'sine', 0.05);
    if (sc) {
      setEditingScenarioId(sc.id);
      setScName(sc.name);
      setScDesc(sc.description);
      setScMaxDays(sc.maxDays);
      setScRealTime(Math.round((sc.maxDays * sc.tickRate) / 60) || 15);
      setScBaseMixCost(sc.rawMaterialCosts.baseMix);
      setScSellingPrice(20.0);
      setScContracts(sc.contracts.map((c, i) => ({
        id: `contract_${i}_${Date.now()}`,
        name: c.name,
        beginsAtDay: c.startDay,
        endsAtDay: c.endDay,
        dailyDemand: c.dailyQuantity,
        pricePerUnit: Math.round(c.priceMultiplier * 20),
        fillRatePenalty: c.penalty
      })));
      setScPoissonDemand(sc.demand.type !== 'fixed');
      setScBreakingPoints(sc.demand.customSchedule?.map((val, day) => ({ day, demand: val })) || [
        { day: 0, demand: sc.demand.baseVal },
        { day: sc.maxDays, demand: sc.demand.baseVal }
      ]);
      setScStartCash(sc.startCash);
      setScStartMaterials(12000);
      setScStartQ(12000);
      setScStartR(2300);
      setScStartMachinesMixing(1);
      setScStartMachinesBaking(1);
      setScStartMachinesIcing(1);
      setScStartMachinesPackaging(1);
      setScMixingCap(sc.machineSettings.mixing.capacityPerMachine);
      setScMixingCost(sc.machineSettings.mixing.purchaseCost);
      setScBakingCap(sc.machineSettings.baking.capacityPerMachine);
      setScBakingCost(sc.machineSettings.baking.purchaseCost);
      setScIcingCap(sc.machineSettings.icing.capacityPerMachine);
      setScIcingCost(sc.machineSettings.icing.purchaseCost);
      setScPackagingCap(sc.machineSettings.packaging.capacityPerMachine);
      setScPackagingCost(sc.machineSettings.packaging.purchaseCost);
      setScStarsThreshold1(sc.starsThresholds?.[0] ?? 85000);
      setScStarsThreshold2(sc.starsThresholds?.[1] ?? 120000);
      setScStarsThreshold3(sc.starsThresholds?.[2] ?? 180000);
    } else {
      setEditingScenarioId(null);
      setScName('Muffin Experience Preset');
      setScDesc('Custom crafted baking operations scenario');
      setScMaxDays(30);
      setScRealTime(15);
      setScBaseMixCost(5.0);
      setScSellingPrice(20.0);
      setScContracts([]);
      setScPoissonDemand(true);
      setScBreakingPoints([
        { day: 0, demand: 100 },
        { day: 30, demand: 100 }
      ]);
      setScStartCash(100000);
      setScStartMaterials(12000);
      setScStartQ(12000);
      setScStartR(2300);
      setScStartMachinesMixing(1);
      setScStartMachinesBaking(1);
      setScStartMachinesIcing(1);
      setScStartMachinesPackaging(1);
      setScMixingCap(100);
      setScMixingCost(2000);
      setScBakingCap(80);
      setScBakingCost(3000);
      setScIcingCap(120);
      setScIcingCost(1500);
      setScPackagingCap(150);
      setScPackagingCost(1000);
      setScStarsThreshold1(85000);
      setScStarsThreshold2(120000);
      setScStarsThreshold3(180000);
    }
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleSaveScenario = () => {
    playTone(587.33, 'triangle', 0.1);
    
    const tickRate = Math.round((scRealTime * 60) / scMaxDays);
    const dailySchedule = Array.from({ length: scMaxDays + 1 }).map((_, day) => {
      const bpBefore = [...scBreakingPoints].reverse().find(bp => bp.day <= day) || scBreakingPoints[0];
      const bpAfter = scBreakingPoints.find(bp => bp.day >= day) || scBreakingPoints[scBreakingPoints.length - 1];
      if (!bpBefore || !bpAfter) return 100;
      if (bpBefore.day === bpAfter.day) return bpBefore.demand;
      const ratio = (day - bpBefore.day) / (bpAfter.day - bpBefore.day);
      return Math.round(bpBefore.demand + (bpAfter.demand - bpBefore.demand) * ratio);
    });

    const scenarioData = {
      id: editingScenarioId || undefined,
      name: scName,
      description: scDesc,
      learningObjective: scDesc,
      difficulty: 'custom' as any,
      maxDays: scMaxDays,
      tickRate: tickRate || 8,
      startCash: scStartCash,
      rawMaterialCosts: { baseMix: scBaseMixCost, packaging: 1.0, orderCost: 150 },
      leadTimes: { rawMaterial: 3, machineProcurement: 5 },
      breakdownsEnabled: true,
      demand: {
        type: scPoissonDemand ? 'random' as any : 'fixed' as any,
        baseVal: scBreakingPoints[0]?.demand || 100,
        amplitude: 0,
        period: 10,
        randomNoise: 0.1,
        customSchedule: dailySchedule
      },
      machineSettings: {
        mixing: { capacityPerMachine: scMixingCap, purchaseCost: scMixingCost, operatingCost: 40, breakdownProbability: 0.015, breakdownDuration: 2, repairCost: 300 },
        baking: { capacityPerMachine: scBakingCap, purchaseCost: scBakingCost, operatingCost: 60, breakdownProbability: 0.015, breakdownDuration: 2, repairCost: 500 },
        icing: { capacityPerMachine: scIcingCap, purchaseCost: scIcingCost, operatingCost: 30, breakdownProbability: 0.01, breakdownDuration: 1, repairCost: 200 },
        packaging: { capacityPerMachine: scPackagingCap, purchaseCost: scPackagingCost, operatingCost: 20, breakdownProbability: 0.01, breakdownDuration: 1, repairCost: 150 }
      },
      contracts: scContracts.map(c => ({
        name: c.name,
        startDay: c.beginsAtDay,
        endDay: c.endsAtDay,
        dailyQuantity: c.dailyDemand,
        priceMultiplier: c.pricePerUnit / 20.0,
        penalty: c.fillRatePenalty
      })),
      starsThresholds: [scStarsThreshold1, scStarsThreshold2, scStarsThreshold3],
      events: []
    };

    useGameStore.getState().createScenario(scenarioData).then(() => {
      alert("Scenario saved successfully!");
      setWizardOpen(false);
    }).catch(err => alert(err.message || "Failed to save scenario"));
  };

  const handleDuplicateScenario = (sc: SavedScenario) => {
    playTone(440, 'sine', 0.05);
    useGameStore.getState().duplicateScenario(sc.id).then(() => {
      alert(`Copied scenario: "${sc.name}"`);
    });
  };

  const handleDeleteScenario = (id: string, name: string) => {
    playTone(220, 'sawtooth', 0.15);
    if (confirm(`Delete custom scenario "${name}"?`)) {
      useGameStore.getState().deleteScenario(id);
    }
  };

  // Filter presets vs custom
  const presets = scenarios.filter(s => s.creatorId?.includes('admin') || s.id?.includes('preset'));
  const customScenarios = scenarios.filter(s => !s.creatorId?.includes('admin') && !s.id?.includes('preset'));

  return (
    <div className={`instructor-dashboard min-h-screen h-screen overflow-hidden ${isDarkMode ? "dark" : ""}`}>
      
      {/* Dynamic Style injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .instructor-dashboard {
          --bg: #f7f0e6;
          --bg2: #f0e6d6;
          --bg3: #e8d9c4;
          --bg4: #deccb0;
          --ink: #120d07;
          --brown: #2c1a0a;
          --espresso: #1a0e05;
          --caramel: #b06818;
          --gold: #c8852a;
          --amber: #e0a040;
          --amber2: #f0b84e;
          --sage: #3d7050;
          --rust: #a03820;
          --txt: #1e1408;
          --txt2: #6b4e30;
          --txt3: #9a7a52;
          --b1: rgba(44,26,10,.08);
          --b2: rgba(44,26,10,.14);
          --b3: rgba(44,26,10,.22);
          --r1: 10px; --r2: 16px; --r3: 24px; --r4: 32px;
          
          background: var(--bg);
          color: var(--txt);
          font-family: 'DM Sans', sans-serif;
          transition: background 0.3s, color 0.3s;
          position: relative;
        }

        .instructor-dashboard.dark {
          --bg: #0d0c0a;
          --bg2: #16130f;
          --bg3: #221d17;
          --bg4: #332b22;
          --ink: #f7f0e6;
          --brown: #e8d9c4;
          --espresso: #16130f;
          --caramel: #c8852a;
          --gold: #b06818;
          --amber: #f0b84e;
          --amber2: #fbbf24;
          --sage: #4ade80;
          --rust: #f87171;
          --txt: #f7f0e6;
          --txt2: #d6c7b2;
          --txt3: #9a7a52;
          --b1: rgba(247,240,230,.08);
          --b2: rgba(247,240,230,.14);
          --b3: rgba(247,240,230,.22);
        }

        .instructor-dashboard::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9998;
          opacity: .022;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='512' height='512' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .mono { font-family: 'Inconsolata', monospace; }
        .txt2 { color: var(--txt2); }
        .txt3 { color: var(--txt3); }
        
        .bcard {
          background: var(--bg2);
          border: 1px solid var(--b2);
          border-radius: var(--r2);
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .instructor-dashboard.dark .bcard {
          background: var(--bg2);
          border-color: var(--b1);
        }

        .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: var(--b3); border-radius: 4px; }

        .text-dynamic-text {
          color: var(--txt);
        }
      ` }} />

      <h1 className="sr-only">Instructor Panel Control Center</h1>

      {/* Header Bar */}
      <header className="h-12 bg-zinc-950 text-white px-6 flex items-center justify-between border-b border-white/5 shadow-md relative z-40 select-none">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-gray-400">
              SUPERVISOR CONTROL CENTER {room ? `// CODE: ${room.code}` : ''}
            </span>
          </div>
          <div className="h-4 w-px bg-white/10"></div>
          <nav aria-label="Section navigation" className="flex gap-2">
            <button
              onClick={() => { playTone(260, 'sine', 0.05); setActiveTab('live'); }}
              className={`text-[10px] uppercase font-black tracking-wider transition-all px-3 py-1 rounded-md cursor-pointer ${
                activeTab === 'live' ? 'bg-white/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              📊 Live Console
            </button>
            <button
              onClick={() => { playTone(260, 'sine', 0.05); setActiveTab('scenarios'); }}
              className={`text-[10px] uppercase font-black tracking-wider transition-all px-3 py-1 rounded-md cursor-pointer ${
                activeTab === 'scenarios' ? 'bg-white/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              📖 Experience presets
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { playTone(200, 'sine', 0.05); room ? exitRoom() : logout(); }}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-red-950/20 hover:text-red-400 border border-white/10 hover:border-red-500/25 px-3 py-1.5 rounded-lg text-[9px] uppercase font-black text-gray-300 transition-all cursor-pointer select-none active:scale-95 animate-fade-in"
            title={room ? "Return to Lobby" : "Exit Instructor Portal"}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{room ? "Exit Room" : "Exit Dashboard"}</span>
          </button>
          {room && (
            <button
              onClick={() => { playTone(587.33, 'triangle', 0.1); setProjectorOpen(true); }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg text-[9px] uppercase font-black text-white transition-all shadow-md cursor-pointer select-none active:scale-95"
            >
              <Monitor className="w-3.5 h-3.5 fill-current" />
              <span>📺 Projector Board</span>
            </button>
          )}
          <button
            onClick={() => { playTone(523, 'triangle', 0.08); setIsDarkMode(!isDarkMode); }}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer text-xs select-none"
            title="Toggle Color Theme"
          >
            {isDarkMode ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="h-[calc(100vh-48px)] overflow-hidden">
        
        {/* Tab 1: Live Console */}
        {activeTab === 'live' && (
          <main className="h-full p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
            
            {/* Column 1: Config & Controls */}
            <div className="lg:col-span-1 h-full overflow-y-auto custom-scroll pr-1 pb-6 space-y-6">
              
              {/* Lobby setup (if no room joined, or room is waiting) */}
              {!room ? (
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream border-b border-muffin-brown/10 pb-2 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-muffin-gold" />
                    <span>Lobby Room Creator</span>
                  </h2>
                  <div className="space-y-4 font-semibold text-xs text-left">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 block">1. Session Title / Section Name</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        placeholder="e.g. MBA Section 102 Assembly"
                        className="w-full bg-white dark:bg-zinc-900 border border-muffin-brown/20 p-2.5 font-mono text-xs rounded outline-none focus:border-muffin-gold text-dynamic-text"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 block">2. Select Scenario Calibrator</label>
                      <select
                        value={selectedScenarioId}
                        onChange={e => {
                          setSelectedScenarioId(e.target.value);
                          const sc = scenarios.find(s => s.id === e.target.value);
                          if (sc) {
                            setRoomDifficulty(sc.difficulty);
                            setRoomTickRate(sc.tickRate);
                            setRoomMaxDays(sc.maxDays);
                          }
                        }}
                        className="w-full bg-white dark:bg-zinc-900 border border-muffin-brown/20 p-2.5 font-mono text-xs rounded outline-none focus:border-muffin-gold text-dynamic-text"
                      >
                        <option value="">Choose Scenario Configuration</option>
                        {scenarios.map(sc => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name} ({sc.maxDays} Days)
                          </option>
                        ))}
                      </select>
                    </div>

                    {!selectedScenarioId && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-500 block">Difficulty</label>
                          <select
                            value={roomDifficulty}
                            onChange={e => setRoomDifficulty(e.target.value as any)}
                            className="w-full bg-white dark:bg-zinc-900 border border-muffin-brown/20 p-1.5 font-mono text-[10px] rounded"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-500 block">Speed (s/day)</label>
                          <input
                            type="number"
                            value={roomTickRate}
                            onChange={e => setRoomTickRate(Math.max(1, parseInt(e.target.value) || 8))}
                            className="w-full bg-white dark:bg-zinc-900 border border-muffin-brown/20 p-1.5 font-mono text-[10px] rounded"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-gray-500 block">Days Limit</label>
                          <input
                            type="number"
                            value={roomMaxDays}
                            onChange={e => setRoomMaxDays(Math.max(1, parseInt(e.target.value) || 30))}
                            className="w-full bg-white dark:bg-zinc-900 border border-muffin-brown/20 p-1.5 font-mono text-[10px] rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleInitializeLobby}
                    className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black uppercase text-xs tracking-wider rounded-xl border-b-4 border-emerald-950 shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 active:border-b transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Initialize Classroom Lobby</span>
                  </button>
                </section>
              ) : room.status === 'configuring' ? (
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream border-b border-muffin-brown/10 pb-2">
                    Lobby Room Setup
                  </h2>
                  <div className="space-y-4 font-semibold text-xs text-left">
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">SESSION TITLE</span>
                      <span className="font-sans font-black text-xs text-dynamic-text block truncate mt-0.5">{room.name}</span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">ROOM CODE</span>
                      <span className="font-mono font-black text-lg text-muffin-gold block mt-0.5 tracking-wider uppercase">{room.code}</span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10 grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[8px] uppercase text-gray-400 block font-bold">DIFFICULTY</span>
                        <span className="font-mono font-black text-xs text-dynamic-text block mt-0.5 uppercase">{room.difficulty}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase text-gray-400 block font-bold">DAYS LIMIT</span>
                        <span className="font-mono font-black text-xs text-dynamic-text block mt-0.5">{room.maxDays} Days</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase text-gray-400 block font-bold">SPEED</span>
                        <span className="font-mono font-black text-xs text-dynamic-text block mt-0.5">{room.tickRate}s/day</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { playTone(587.33, 'triangle', 0.1); instructorControl('start'); }}
                    className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black uppercase text-xs tracking-wider rounded-xl border-b-4 border-emerald-950 shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 active:border-b transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Simulation Line</span>
                  </button>
                  <button
                    onClick={() => { playTone(220, 'sine', 0.05); deleteRoom(room.id); }}
                    className="w-full py-2 border border-red-500/30 text-red-500 hover:bg-red-500/5 rounded-xl text-[10px] font-black uppercase transition-all"
                  >
                    Terminate Session Lobby
                  </button>
                </section>
              ) : (
                // Active Room Panel
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream border-b border-muffin-brown/10 pb-2">
                    Active Operations Room
                  </h2>
                  <div className="grid grid-cols-2 gap-3.5 text-left">
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">SESSION TITLE</span>
                      <span className="font-sans font-black text-xs text-dynamic-text block truncate mt-0.5">{room.name}</span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">ROOM CODE</span>
                      <span className="font-mono font-black text-xs text-muffin-gold block truncate mt-0.5 tracking-widest uppercase">{room.code}</span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">SIMULATED TIME</span>
                      <span className="font-mono font-black text-base text-emerald-600 block mt-0.5">
                        Day {Math.min(room.currentDay, room.maxDays)} <span className="text-[10px] text-gray-400 font-normal">/ {room.maxDays}</span>
                      </span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">HOURS COMPLETED</span>
                      <span className="font-mono font-black text-base text-dynamic-text block mt-0.5">
                        {(room.currentDay * 24).toLocaleString()} hrs
                      </span>
                    </div>
                    <div className="bg-zinc-950/5 dark:bg-white/5 p-3 rounded-xl border border-muffin-brown/10 col-span-2">
                      <span className="text-[8px] uppercase text-gray-400 block font-bold">DAY PROGRESS</span>
                      <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {secondsRemaining !== null ? `${secondsRemaining}s remaining until next day` : "Paused / Manual advancement"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl flex items-center justify-between text-left">
                    <div>
                      <span className="text-[8px] font-mono text-gray-400 block font-bold uppercase">Realtime Elapsed Clock</span>
                      <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{elapsedTime}</span>
                    </div>
                    <Clock className="w-5.5 h-5.5 text-emerald-500/40" />
                  </div>

                  <div className="space-y-2 border-t border-muffin-brown/10 pt-4 text-left">
                    <span className="text-[9.5px] font-mono uppercase font-bold text-gray-400 block">Supervisor override console</span>
                    <div className="grid grid-cols-2 gap-2">
                      {room.status === 'paused' ? (
                        <button
                          onClick={() => { playTone(260, 'sine', 0.05); instructorControl('resume'); }}
                          className="py-2 px-3 bg-amber-600 text-white border border-amber-700 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer active:scale-95 animate-pulse"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Resume Arena</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => { playTone(260, 'sine', 0.05); instructorControl('pause'); }}
                          className="py-2 px-3 bg-zinc-950/5 dark:bg-white/5 border border-muffin-brown/25 text-dynamic-text hover:bg-zinc-950/10 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer active:scale-95"
                        >
                          <Pause className="w-3 h-3 fill-current" />
                          <span>Pause Arena</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          playTone(220, 'sawtooth', 0.2);
                          if (confirm('Are you sure you want to terminate this simulation session? All student controls will lock.')) {
                            instructorControl('end');
                            exitRoom();
                          }
                        }}
                        className="py-2 px-3 bg-red-650 hover:bg-red-700 text-white border border-red-750 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>End Session</span>
                      </button>
                    </div>
                  </div>

                  {room.status === 'paused' && (
                    <button
                      onClick={() => { playTone(587.33, 'triangle', 0.1); instructorControl('step'); }}
                      className="w-full py-3.5 flex items-center justify-center gap-1.5 font-sans font-black uppercase text-xs tracking-widest rounded-xl border-b-4 bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-900 active:border-b shadow-md active:translate-y-0.5 transition-all select-none cursor-pointer"
                    >
                      <StepForward className="w-4 h-4" />
                      <span>Advance Daily Cycle</span>
                    </button>
                  )}

                  <div className="pt-3 border-t border-muffin-brown/10">
                    <button
                      onClick={() => { playTone(587.33, 'triangle', 0.1); instructorControl('relief_credits'); }}
                      className="w-full py-2 border border-dashed border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      🎁 Dispatch +2,000 U Raw Flour relief credits (all teams)
                    </button>
                  </div>
                </section>
              )}

              {/* Crew Safeguard Guardrails (only if room active) */}
              {room && room.status !== 'configuring' && (
                <section className="bcard space-y-4">
                  <div className="flex items-center justify-between border-b border-muffin-brown/10 pb-2">
                    <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-emerald-600" />
                      <span>Crew Safeguard Guardrails</span>
                    </h2>
                    <button
                      onClick={() => { playTone(523, 'sine', 0.05); setSoundEnabled(!soundEnabled); }}
                      className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                        soundEnabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-zinc-900/5 dark:bg-white/5 border-muffin-brown/10 text-gray-400"
                      }`}
                      title={soundEnabled ? "Audible warning sound active" : "Warning sound muted"}
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="space-y-4 text-[11px] font-sans text-left">
                    <div className="space-y-1.5 p-2.5 rounded-xl border border-muffin-brown/15 bg-zinc-950/5 dark:bg-white/5">
                      <div className="flex justify-between items-center">
                        <label className="font-bold uppercase text-[9.5px] text-dynamic-text flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={safeguards.cashEnabled}
                            onChange={e => setSafeguards(prev => ({ ...prev, cashEnabled: e.target.checked }))}
                            className="rounded border-muffin-brown/30 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Total Cash Limit</span>
                        </label>
                        <span className="font-mono font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[10px]">
                          ₹{safeguards.cashMin.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Alarm if team capital falls below boundary.</p>
                      <input
                        type="range"
                        min={20000}
                        max={150000}
                        step={10000}
                        disabled={!safeguards.cashEnabled}
                        value={safeguards.cashMin}
                        onChange={e => setSafeguards(prev => ({ ...prev, cashMin: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40"
                      />
                    </div>

                    <div className="space-y-1.5 p-2.5 rounded-xl border border-muffin-brown/15 bg-zinc-950/5 dark:bg-white/5">
                      <div className="flex justify-between items-center">
                        <label className="font-bold uppercase text-[9.5px] text-dynamic-text flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={safeguards.satisfactionEnabled}
                            onChange={e => setSafeguards(prev => ({ ...prev, satisfactionEnabled: e.target.checked }))}
                            className="rounded border-muffin-brown/30 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Customer Sat. Level</span>
                        </label>
                        <span className="font-mono font-black text-orange-500 bg-orange-500/10 border border-orange-500/25 px-1.5 py-0.5 rounded text-[10px]">
                          {safeguards.satisfactionMin}%
                        </span>
                      </div>
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Alarm if customer satisfaction breaches boundary.</p>
                      <input
                        type="range"
                        min={50}
                        max={100}
                        step={5}
                        disabled={!safeguards.satisfactionEnabled}
                        value={safeguards.satisfactionMin}
                        onChange={e => setSafeguards(prev => ({ ...prev, satisfactionMin: parseInt(e.target.value) }))}
                        className="w-full accent-emerald-600 cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {anyBreach ? (
                    <div className="border border-red-500/20 bg-red-500/10 p-3 rounded-xl space-y-1.5 text-left">
                      <div className="flex items-center gap-1.5 font-sans font-black uppercase text-[9px] tracking-wider text-red-700 leading-none">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                        <span>Safeguard alarm breaches detected:</span>
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto custom-scroll pr-1">
                        {instructorTeams.map(t => {
                          const breaches = getSafeguardBreaches(t);
                          if (breaches.length === 0) return null;
                          return (
                            <div key={t.id} className="text-[9px] uppercase font-bold border-b border-muffin-brown/5 pb-1 last:border-0">
                              <span className="text-dynamic-text block font-black">{t.name}:</span>
                              <ul className="list-disc list-inside mt-0.5 text-[8.5px] text-red-650 font-mono space-y-0.5 leading-snug">
                                {breaches.map((b, bidx) => (
                                  <li key={bidx} className="font-semibold">{b.message}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-emerald-500/20 bg-emerald-500/10 p-2.5 rounded-xl text-center font-mono font-black text-[9px] text-emerald-600 dark:text-emerald-400 uppercase">
                      🟢 Lobbies comply with active safeguards
                    </div>
                  )}
                </section>
              )}

              {/* Economics Disruptions Suite (only if room active) */}
              {room && room.status !== 'configuring' && (
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream flex items-center gap-1.5 border-b border-muffin-brown/10 pb-2 text-left">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Economics Disruptions Suite</span>
                  </h2>

                  <div className="space-y-4 pt-3 text-left">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-gray-500 block">1. Select Disruption Category</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => { playTone(330, 'sine', 0.04); setDisruptionType('demand_surge'); }}
                          className={`py-2 px-1 text-center font-bold text-[9px] uppercase border transition-all rounded-lg cursor-pointer ${
                            disruptionType === 'demand_surge' ? 'bg-[#2D4A6B] text-white border-black shadow-inner' : 'bg-white border-muffin-brown/20 text-[#333] hover:bg-gray-50'
                          }`}
                        >
                          📈 Demand Surge
                        </button>
                        <button
                          onClick={() => { playTone(330, 'sine', 0.04); setDisruptionType('material_shortage'); }}
                          className={`py-2 px-1 text-center font-bold text-[9px] uppercase border transition-all rounded-lg cursor-pointer ${
                            disruptionType === 'material_shortage' ? 'bg-[#2D4A6B] text-white border-black shadow-inner' : 'bg-white border-muffin-brown/20 text-[#333] hover:bg-gray-50'
                          }`}
                        >
                          🛑 Cost Spike
                        </button>
                        <button
                          onClick={() => { playTone(330, 'sine', 0.04); setDisruptionType('machine_breakdown'); }}
                          className={`py-2 px-1 text-center font-bold text-[9px] uppercase border transition-all rounded-lg cursor-pointer ${
                            disruptionType === 'machine_breakdown' ? 'bg-[#2D4A6B] text-white border-black shadow-inner' : 'bg-white border-muffin-brown/20 text-[#333] hover:bg-gray-50'
                          }`}
                        >
                          💥 Oven Breakdown
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-gray-500 block">2. Severity Magnitude</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['low', 'medium', 'high'] as const).map(sev => (
                          <button
                            key={sev}
                            onClick={() => { playTone(290, 'sine', 0.04); setDisruptionSeverity(sev); }}
                            className={`py-1.5 font-bold uppercase text-[9px] border transition-all rounded-lg cursor-pointer ${
                              disruptionSeverity === sev ? 'bg-amber-600 text-white border-amber-800 shadow-inner' : 'bg-white border-muffin-brown/20 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-zinc-950/5 dark:bg-white/5 border border-muffin-brown/15 p-2.5 rounded-xl text-[8.5px]/snug uppercase font-mono tracking-tight font-black">
                      <span className="text-gray-500 block mb-1">🔍 PREVIEW DISRUPTION MATRIX:</span>
                      {disruptionType === 'demand_surge' && (
                        <div className="text-blue-800 dark:text-blue-300 font-extrabold">
                          Surge Demand Volume: +{disruptionSeverity === 'low' ? '30%' : disruptionSeverity === 'medium' ? '60%' : '100%'} Walk-in orders!
                        </div>
                      )}
                      {disruptionType === 'material_shortage' && (
                        <div className="text-red-750 dark:text-red-400 font-extrabold">
                          Ingredients Cost Index: +{disruptionSeverity === 'low' ? '45%' : disruptionSeverity === 'medium' ? '90%' : '150%'} flour markup!
                        </div>
                      )}
                      {disruptionType === 'machine_breakdown' && (
                        <div className="text-amber-700 dark:text-amber-400 font-extrabold">
                          Baking line breakdown risk: Double failure probability for 5 simulated days!
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleInjectDisruption}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-muffin-espresso font-sans font-black uppercase tracking-widest text-xs py-3 rounded-xl border-b-4 border-amber-800 shadow-md select-none cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 active:border-b transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Inject Disruption Shock</span>
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Column 2 & 3: Student Cohorts Ledger */}
            <div className="lg:col-span-2 h-full overflow-y-auto custom-scroll pr-1 pb-6 space-y-6">
              
              {room && (
                <section className="bcard space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-muffin-brown/10 pb-3 gap-3 text-left">
                    <div className="space-y-0.5">
                      <h2 className="font-sans font-black text-sm uppercase tracking-wider text-muffin-brown dark:text-muffin-cream">
                        Registered Student Cohorts Ledger
                      </h2>
                      <p className="text-[9px] uppercase font-mono font-bold text-gray-500">
                        Currently active: {instructorTeams.length} teams
                      </p>
                    </div>
                    {room.status !== 'configuring' && instructorTeams.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 border-b-4 border-emerald-950 shadow-md rounded-xl transition-all select-none cursor-pointer active:translate-y-0.5 active:border-b"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export Simulation grading Sheet (CSV)</span>
                      </button>
                    )}
                  </div>

                  {instructorTeams.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-950/5 dark:bg-white/5 rounded-2xl border border-dashed border-muffin-brown/25">
                      <span className="text-6xl block animate-bounce mb-4">🧁</span>
                      <p className="text-[10px] font-mono font-black uppercase text-gray-400 tracking-widest leading-relaxed">
                        Waiting for students to connect to factory floor...
                        <br />
                        <span className="text-slate-700 bg-muffin-gold/15 border border-muffin-gold/30 px-3 py-1.5 text-[14px] rounded-xl mt-3.5 inline-block font-sans lowercase">
                          Provide code: <span className="font-mono uppercase font-black tracking-normal text-muffin-brown dark:text-muffin-cream">{room.code}</span>
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-muffin-brown/15">
                      <table className="w-full text-left border-collapse font-sans text-xs">
                        <thead>
                          <tr className="bg-[#2D4A6B]/15 text-[#2d4a6b] font-black uppercase tracking-wider border-b border-muffin-brown/15 select-none">
                            <th className="p-3 text-center">Rank</th>
                            <th className="p-3">Team Name</th>
                            <th className="p-3">Total Cash (INR)</th>
                            <th className="p-3">Muffin Stock</th>
                            <th className="p-3">Satisfaction</th>
                            <th className="p-3 text-right pr-4">Admin Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muffin-brown/10 font-bold uppercase text-slate-700 dark:text-zinc-300">
                          {[...instructorTeams]
                            .sort((a, b) => b.cash - a.cash)
                            .map((team, idx) => {
                              const breaches = getSafeguardBreaches(team);
                              const hasCashBreach = breaches.some(b => b.type === 'cash');
                              const hasSatBreach = breaches.some(b => b.type === 'sat');
                              const stars = calculateStars(team.cash, room?.scenarioId ? scenarios.find(s => s.id === room.scenarioId)?.starsThresholds : undefined);
                              
                              return (
                                <tr key={team.id} className={`transition-colors duration-200 ${breaches.length > 0 ? "bg-red-500/10 border-l-4 border-red-500" : "hover:bg-zinc-950/5 dark:hover:bg-white/5"}`}>
                                  <td className="p-3 font-mono font-black text-center text-slate-500 w-14">#{idx + 1}</td>
                                  <td className="p-3 text-left">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-dynamic-text block text-sm tracking-tight">{team.name}</span>
                                        {breaches.length > 0 && (
                                          <span className="inline-flex bg-red-650 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse leading-none border border-red-800">
                                            Safeguard Alert
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-0.5">
                                        {Array.from({ length: 3 }).map((_, sidx) => (
                                          <span key={sidx} className={`text-xs ${sidx < stars ? "text-yellow-500 font-extrabold" : "text-gray-300"}`}>⭐</span>
                                        ))}
                                      </div>
                                      {breaches.length > 0 && (
                                        <div className="space-y-0.5 mt-1 border-t border-red-500/10 pt-1">
                                          {breaches.map((b, bidx) => (
                                            <div key={bidx} className="text-[7.5px] font-mono font-bold text-red-600 dark:text-red-400 tracking-wide flex items-center gap-1 lowercase">
                                              <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                                              <span>{b.message}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className={`p-3 font-mono font-black text-[12.5px] transition-all duration-300 ${hasCashBreach ? "text-red-600 bg-red-500/15 rounded-lg border border-red-500/20 font-black animate-pulse" : "text-emerald-600"}`}>
                                    ₹{team.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 font-mono font-extrabold text-dynamic-text/80">
                                    {(team.inventory?.finished_muffin?.onHand ?? 0).toLocaleString()} un
                                  </td>
                                  <td className={`p-3 font-mono font-black transition-all duration-300 ${hasSatBreach ? "text-red-600 bg-red-500/15 rounded-lg border border-red-500/20 font-black animate-pulse" : "text-orange-500"}`}>
                                    {team.report?.fillRate ?? 100}% CSAT
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex gap-2.5 justify-end">
                                      <button
                                        onClick={() => { playTone(440, 'sine', 0.05); handleOpenIntervene(team); }}
                                        className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg border border-[#3c3c3a] text-[9px] font-black uppercase inline-flex items-center gap-1 cursor-pointer select-none transition-all active:scale-95 shadow-xs"
                                      >
                                        <Settings className="w-3 h-3" />
                                        <span>Inspect / Intervene</span>
                                      </button>
                                      <button
                                        onClick={() => handleDownloadLedger(team.id, team.name)}
                                        className="p-1.5 bg-zinc-950/5 dark:bg-white/5 text-emerald-600 hover:text-emerald-700 border border-muffin-brown/25 rounded-lg hover:bg-zinc-950/10 cursor-pointer"
                                        title="Download team ledger report"
                                      >
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleKickTeam(team.id, team.name)}
                                        className="p-1.5 bg-red-500/5 text-red-650 hover:text-white hover:bg-red-650 border border-red-500/20 rounded-lg cursor-pointer"
                                        title="Kick from session room"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* Lobbies grid list (when not in a room) */}
              {!room && (
                <section className="bcard space-y-4">
                  <h2 className="font-sans font-black text-xs uppercase tracking-wider text-muffin-brown dark:text-muffin-cream border-b border-muffin-brown/10 pb-2 text-left">
                    Existing Active Session Rooms
                  </h2>
                  {roomsList.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-mono text-xs italic">
                      No active sessions found. Initialize one using the lobby creator.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roomsList.map(r => (
                        <div key={r.id} className="border border-muffin-brown/15 p-4 rounded-xl bg-zinc-950/5 dark:bg-white/5 flex flex-col justify-between space-y-3">
                          <div className="text-left space-y-1">
                            <div className="flex justify-between items-start">
                              <h3 className="font-sans font-black text-sm text-dynamic-text truncate uppercase">{r.name}</h3>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                r.difficulty === 'beginner' ? 'bg-green-150 text-green-700 border border-green-300' :
                                r.difficulty === 'intermediate' ? 'bg-orange-150 text-orange-700 border border-orange-300' :
                                'bg-red-150 text-red-700 border border-red-300'
                              }`}>
                                {r.difficulty}
                              </span>
                            </div>
                            <div className="font-mono text-[10px] text-gray-500 space-y-0.5">
                              <div>Day: <span className="font-bold text-dynamic-text">{r.currentDay} / {r.maxDays}</span></div>
                              <div>Tick speed: <span className="font-bold text-dynamic-text">{r.tickRate}s/day</span></div>
                              <div>Status: <span className="font-bold text-emerald-600 uppercase">{r.status}</span></div>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-2 border-t border-muffin-brown/10">
                            <button
                              onClick={() => { playTone(587.33, 'triangle', 0.1); joinRoom(r.code); }}
                              className="px-3 py-1 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Monitor Room [{r.code}]</span>
                            </button>
                            <button
                              onClick={() => { playTone(220, 'sawtooth', 0.1); deleteRoom(r.id); }}
                              className="p-1 bg-red-500/5 text-red-650 hover:bg-red-650 hover:text-white border border-red-500/10 rounded-lg cursor-pointer"
                              title="Delete Session"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </main>
        )}

        {/* Tab 2: Experience Presets */}
        {activeTab === 'scenarios' && (
          <main className="h-full p-6 max-w-[1200px] mx-auto overflow-y-auto custom-scroll pb-16 space-y-6 animate-fade-in">
            <section className="bcard space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-muffin-brown/10 pb-3 gap-3 text-left">
                <div className="space-y-0.5">
                  <h2 className="font-sans font-black text-lg text-dynamic-text uppercase tracking-tight">
                    Active Scenarios Catalog
                  </h2>
                  <p className="text-[10px] uppercase font-mono font-bold text-gray-500">
                    Configure parameters and launch specialized class runs
                  </p>
                </div>
                <button
                  onClick={() => openScenarioWizard(null)}
                  className="flex items-center gap-1.5 bg-[#2D4A6B] text-white hover:bg-[#34557b] px-4 py-2 border-b-4 border-slate-900 rounded-xl font-black text-xs uppercase transition-all shadow-md select-none cursor-pointer active:translate-y-0.5 active:border-b"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Custom Scenario</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-left">
                {presets.concat(customScenarios).map((sc, scidx) => {
                  const isPreset = scidx < presets.length;
                  return (
                    <div key={sc.id} className="border border-muffin-brown/15 hover:border-muffin-gold/60 p-5 rounded-2xl bg-zinc-950/5 dark:bg-white/5 space-y-4 relative overflow-hidden transition-all duration-300">
                      <div className="absolute top-0 right-0 px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider rounded-bl bg-muffin-brown/10 text-muffin-brown dark:text-muffin-cream shadow-xs">
                        {isPreset ? "🎯 PRESET STANDARD" : "🛡️ CUSTOM"}
                      </div>
                      <div className="space-y-1 text-left">
                        <h3 className="font-sans font-black text-sm text-dynamic-text uppercase tracking-tight">{sc.name}</h3>
                        <p className="text-[11.5px] text-dynamic-text/70 leading-relaxed font-serif italic">
                          "{sc.description || sc.learningObjective}"
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 font-mono text-[9px] uppercase tracking-wider font-extrabold text-dynamic-text/70 bg-white dark:bg-zinc-950 border border-muffin-brown/15 p-3 rounded-xl">
                        <div>
                          <span className="text-[7.5px] block font-bold text-gray-400 leading-none mb-1">TIMELINE DAYS</span>
                          <span className="text-xs text-[#2D4A6B] dark:text-[#5c8dbe] font-bold">{sc.maxDays} Days</span>
                        </div>
                        <div>
                          <span className="text-[7.5px] block font-bold text-gray-400 leading-none mb-1">REAL TIME LIMIT</span>
                          <span className="text-xs text-[#2D4A6B] dark:text-[#5c8dbe] font-bold">
                            {Math.round((sc.maxDays * sc.tickRate) / 60) || 15} Mins
                          </span>
                        </div>
                        <div>
                          <span className="text-[7.5px] block font-bold text-gray-400 leading-none mb-1">ORDER COST (S)</span>
                          <span className="text-xs text-[#2D4A6B] dark:text-[#5c8dbe] font-bold">
                            ₹{(sc.rawMaterialCosts?.orderCost ?? 150).toLocaleString()} setup
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-2 border-t border-muffin-brown/10">
                        <button
                          onClick={() => handleDuplicateScenario(sc)}
                          className="p-1.5 px-3 border border-muffin-brown/20 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 text-[9px] font-black uppercase transition-all cursor-pointer select-none active:scale-95 text-dynamic-text"
                        >
                          Copy Preset
                        </button>
                        {!isPreset && (
                          <>
                            <button
                              onClick={() => openScenarioWizard(sc)}
                              className="p-1.5 px-3 border border-[#2D4A6B] text-[#2D4A6B] dark:text-[#5c8dbe] rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 text-[9px] font-black uppercase transition-all cursor-pointer select-none active:scale-95"
                            >
                              Edit Config
                            </button>
                            <button
                              onClick={() => handleDeleteScenario(sc.id, sc.name)}
                              className="p-2 bg-red-500/5 border border-red-500/20 rounded-lg text-red-650 hover:bg-red-650 hover:text-white cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>
        )}
      </div>

      {/* Projector Board Leaderboard Overlay Modal */}
      {projectorOpen && (
        <div className="fixed inset-0 bg-[#0d0c0a] z-[1000] flex flex-col p-8 overflow-hidden select-none">
          <div className="absolute inset-0 bg-[radial-gradient(#f7f0e6_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none"></div>
          
          <div className="flex justify-between items-center border-b-2 border-muffin-brown/15 pb-4 mb-6">
            <div className="flex items-center gap-4 text-left">
              <span className="text-4xl">🏆</span>
              <div>
                <h2 className="font-serif italic text-3xl text-muffin-gold uppercase tracking-wide leading-none">
                  Muffin Factory Cohorts Leaderboard
                </h2>
                <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500 mt-1 block">
                  Live Corporate Net treasury Liquidity rankings
                </span>
              </div>
            </div>
            <button
              onClick={() => { playTone(200, 'sine', 0.05); setProjectorOpen(false); }}
              className="bg-zinc-900 border border-zinc-750 text-white hover:text-muffin-gold font-mono font-black px-4 py-2 rounded-xl text-xs cursor-pointer active:scale-95 shadow-md transition-all"
            >
              Exit Projector Board
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-4">
            {[...instructorTeams]
              .sort((a, b) => b.cash - a.cash)
              .map((team, idx) => {
                const stars = calculateStars(team.cash, room?.scenarioId ? scenarios.find(s => s.id === room.scenarioId)?.starsThresholds : undefined);
                
                return (
                  <div
                    key={team.id}
                    className="bg-zinc-900/90 border border-white/5 p-5 rounded-2xl flex items-center justify-between shadow-lg hover:border-muffin-gold/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-6 text-left">
                      <span className="font-mono font-black text-4xl text-gray-600 w-16">
                        #{idx + 1}
                      </span>
                      <div className="space-y-1">
                        <span className="font-sans font-black text-2xl text-white block tracking-tight">
                          {team.name}
                        </span>
                        <div className="flex gap-1">
                          {Array.from({ length: 3 }).map((_, sidx) => (
                            <span key={sidx} className={`text-xl ${sidx < stars ? "text-yellow-500 font-extrabold" : "text-gray-700"}`}>⭐</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="font-mono font-black text-3xl text-emerald-400 block">
                        ₹{team.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="font-mono text-xs text-gray-500 uppercase tracking-widest font-extrabold">
                        {team.report?.fillRate ?? 100}% customer satisfaction
                      </div>
                    </div>
                  </div>
                );
              })}

            {instructorTeams.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <span className="text-8xl animate-bounce mb-6">🧁</span>
                <span className="font-mono text-sm uppercase tracking-widest font-bold">
                  No active crews currently registered in room: {room?.code}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspect / Intervene override Modal */}
      {inspectedTeam && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 text-[#120d07]">
          <div className="bg-[#f7f0e6] border-4 border-muffin-brown max-w-md w-full p-6 shadow-2xl relative rounded-2xl text-left">
            <div className="absolute inset-0 bg-[radial-gradient(#120d07_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none"></div>
            
            <button
              onClick={() => { playTone(200, 'sine', 0.05); setInspectedTeam(null); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black font-black cursor-pointer text-sm font-sans z-[100] border-none bg-transparent hover:scale-110 duration-200 transition-all select-none"
            >
              ✕
            </button>

            <div className="border-b border-muffin-brown/15 pb-2 mb-4">
              <h3 className="font-sans font-black text-sm uppercase text-[#2c1a0a] tracking-wide flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-muffin-gold" />
                <span>Intervene Team Operations</span>
              </h3>
              <span className="font-mono text-[8px] uppercase tracking-wider text-muffin-gold block mt-0.5">
                Override operational values: {inspectedTeam.name}
              </span>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-gray-500 block">Ledger Cash Treasury (₹)</label>
                  <input
                    type="number"
                    value={overrideCash}
                    onChange={e => setOverrideCash(e.target.value)}
                    className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-gray-500 block">Silo Stock Flour (un)</label>
                  <input
                    type="number"
                    value={overrideFlour}
                    onChange={e => setOverrideFlour(e.target.value)}
                    className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-gray-500 block">Safety Order Size Q</label>
                  <input
                    type="number"
                    value={overrideQ}
                    onChange={e => setOverrideQ(e.target.value)}
                    className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-gray-500 block">Reorder trigger Point R</label>
                  <input
                    type="number"
                    value={overrideR}
                    onChange={e => setOverrideR(e.target.value)}
                    className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3.5 mt-6 pt-3 border-t border-muffin-brown/15 z-50 relative">
              <button
                onClick={() => { playTone(200, 'sine', 0.05); setInspectedTeam(null); }}
                className="px-4 py-2 border border-muffin-brown/30 text-[#6b4e30] font-sans font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverride}
                className="px-5 py-2 bg-[#2c1a0a] text-[#f7f0e6] font-sans font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-slate-900 shadow-md border-b-2 border-black transition-all cursor-pointer"
              >
                💾 Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 text-[#120d07]">
          <div className="bg-[#f7f0e6] border-4 border-muffin-brown max-w-2xl w-full p-6 shadow-2xl relative rounded-2xl text-left">
            <div className="absolute inset-0 bg-[radial-gradient(#120d07_0.15px,transparent_1px)] [background-size:12px_12px] opacity-[0.03] pointer-events-none"></div>
            
            <button
              onClick={() => { playTone(200, 'sine', 0.05); setWizardOpen(false); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black font-black cursor-pointer text-sm font-sans z-[100] border-none bg-transparent hover:scale-110 duration-200 transition-all select-none"
            >
              ✕
            </button>

            <div className="border-b border-muffin-brown/15 pb-2 mb-4 flex justify-between items-end">
              <div className="space-y-0.5">
                <h3 className="font-sans font-black text-sm uppercase text-[#2c1a0a] tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-muffin-gold animate-spin" />
                  <span>Custom Scenario Wizard</span>
                </h3>
                <span className="font-mono text-[8px] uppercase tracking-wider text-muffin-gold block">
                  Experience calibrations and starting configurations
                </span>
              </div>
              <div className="font-mono text-[10px] font-black bg-muffin-gold/15 border border-muffin-gold/30 px-2 py-0.5 rounded text-muffin-brown select-none">
                Step {wizardStep} / 6
              </div>
            </div>

            <div className="w-full bg-[#deccb0] h-1.5 rounded-full overflow-hidden mb-5">
              <div className="bg-muffin-gold h-full duration-300 transition-all" style={{ width: `${(wizardStep / 6) * 100}%` }}></div>
            </div>

            {/* Step Content */}
            <div className="min-h-[250px] py-1">
              
              {/* Step 1: Metadata */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                  <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">
                    Step 1: Experience Metadata & Chronology
                  </h4>
                  <div className="grid grid-cols-2 gap-4 font-semibold text-xs text-[#2c1a0a]">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold block">Scenario Title</label>
                      <input
                        type="text"
                        value={scName}
                        onChange={e => setScName(e.target.value)}
                        className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold block">Description Brief</label>
                      <input
                        type="text"
                        value={scDesc}
                        onChange={e => setScDesc(e.target.value)}
                        className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold block">Simulated Days Length</label>
                      <input
                        type="number"
                        value={scMaxDays}
                        onChange={e => setScMaxDays(parseInt(e.target.value) || 30)}
                        className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold block">Real Time session duration (Minutes)</label>
                      <input
                        type="number"
                        value={scRealTime}
                        onChange={e => setScRealTime(parseInt(e.target.value) || 15)}
                        className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold block">Raw materials Purchase cost (₹)</label>
                      <input
                        type="number"
                        value={scBaseMixCost}
                        onChange={e => setScBaseMixCost(parseFloat(e.target.value) || 5.0)}
                        className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold block">Retail Sales Value (₹)</label>
                      <input
                        type="number"
                        value={scSellingPrice}
                        onChange={e => setScSellingPrice(parseFloat(e.target.value) || 20.0)}
                        className="w-full p-2 bg-white border border-muffin-brown/20 rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Wholesale Contracts */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-[fadeIn_0.3s_ease-out] text-xs text-[#2c1a0a]">
                  <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">
                    Step 2: Calibrate wholesale contracts
                  </h4>
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block">Custom Scenario Wholesale Contracts:</span>
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scroll">
                      {scContracts.map((c, cidx) => (
                        <div key={c.id} className="flex justify-between items-center bg-white border border-muffin-brown/15 p-2 rounded-lg font-mono text-[9px] font-bold">
                          <span>"{c.name}" Distributor: Demand {c.dailyDemand} un/day from Day {c.beginsAtDay}-{c.endsAtDay}</span>
                          <button
                            type="button"
                            onClick={() => setScContracts(scContracts.filter((_, idx) => idx !== cidx))}
                            className="text-red-650 cursor-pointer font-sans"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                      {scContracts.length === 0 && (
                        <p className="text-gray-400 italic">No custom wholesale contracts configured yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="border border-muffin-brown/15 p-3 rounded-xl bg-zinc-950/5 grid grid-cols-3 gap-2 font-semibold">
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase text-gray-500 block">Name</label>
                      <input type="text" value={newConName} onChange={e => setNewConName(e.target.value)} className="w-full bg-white border p-1" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase text-gray-500 block">Demand</label>
                      <input type="number" value={newConDemand} onChange={e => setNewConDemand(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase text-gray-500 block">Rate (₹)</label>
                      <input type="number" value={newConRate} onChange={e => setNewConRate(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase text-gray-500 block">Start Day</label>
                      <input type="number" value={newConStart} onChange={e => setNewConStart(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase text-gray-500 block">End Day</label>
                      <input type="number" value={newConEnd} onChange={e => setNewConEnd(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] uppercase text-gray-500 block">Penalties (₹)</label>
                      <input type="number" value={newConPenalty} onChange={e => setNewConPenalty(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newConName) return;
                        setScContracts([...scContracts, {
                          id: `contract_${Date.now()}`,
                          name: newConName,
                          beginsAtDay: newConStart,
                          endsAtDay: newConEnd,
                          dailyDemand: newConDemand,
                          pricePerUnit: newConRate,
                          fillRatePenalty: newConPenalty
                        }]);
                        setNewConName('');
                      }}
                      className="w-full col-span-3 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-sans font-black uppercase text-[9px] py-2 text-center border-none shadow-xs select-none cursor-pointer"
                    >
                      ➕ Add Wholesale Contract Offer
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Walk-in Retail Demand */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-[fadeIn_0.3s_ease-out] text-xs text-[#2c1a0a]">
                  <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">
                    Step 3: walk-in retail demand breaking points
                  </h4>
                  <div className="flex justify-between items-center p-2 rounded-lg border border-muffin-brown/15 bg-white">
                    <span className="font-semibold">Activate Poisson Distribution random demand:</span>
                    <button
                      type="button"
                      onClick={() => { playTone(260, 'sine', 0.05); setScPoissonDemand(!scPoissonDemand); }}
                      className={`w-14 py-1.5 rounded font-mono font-black border text-xs text-center transition-all cursor-pointer ${
                        scPoissonDemand ? "bg-emerald-600 text-white border-emerald-800 shadow-sm" : "bg-gray-300 text-gray-800 border-gray-400"
                      }`}
                    >
                      {scPoissonDemand ? "Yes" : "No"}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-gray-500 block">Linear demand breaking points:</span>
                    <div className="space-y-1 max-h-36 overflow-y-auto custom-scroll">
                      {scBreakingPoints.map((bp, bpidx) => (
                        <div key={bpidx} className="flex justify-between items-center bg-white border border-muffin-brown/15 p-2 text-xs rounded-lg font-mono font-bold">
                          <span>Day <span className="font-black text-slate-800">{bp.day}</span> → Demand Volume <span className="font-black text-emerald-650">{bp.demand} Muffins</span></span>
                          <button
                            type="button"
                            onClick={() => setScBreakingPoints(scBreakingPoints.filter((_, idx) => idx !== bpidx))}
                            className="text-red-650 font-sans font-bold uppercase text-[9px] cursor-pointer"
                          >
                            Delete Point
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-muffin-brown/15 p-3 rounded-xl bg-zinc-950/5 grid grid-cols-2 gap-3.5 text-xs font-semibold text-slate-700">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 block">Coordinate Day Offset</label>
                      <input type="number" value={newBpDay} onChange={e => setNewBpDay(parseInt(e.target.value) || 0)} className="w-full bg-white border border-muffin-brown/20 p-1.5" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-500 block">Retail Demand Volume (un)</label>
                      <input type="number" value={newBpDemand} onChange={e => setNewBpDemand(parseInt(e.target.value) || 0)} className="w-full bg-white border border-muffin-brown/20 p-1.5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newPoints = [...scBreakingPoints, { day: newBpDay, demand: newBpDemand }];
                        newPoints.sort((a, b) => a.day - b.day);
                        setScBreakingPoints(newPoints);
                      }}
                      className="w-full col-span-2 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-sans font-black uppercase text-[9px] py-2 text-center border-none shadow-xs"
                    >
                      ➕ Add Coordinate Point
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Initial team starting parameters */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-[fadeIn_0.3s_ease-out] text-[#2c1a0a]">
                  <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">
                    Step 4: Initial team starting parameters
                  </h4>
                  <div className="grid grid-cols-2 gap-4 font-semibold text-xs text-[#2c1a0a]">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Starting Cash per team (₹)</label>
                      <input
                        type="number"
                        value={scStartCash}
                        onChange={e => setScStartCash(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Starting Silo Materials (un)</label>
                      <input
                        type="number"
                        value={scStartMaterials}
                        onChange={e => setScStartMaterials(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Initial Q order size</label>
                      <input
                        type="number"
                        value={scStartQ}
                        onChange={e => setScStartQ(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-gray-400 font-extrabold block">Initial R reorder level</label>
                      <input
                        type="number"
                        value={scStartR}
                        onChange={e => setScStartR(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-muffin-brown/20 p-2.5 rounded font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-muffin-brown/10 text-left">
                    <span className="text-[9.5px] uppercase font-black text-gray-500 block mb-2">Initial Starting machine assets</span>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-slate-700">
                      <div className="bg-red-500/5 p-2 border border-muffin-brown/15 rounded-xl">
                        <label className="text-[8px] uppercase text-red-800 block mb-1">Mixing lines</label>
                        <input type="number" value={scStartMachinesMixing} onChange={e => setScStartMachinesMixing(parseInt(e.target.value) || 1)} className="w-12 bg-white border p-1 text-center text-xs font-mono font-bold" />
                      </div>
                      <div className="bg-amber-500/5 p-2 border border-muffin-brown/15 rounded-xl">
                        <label className="text-[8px] uppercase text-yellow-800 block mb-1">Baking lines</label>
                        <input type="number" value={scStartMachinesBaking} onChange={e => setScStartMachinesBaking(parseInt(e.target.value) || 1)} className="w-12 bg-white border p-1 text-center text-xs font-mono font-bold" />
                      </div>
                      <div className="bg-blue-500/5 p-2 border border-muffin-brown/15 rounded-xl">
                        <label className="text-[8px] uppercase text-blue-800 block mb-1">Icing lines</label>
                        <input type="number" value={scStartMachinesIcing} onChange={e => setScStartMachinesIcing(parseInt(e.target.value) || 1)} className="w-12 bg-white border p-1 text-center text-xs font-mono font-bold" />
                      </div>
                      <div className="bg-emerald-500/5 p-2 border border-muffin-brown/15 rounded-xl">
                        <label className="text-[8px] uppercase text-emerald-800 block mb-1">Packaging lines</label>
                        <input type="number" value={scStartMachinesPackaging} onChange={e => setScStartMachinesPackaging(parseInt(e.target.value) || 1)} className="w-12 bg-white border p-1 text-center text-xs font-mono font-bold" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Capacity speeds & Purchase Costs */}
              {wizardStep === 5 && (
                <div className="space-y-4 animate-[fadeIn_0.3s_ease-out] text-[#2c1a0a]">
                  <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">
                    Step 5: Capacity speeds & Purchase Costs
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-left">
                    <div className="border border-muffin-brown/15 bg-red-500/5 p-2.5 rounded-xl space-y-1">
                      <span className="text-[9px] text-red-800 block font-bold border-b pb-1">🥣 MIX STATION</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Capacity/day</label>
                          <input type="number" value={scMixingCap} onChange={e => setScMixingCap(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Machine cost</label>
                          <input type="number" value={scMixingCost} onChange={e => setScMixingCost(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                      </div>
                    </div>

                    <div className="border border-muffin-brown/15 bg-amber-500/5 p-2.5 rounded-xl space-y-1">
                      <span className="text-[9px] text-yellow-800 block font-bold border-b pb-1">🔥 OVEN STATION</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Capacity/day</label>
                          <input type="number" value={scBakingCap} onChange={e => setScBakingCap(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Machine cost</label>
                          <input type="number" value={scBakingCost} onChange={e => setScBakingCost(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                      </div>
                    </div>

                    <div className="border border-muffin-brown/15 bg-blue-500/5 p-2.5 rounded-xl space-y-1">
                      <span className="text-[9px] text-blue-800 block font-bold border-b pb-1">❄️ ICING STATION</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Capacity/day</label>
                          <input type="number" value={scIcingCap} onChange={e => setScIcingCap(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Machine cost</label>
                          <input type="number" value={scIcingCost} onChange={e => setScIcingCost(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                      </div>
                    </div>

                    <div className="border border-muffin-brown/15 bg-emerald-500/5 p-2.5 rounded-xl space-y-1">
                      <span className="text-[9px] text-emerald-800 block font-bold border-b pb-1">📦 PACKAGING STATION</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Capacity/day</label>
                          <input type="number" value={scPackagingCap} onChange={e => setScPackagingCap(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase text-gray-400 font-bold block">Machine cost</label>
                          <input type="number" value={scPackagingCost} onChange={e => setScPackagingCost(parseInt(e.target.value) || 0)} className="w-full bg-white border p-1 font-mono text-[10px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Star Thresholds */}
              {wizardStep === 6 && (
                <div className="space-y-4 animate-[fadeIn_0.3s_ease-out] text-[#2c1a0a]">
                  <h4 className="font-sans font-black text-[#2c1a0a] text-xs uppercase tracking-wider border-b border-muffin-brown/5 pb-1">
                    Step 6: Stars Achievement thresholds
                  </h4>
                  <p className="text-[10px] text-gray-400 font-serif leading-relaxed uppercase font-bold text-center">
                    Define student grading star ratings based on cumulative total cash.
                  </p>
                  <div className="space-y-4 max-w-sm mx-auto p-4 border border-muffin-brown/15 rounded-xl bg-zinc-950/5 font-semibold text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-500 block">⭐ 1 Star Threshold (₹)</label>
                      <input
                        type="number"
                        value={scStarsThreshold1}
                        onChange={e => setScStarsThreshold1(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-muffin-brown/20 p-2 text-xs font-mono font-black text-[#2c1a0a]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-500 block">⭐⭐ 2 Stars Threshold (₹)</label>
                      <input
                        type="number"
                        value={scStarsThreshold2}
                        onChange={e => setScStarsThreshold2(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-muffin-brown/20 p-2 text-xs font-mono font-black text-[#2c1a0a]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-500 block">⭐⭐⭐ 3 Stars Threshold (₹)</label>
                      <input
                        type="number"
                        value={scStarsThreshold3}
                        onChange={e => setScStarsThreshold3(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-muffin-brown/20 p-2 text-xs font-mono font-black text-[#2c1a0a]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Navigation */}
            <div className="flex justify-between items-center pt-3 border-t border-muffin-brown/15 z-50 relative mt-6">
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => { playTone(260, 'sine', 0.05); setWizardStep(prev => Math.max(1, prev - 1)); }}
                className="px-4 py-2 border border-muffin-brown/30 text-[#6b4e30] font-sans font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer transition-all"
              >
                ← Previous Step
              </button>
              {wizardStep < 6 ? (
                <button
                  type="button"
                  onClick={() => { playTone(260, 'sine', 0.05); setWizardStep(prev => Math.min(6, prev + 1)); }}
                  className="px-5 py-2 bg-[#2c1a0a] text-white rounded-lg font-sans font-black uppercase text-[10px] tracking-wider hover:bg-slate-900 cursor-pointer shadow-md"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveScenario}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-sans font-black uppercase text-xs tracking-wider border-b-4 border-green-950 active:translate-y-0.5 active:border-b shadow-md transition-all cursor-pointer"
                >
                  💾 Save Experience Configuration
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
