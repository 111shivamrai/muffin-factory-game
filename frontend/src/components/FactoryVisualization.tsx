import React from 'react';

export default function FactoryVisualization() {
  return (
    <section className="rounded-2xl bg-white border border-rose-100 shadow-[0_2px_0_#f5d4dc] overflow-hidden">
      {/* Header bar */}
      <header className="px-4 py-2.5 bg-gradient-to-r from-rose-100 to-pink-100 font-extrabold tracking-wide text-sm flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-emerald-500" />
        <span className="text-rose-500">🏭 FACTORY FLOOR LIVE FEED</span>
      </header>

      {/* Video Content */}
      <div className="p-3">
        <div className="rounded-xl overflow-hidden bg-rose-50" style={{ height: 320 }}>
          <video
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
