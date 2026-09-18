import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';

export default function FactoryVisualization() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentRateRef = useRef(1.0);

  const { teamState, room } = useGameStore(
    useShallow((state) => ({
      teamState: state.teamState,
      room: state.room,
    }))
  );

  // Compute a normalized stock health value (0 to 1)
  let stockHealth = 1.0;
  if (teamState?.inventory) {
    const inv = teamState.inventory;
    const mixOnHand = inv.base_mix?.onHand ?? 0;
    const packOnHand = inv.packaging_material?.onHand ?? 0;
    const mixROP = inv.base_mix?.reorderPoint ?? 100;
    const packROP = inv.packaging_material?.reorderPoint ?? 100;

    const mixHealth = mixROP > 0 ? Math.min(mixOnHand / mixROP, 2.0) / 2.0 : (mixOnHand > 0 ? 1.0 : 0);
    const packHealth = packROP > 0 ? Math.min(packOnHand / packROP, 2.0) / 2.0 : (packOnHand > 0 ? 1.0 : 0);

    stockHealth = Math.min(mixHealth, packHealth);
  }

  const isSimulationActive = room?.status === 'active';
  const hasActiveMachines = teamState?.machines 
    ? Object.values(teamState.machines).some(m => m.active > 0) 
    : true;
  const isProducing = isSimulationActive && stockHealth > 0 && hasActiveMachines;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isProducing) {
      video.pause();
      return;
    }

    // Map stockHealth (0–1) to playback rate
    const targetRate = 0.1 + stockHealth * 1.4;
    const lerp = 0.15;
    const smoothedRate = currentRateRef.current + (targetRate - currentRateRef.current) * lerp;
    const finalRate = Math.max(0.1, Math.min(smoothedRate, 1.5));
    currentRateRef.current = finalRate;
    video.playbackRate = finalRate;

    if (video.paused) {
      video.play().catch(() => {});
    }
  }, [isProducing, stockHealth, teamState?.inventory]);

  // Animation frame loop for gradual rate changes while running
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animFrame: number;
    let lastTime = 0;
    const UPDATE_INTERVAL = 200;

    const animate = (time: number) => {
      if (time - lastTime >= UPDATE_INTERVAL && video) {
        if (isProducing) {
          const diff = Math.abs(video.playbackRate - currentRateRef.current);
          if (diff > 0.01) {
            video.playbackRate = currentRateRef.current;
          }
        }
        lastTime = time;
      }
      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [isProducing]);

  return (
    <section className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden">
      {/* Header bar */}
      <header className="px-4 py-2.5 bg-gradient-to-r from-rose-100 to-pink-100 font-extrabold tracking-wide text-sm flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${isProducing ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        <span className="text-rose-600">🏭 FACTORY FLOOR LIVE FEED</span>
      </header>

      {/* Video Content */}
      <div className="p-3">
        <div className="rounded-xl overflow-hidden bg-rose-50 relative" style={{ height: '20rem' }}>
          <video
            ref={videoRef}
            src="/factory-feed.mp4"
            muted
            loop
            playsInline
            className="w-full h-full object-cover block"
          />

          {/* Idle / Paused Overlay */}
          {!isProducing && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white select-none p-4 text-center">
              <div className="text-3xl mb-2">⏸️</div>
              <div className="font-extrabold text-sm tracking-wider uppercase mb-1">
                {!isSimulationActive ? 'Simulation Paused / Idle' : stockHealth <= 0 ? 'Out of Raw Materials' : 'Machines Paused'}
              </div>
              <div className="text-xs text-white/80 max-w-xs leading-relaxed font-sans">
                {!isSimulationActive 
                  ? 'Factory line will start moving when instructor starts the simulation.' 
                  : stockHealth <= 0 
                    ? 'Wait for incoming material delivery or adjust reorder thresholds.'
                    : 'Activate at least one machine on the factory floor to resume production.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
