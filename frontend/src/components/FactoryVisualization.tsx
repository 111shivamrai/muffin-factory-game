import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';
import { 
  Activity, Wrench, Check, CheckCircle2, AlertTriangle, 
  Package, Zap, Truck, Factory, ShieldAlert
} from 'lucide-react';
import { MachineType } from '../../../backend/src/types/index.js';
import './FactoryVisualization.css';

// Fixed machine positions along the 100% wide factory line
const STAGE_KEYS: MachineType[] = ['mixing', 'baking', 'icing', 'packaging'];

const MACHINE_CONFIG = {
  mixing: { label: 'Mixer', stageTitle: 'MIXER', actionText: 'MIXING', x: 19, width: 14, defaultCap: 100 },
  baking: { label: 'Oven', stageTitle: 'OVEN', actionText: 'BAKING', x: 43, width: 14, defaultCap: 80 },
  icing: { label: 'Icing', stageTitle: 'ICING', actionText: 'ICING', x: 66, width: 14, defaultCap: 120 },
  packaging: { label: 'Packer', stageTitle: 'PACKAGER', actionText: 'SEALING', x: 84, width: 14, defaultCap: 150 },
};

const BELT_CONFIG = {
  beltY: 25,
  intakeX: 7,
  dispatchX: 98,
  productScale: 1,
  labelY: 5,
};

// Asset paths served from /assets/
const ASSET_PATHS = {
  background: '/assets/factory-line-BdY4OmyM.jpg',
  batter: '/assets/muffin-batter-DmbXarR8.png',
  baked: '/assets/muffin-baked-NlulfWT2.png',
  iced: '/assets/muffin-iced-yiK93yI7.png',
  boxed: '/assets/muffin-box-Drc-A_wk.png',
};

// Conveyor product simulation helper
interface ConveyorProduct {
  key: number;
  x: number;
  bottom: number;
  stage: MachineType | null;
  completed: number;
  processing: number;
  image: string;
  resultImage?: string;
  opacity: number;
  conversion: number;
  rise: number;
}

