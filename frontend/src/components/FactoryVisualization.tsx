// v2 – 3D Factory image replacing canvas animation
import React from 'react';
import { useGameStore } from '../store/gameStore';

export default function FactoryVisualization() {
  const { room, teamState } = useGameStore();

  return (
    <div className="w-full h-full rounded-[20px] shadow-sm overflow-hidden flex flex-col bg-[#fdf7ea] border-2 border-[#f5ead5]">

      {/* Header bar */}
      <div className="bg-[#5ea861] text-white font-bold py-2 px-4 font-pixel text-[10px] tracking-wider uppercase flex items-center space-x-2 flex-shrink-0">
        <span className="w-2.5 h-2.5 bg-[#90ee90] rounded-full inline-block shadow-[0_0_6px_#90ee90]"></span>
        <span>Factory Floor Live Feed</span>
      </div>

      {/* 3D Factory Image */}
      <div className="flex-1 min-h-0 overflow-hidden bg-[#fce8d5]">
        <img
          src="/hero_factory_3d.jpg"
          alt="3D Factory Floor - MIX-01, BAKE-01, ICE-01, PACK-01"
          className="w-full h-full object-cover object-center"
        />
      </div>
    </div>
  );
}
