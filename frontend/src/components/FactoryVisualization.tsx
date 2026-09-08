import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useShallow } from 'zustand/react/shallow';

export default function FactoryVisualization() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentRateRef = useRef(1.0);

  const teamState = useGameStore(useShallow((state) => state.teamState));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Compute a normalized stock health value (0 to 1)
    let stockHealth = 1.0; // default: healthy

    if (teamState?.inventory) {
      const inv = teamState.inventory;
      const mixOnHand = inv.base_mix?.onHand ?? 0;
      const packOnHand = inv.packaging_material?.onHand ?? 0;
      const mixROP = inv.base_mix?.reorderPoint ?? 100;
      const packROP = inv.packaging_material?.reorderPoint ?? 100;

      // Use reorder point as the "healthy" threshold for each material
      // A ratio of 1.0+ means healthy, approaching 0 means critical
      const mixHealth = mixROP > 0 ? Math.min(mixOnHand / mixROP, 2.0) / 2.0 : (mixOnHand > 0 ? 1.0 : 0);
      const packHealth = packROP > 0 ? Math.min(packOnHand / packROP, 2.0) / 2.0 : (packOnHand > 0 ? 1.0 : 0);

      // Use the minimum — factory is bottlenecked by the worst material
      stockHealth = Math.min(mixHealth, packHealth);
    }

    // Map stockHealth (0–1) to playback rate
    // 0.0 → 0.1 (near-stopped)
    // 0.5 → 0.8 (moderate)
    // 1.0 → 1.5 (full speed)
    const targetRate = 0.1 + stockHealth * 1.4;

    // Smooth interpolation toward target rate to avoid jumps
    const lerp = 0.15;
    const smoothedRate = currentRateRef.current + (targetRate - currentRateRef.current) * lerp;

    // Clamp to valid range
    const finalRate = Math.max(0.1, Math.min(smoothedRate, 1.5));
    currentRateRef.current = finalRate;

    video.playbackRate = finalRate;

    // If stock is truly zero, pause; otherwise ensure playing
    if (stockHealth <= 0) {
      video.pause();
    } else if (video.paused) {
      video.play().catch(() => {});
    }
  }, [teamState?.inventory]);

  // Also set up a smooth animation frame loop for gradual rate changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animFrame: number;
    let lastTime = 0;
    const UPDATE_INTERVAL = 200; // ms between rate updates

    const animate = (time: number) => {
      if (time - lastTime >= UPDATE_INTERVAL && video) {
        const diff = Math.abs(video.playbackRate - currentRateRef.current);
        if (diff > 0.01) {
          video.playbackRate = currentRateRef.current;
        }
        lastTime = time;
      }
      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <section className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden">
      {/* Header bar */}
      <header className="px-4 py-2.5 bg-gradient-to-r from-rose-100 to-pink-100 font-extrabold tracking-wide text-sm flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-emerald-500" />
        <span className="text-rose-500">🏭 FACTORY FLOOR LIVE FEED</span>
      </header>

      {/* Video Content */}
      <div className="p-3">
        <div className="rounded-xl overflow-hidden bg-rose-50" style={{ height: '20rem' }}>
          <video
            ref={videoRef}
            src="/factory-feed.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover block"
          />
        </div>
      </div>
    </section>
  );
}