export default function FactoryVisualization() {
  const { teamState, room } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
      room: state.room,
    }))
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(640);

  // ResizeObserver to track container width for scale adjustments
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width || 640);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute live machine states and capacities
  const currentDay = room?.currentDay ?? 1;
  const isSimulationActive = room?.status === 'active';
  const isBankrupt = teamState?.status === 'bankrupt';

  const mixOnHand = teamState?.inventory?.base_mix?.onHand ?? 0;
  const packOnHand = teamState?.inventory?.packaging_material?.onHand ?? 0;
  const finishedOnHand = teamState?.inventory?.finished_muffin?.onHand ?? 0;

  // Breakdown records by machine type
  const breakdownMap = useMemo(() => {
    const map: Record<MachineType, { brokenCount: number; daysRemaining: number }> = {
      mixing: { brokenCount: 0, daysRemaining: 0 },
      baking: { brokenCount: 0, daysRemaining: 0 },
      icing: { brokenCount: 0, daysRemaining: 0 },
      packaging: { brokenCount: 0, daysRemaining: 0 },
    };
    if (teamState?.breakdownStates) {
      teamState.breakdownStates.forEach((b) => {
        if (b.machineType in map) {
          const rem = (b.daysRemaining || []).filter((d) => d > 0);
          const count = rem.length > 0 
            ? rem.length 
            : (b.daysRemaining && b.daysRemaining.length === 0 ? 0 : (b.brokenCount || 0));
          map[b.machineType] = {
            brokenCount: count,
            daysRemaining: rem.length > 0 ? rem[0] : 0,
          };
        }
      });
    }
    return map;
  }, [teamState?.breakdownStates]);

  // Stage operating capacity and running machine counts
  const stageStats = useMemo(() => {
    const stats: Record<MachineType, { count: number; active: number; running: number; capacity: number; broken: number; repairDays: number; health: number }> = {
      mixing: { count: 1, active: 1, running: 1, capacity: 100, broken: 0, repairDays: 0, health: 100 },
      baking: { count: 1, active: 1, running: 1, capacity: 80, broken: 0, repairDays: 0, health: 100 },
      icing: { count: 1, active: 1, running: 1, capacity: 120, broken: 0, repairDays: 0, health: 100 },
      packaging: { count: 1, active: 1, running: 1, capacity: 150, broken: 0, repairDays: 0, health: 100 },
    };

    if (teamState?.machines) {
      STAGE_KEYS.forEach((mType) => {
        const m = teamState.machines[mType];
        const bk = breakdownMap[mType];
        const count = m?.count ?? 1;
        const active = m?.active ?? 1;
        const broken = bk.brokenCount;
        const running = Math.max(0, active - broken);
        const unitCap = (room?.scenarioConfig?.machineSettings?.[mType]?.capacityPerMachine) || MACHINE_CONFIG[mType].defaultCap;
        const cap = running * unitCap;
        const health = active > 0 ? Math.round((running / active) * 100) : 0;

        stats[mType] = {
          count,
          active,
          running,
          capacity: cap,
          broken,
          repairDays: bk.daysRemaining,
          health,
        };
      });
    }

    return stats;
  }, [teamState?.machines, breakdownMap, room?.scenarioConfig?.machineSettings]);

  // Find line bottleneck (lowest stage operating capacity)
  const bottleneckStage = useMemo(() => {
    let minCap = Infinity;
    let bottleneck: MachineType = 'baking';
    STAGE_KEYS.forEach((mType) => {
      const cap = stageStats[mType].capacity;
      if (cap < minCap) {
        minCap = cap;
        bottleneck = mType;
      }
    });
    return { stage: bottleneck, capacity: minCap };
  }, [stageStats]);

  // Factory Line Operating Threshold
  const maxLineThroughput = Math.max(0, Math.min(mixOnHand, packOnHand, bottleneckStage.capacity));
  const isLineRunning = isSimulationActive && !isBankrupt && maxLineThroughput > 0 && stageStats[bottleneckStage.stage].running > 0;

  // Determine line issue message
  const lineIssue = useMemo(() => {
    if (isBankrupt) return 'Factory Insolvent — Operations Suspended';
    if (!isSimulationActive) return null; // Paused / Staging
    if (mixOnHand <= 0 && packOnHand <= 0) return 'Raw Mix & Packaging Depleted';
    if (mixOnHand <= 0) return 'Raw Mix Depleted';
    if (packOnHand <= 0) return 'Packaging Material Depleted';
    if (stageStats[bottleneckStage.stage].capacity === 0) {
      return `${MACHINE_CONFIG[bottleneckStage.stage].label} Offline — Line Blocked`;
    }
    return null;
  }, [isBankrupt, isSimulationActive, mixOnHand, packOnHand, stageStats, bottleneckStage]);

  // In-transit deliveries countdown
  const earliestDeliveryDays = useMemo(() => {
    if (!teamState?.purchaseOrders) return null;
    const transits = teamState.purchaseOrders.filter((po) => po.status === 'transit' && po.arrivalDay > currentDay);
    if (transits.length === 0) return null;
    const minDay = Math.min(...transits.map((po) => po.arrivalDay));
    return Math.max(1, minDay - currentDay);
  }, [teamState?.purchaseOrders, currentDay]);

  // Continuous conveyor animation state
  const [conveyorPhase, setConveyorPhase] = useState(0);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Belt animation cycle: speed scales with factory operating throughput
  const cycleDuration = useMemo(() => {
    const baseThroughput = Math.max(20, Math.min(200, maxLineThroughput || 80));
    return Math.max(10, Math.min(30, 1800 / baseThroughput));
  }, [maxLineThroughput]);

  useEffect(() => {
    if (!isLineRunning) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const deltaSec = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      setConveyorPhase((prev) => (prev + deltaSec / cycleDuration) % 1);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isLineRunning, cycleDuration]);

  // Sample discrete product positions on conveyor
  const conveyorProducts = useMemo(() => {
    const productsCount = 5;
    const products: ConveyorProduct[] = [];
    const intake = BELT_CONFIG.intakeX;
    const dispatch = BELT_CONFIG.dispatchX;
    const totalDist = dispatch - intake;

    for (let i = 0; i < productsCount; i++) {
      // Offset each product evenly
      const normPos = (conveyorPhase + i / productsCount) % 1;
      const x = intake + normPos * totalDist;

      // Detect which stage the product is currently passing
      let stage: MachineType | null = null;
      let completed = 0;
      let processing = 0;

      STAGE_KEYS.forEach((mType, idx) => {
        const mX = MACHINE_CONFIG[mType].x;
        const halfW = MACHINE_CONFIG[mType].width / 2;
        if (x >= mX - halfW && x <= mX + halfW) {
          stage = mType;
          processing = (x - (mX - halfW)) / (halfW * 2);
        }
        if (x > mX + halfW) {
          completed = idx + 1;
        }
      });

      // Product visual form across sequential transformations
      let img = ASSET_PATHS.batter;
      let resultImg: string | undefined = undefined;

      if (completed === 1) {
        img = ASSET_PATHS.batter;
        if (stage === 'baking') resultImg = ASSET_PATHS.baked;
      } else if (completed === 2) {
        img = ASSET_PATHS.baked;
        if (stage === 'icing') resultImg = ASSET_PATHS.iced;
      } else if (completed === 3) {
        img = ASSET_PATHS.iced;
        if (stage === 'packaging') resultImg = ASSET_PATHS.boxed;
      } else if (completed >= 4) {
        img = ASSET_PATHS.boxed;
      }

      // Vertical lift while processing in machine chambers
      const lift = stage ? Math.sin(processing * Math.PI) : 0;
      const targetChamberY = stage === 'mixing' ? 38 : stage === 'baking' ? 42 : stage === 'icing' ? 30 : 36;
      const bottom = BELT_CONFIG.beltY + lift * Math.max(0, targetChamberY - BELT_CONFIG.beltY);

      // Fade in near intake and fade out near dispatch
      const fade = Math.max(0, Math.min(1, (x - intake) / 3, (dispatch - x) / 3));

      products.push({
        key: i,
        x,
        bottom,
        stage,
        completed,
        processing,
        image: img,
        resultImage: resultImg,
        opacity: isLineRunning ? fade : 0.7,
        conversion: Math.max(0, Math.min(1, (processing - 0.4) / 0.3)),
        rise: 1 + processing * 0.12,
      });
    }

    return products;
  }, [conveyorPhase, isLineRunning]);

  return (
    <section className="factory-visual" aria-label="Interactive live factory floor simulation">
      {/* ── Factory Live Header Bar ── */}
      <div className="factory-header">
        <div className="factory-title">
          <Factory className="w-4 h-4 text-rose-500" />
          <span>FACTORY FLOOR LIVE FEED</span>
          <small>REAL-TIME PRODUCTION</small>
        </div>

        <div className={`factory-live ${isLineRunning ? 'active' : ''}`}>
          <i />
          <span>{isLineRunning ? 'LINE RUNNING' : lineIssue ? 'LINE STOPPED' : 'SIMULATION PAUSED'}</span>
        </div>
      </div>

      {/* ── Interactive Viewport Scene ── */}
      <div
        ref={containerRef}
        className={`factory-scene lighting-warm visual-style-original ${isLineRunning ? 'is-running' : ''}`}
        style={{
          '--belt-y': `${BELT_CONFIG.beltY}%`,
          '--label-y': `${BELT_CONFIG.labelY}%`,
          '--product-scale': BELT_CONFIG.productScale,
          '--scene-brightness': 1.1,
        } as React.CSSProperties}
      >
        {/* Conveyor Background Image */}
        <img
          className="factory-background"
          src={ASSET_PATHS.background}
          alt="Muffin mixing, baking, icing, and packaging machines on a continuous factory line"
        />

        {/* Ambient Vignette & Lighting */}
        <div className="factory-scene-vignette" />
        <div className="factory-lighting" aria-hidden="true" />

        {/* ── 4 Interactive Machine Stage Pins ── */}
        {STAGE_KEYS.map((mType) => {
          const cfg = MACHINE_CONFIG[mType];
          const stats = stageStats[mType];
          const isBottleneck = bottleneckStage.stage === mType && stats.capacity > 0;
          const isBroken = stats.broken > 0 && stats.repairDays > 0;
          const isRepairing = isBroken;
          const isTotallyOffline = isBroken && stats.running === 0;
          const isPartiallyOperational = isBroken && stats.running > 0;
          const isStageRunning = isLineRunning && stats.running > 0;
          const isConstrained = isBottleneck && !lineIssue;

          // Repair progress calculation
          const maxRepairDuration = mType === 'mixing' || mType === 'baking' ? 2 : 1;
          const repairProgress = isRepairing ? Math.round(Math.max(0, Math.min(1, 1 - stats.repairDays / maxRepairDuration)) * 100) : 0;

          // Active product currently being processed at this stage
          const activeProduct = conveyorProducts.find((p) => p.stage === mType);
          const processProgress = activeProduct?.processing ?? 0;

          return (
            <React.Fragment key={mType}>
              {/* Stage Status Pin Card */}
              <div
                className={`stage-pin ${isTotallyOffline ? 'stage-broken' : isPartiallyOperational ? 'stage-bottleneck' : ''} ${isRepairing ? 'stage-repairing' : ''} ${isStageRunning ? 'stage-running' : ''} ${isConstrained ? 'stage-bottleneck' : ''}`}
                style={{
                  left: `${cfg.x}%`,
                  '--pin-width': `${cfg.width}%`,
                  '--health': `${stats.health}%`,
                  '--repair-progress': `${repairProgress}%`,
                } as React.CSSProperties}
                title={`${cfg.label}: ${isRepairing ? `Repairing (${stats.repairDays}d left)` : isTotallyOffline ? 'Broken' : isStageRunning ? 'Running' : 'Ready'}, Health: ${stats.health}% (${stats.running}/${stats.active} working)`}
              >
                <div className="stage-pin-top">
                  <i />
                  <span>{cfg.stageTitle}</span>
                </div>

                {/* Health Bar */}
                <div className="machine-health" role="progressbar" aria-valuenow={stats.health}>
                  <span />
                </div>

                <div className="machine-health-value">
                  <span>HP</span>
                  <strong>{stats.health}%</strong>
                </div>

                <div className="stage-pin-bottom">
                  {isRepairing ? (
                    <>
                      <Wrench className="w-2.5 h-2.5 text-amber-500 animate-spin" />
                      <span>{isPartiallyOperational ? `${stats.running}/${stats.active} · ${stats.repairDays}d` : `${stats.repairDays}d`}</span>
                    </>
                  ) : isTotallyOffline ? (
                    <span className="text-red-500 font-bold">FAILED</span>
                  ) : isPartiallyOperational ? (
                    <span className="text-amber-600 font-bold">{stats.running}/{stats.active} OK</span>
                  ) : stats.active === 0 ? (
                    <span className="text-stone-400">OFF</span>
                  ) : isStageRunning ? (
                    <span>{cfg.actionText}</span>
                  ) : (
                    <span>{stats.capacity}/d</span>
                  )}
                </div>

                {/* Machine Operation / Repair Progress Bars */}
                {isStageRunning && (
                  <div className="machine-operation-progress">
                    <span style={{ width: `${processProgress * 100}%` }} />
                  </div>
                )}
                {isRepairing && (
                  <div className="machine-repair-progress">
                    <span />
                  </div>
                )}
              </div>

              {/* Machine Smoke / Breakdown Alerts (rendered strictly when active repair is underway) */}
              {isBroken && (
                <div
                  className={`machine-condition-effect ${isTotallyOffline ? 'condition-failed' : 'condition-repairing'}`}
                  style={{ left: `${cfg.x}%` }}
                  aria-hidden="true"
                >
                  {isTotallyOffline && (
                    <div className="machine-smoke">
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                  <div className="machine-condition-icon">
                    <Wrench className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* ── Active Chamber Animations ── */}
        <div className="machine-effects" aria-hidden="true">
          {STAGE_KEYS.map((mType) => {
            const cfg = MACHINE_CONFIG[mType];
            const activeProduct = conveyorProducts.find((p) => p.stage === mType);
            const isWorking = isLineRunning && stageStats[mType].running > 0 && activeProduct !== undefined;
            const progress = activeProduct?.processing ?? 0;
            const stroke = Math.sin(progress * Math.PI);

            if (!isWorking) return null;

            return (
              <div
                key={mType}
                className={`machine-processing processing-${mType}`}
                style={{
                  left: `${cfg.x}%`,
                  '--process': progress,
                  '--stroke': stroke,
                  '--turn': `${progress * 2160}deg`,
                } as React.CSSProperties}
              >
                {/* Mechanical moving elements */}
                <i className="machine-lift" style={{ bottom: `${activeProduct?.bottom ?? BELT_CONFIG.beltY}%` }} />
                
                {mType === 'mixing' && (
                  <>
                    <i className="mixer-spindle" />
                    <i className="mixer-batter" />
                    <i className="mixer-paddle" />
                    <i className="mixer-paddle paddle-second" />
                  </>
                )}

                {mType === 'baking' && (
                  <>
                    <i className="oven-heat" />
                    <i className="oven-fan" />
                    <i className="oven-rack" />
                    <i className="oven-steam" />
                  </>
                )}

                {mType === 'icing' && (
                  <>
                    <i className="icing-nozzle" />
                    {progress > 0.2 && progress < 0.8 && <i className="icing-stream" />}
                  </>
                )}

                {mType === 'packaging' && (
                  <>
                    <i className="packing-jaw jaw-left" />
                    <i className="packing-jaw jaw-right" />
                    <i className="packing-seal" />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Moving Conveyor Belt Products ── */}
        <div className="belt-products" aria-hidden="true">
          {conveyorProducts.map((p) => (
            <div
              key={p.key}
              className={`factory-product ${p.stage ? `product-processing product-${p.stage}` : ''}`}
              style={{
                left: `${p.x}%`,
                bottom: `${p.bottom}%`,
                opacity: p.opacity,
                '--conversion': p.conversion,
                '--rise': p.rise,
              } as React.CSSProperties}
            >
              {/* Base image */}
              <img src={p.image} alt="" />
              
              {/* Smooth transformation overlay image */}
              {p.resultImage && (
                <img className="product-result" src={p.resultImage} alt="" />
              )}
            </div>
          ))}
        </div>

        {/* Left Floating Inventory HUD */}
        <div className="scene-left-label">
          <span>RAW MATERIAL</span>
          <strong>{mixOnHand.toLocaleString()}</strong>
          <small>mix units</small>
        </div>

        {/* Right Floating Finished Goods HUD */}
        <div className="scene-right-label">
          <Package className="w-3.5 h-3.5 text-emerald-600" />
          <span>READY TO SHIP</span>
          <strong>{finishedOnHand.toLocaleString()}</strong>
        </div>

        {/* Center Critical Issue Banner */}
        {lineIssue && (
          <div className="scene-issue animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{lineIssue}</span>
          </div>
        )}
      </div>

      {/* ── Status Rail Strip (5 Real-Time Operational Channels) ── */}
      <div className="factory-rail" aria-label="Live factory production telemetry">
        <div className="rail-cell">
          <span>01 / SUPPLY</span>
          <strong>{mixOnHand.toLocaleString()} <small>mix</small></strong>
        </div>

        <div className="rail-cell">
          <span>02 / PACKAGING</span>
          <strong>{packOnHand.toLocaleString()} <small>boxes</small></strong>
        </div>

        <div className="rail-cell">
          <span>03 / OUTPUT</span>
          <strong>{maxLineThroughput.toLocaleString()} <small>/ day</small></strong>
        </div>

        <div className="rail-cell">
          <span>04 / CONSTRAINT</span>
          <strong className="constraint-value">{lineIssue || MACHINE_CONFIG[bottleneckStage.stage].label}</strong>
        </div>

        <div className="rail-cell">
          <span>05 / DISPATCH</span>
          <strong>{finishedOnHand.toLocaleString()} <small>ready</small></strong>
        </div>
      </div>

      {/* ── Bottom Telemetry Footer ── */}
      <div className="factory-footer">
        <span>
          <Zap className="w-3 h-3 text-emerald-500" />
          {isLineRunning 
            ? `Producing up to ${maxLineThroughput} muffins/day` 
            : lineIssue || 'Production paused'}
        </span>

        <span>
          <Truck className="w-3 h-3 text-stone-400" />
          {earliestDeliveryDays === null 
            ? 'No delivery scheduled' 
            : `Supply arrives in ${earliestDeliveryDays} day${earliestDeliveryDays === 1 ? '' : 's'}`}
        </span>

        <span className="font-mono">
          DAY {currentDay} / {room?.maxDays || 30}
        </span>
      </div>
    </section>
  );
}
