import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { MachineType } from '../../../backend/src/types/index.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

interface MuffinSprite {
  x: number;
  y: number;
  state: 'batter' | 'baked' | 'iced' | 'packaged';
  speed: number;
}

export default function FactoryVisualization() {
  const { teamState } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep references for animation states so react re-renders do not reset them
  const animationRef = useRef<number | null>(null);
  const muffinsRef = useRef<MuffinSprite[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const beltOffsetRef = useRef<number>(0);
  const mixingAngleRef = useRef<number>(0);
  
  // Machine status states
  const statusRef = useRef<Record<MachineType, 'ok' | 'broken' | 'idle'>>({
    mixing: 'idle',
    baking: 'idle',
    icing: 'idle',
    packaging: 'idle'
  });

  useEffect(() => {
    if (!teamState) return;

    const { mixing, baking, icing, packaging } = teamState.machines;
    const breakdownStates = teamState.breakdownStates || [];

    // Helper to resolve status
    const resolveStatus = (mType: MachineType, count: number, active: number) => {
      const brokenState = breakdownStates.find(s => s.machineType === mType);
      const brokenCount = brokenState ? brokenState.daysRemaining.length : 0;
      
      if (brokenCount > 0) return 'broken';
      if (active > 0) return 'ok';
      return 'idle';
    };

    statusRef.current = {
      mixing: resolveStatus('mixing', mixing.count, mixing.active),
      baking: resolveStatus('baking', baking.count, baking.active),
      icing: resolveStatus('icing', icing.count, icing.active),
      packaging: resolveStatus('packaging', packaging.count, packaging.active)
    };
  }, [teamState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Seed initial muffins if list is empty
    if (muffinsRef.current.length === 0) {
      muffinsRef.current = [
        { x: 100, y: 225, state: 'batter', speed: 1.2 },
        { x: 250, y: 225, state: 'batter', speed: 1.2 },
        { x: 400, y: 225, state: 'baked', speed: 1.2 },
        { x: 550, y: 225, state: 'iced', speed: 1.2 },
        { x: 700, y: 225, state: 'packaged', speed: 1.2 }
      ];
    }

    const render = () => {
      // Clear canvas with warm peach color
      ctx.fillStyle = '#ffd9c8'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Draw brick wall background lines
      ctx.strokeStyle = '#f5c3ad';
      ctx.lineWidth = 1;
      const brickH = 16;
      const brickW = 40;
      
      // Horizontal lines
      for (let y = 0; y < h; y += brickH) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        
        // Alternating vertical lines
        const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
        for (let x = offset; x < w + brickW; x += brickW) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + brickH);
          ctx.stroke();
        }
      }

      // Machine positions for ceiling lamps
      const stationXCoords = [w * 0.22, w * 0.45, w * 0.68, w * 0.88];
      
      // Draw hanging ceiling lamps above each machine casting light cones
      stationXCoords.forEach(lx => {
        const ly = 45; // height of the lamp bottom
        
        // Wire/cord
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, ly - 8);
        ctx.stroke();
        
        // Soft yellow light cone polygon (drawn behind)
        ctx.fillStyle = 'rgba(254, 240, 138, 0.12)';
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 60, h);
        ctx.lineTo(lx + 60, h);
        ctx.closePath();
        ctx.fill();

        // Lamp shade / hood
        ctx.fillStyle = '#bfa598';
        ctx.strokeStyle = '#8c766b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx - 12, ly);
        ctx.lineTo(lx - 6, ly - 8);
        ctx.lineTo(lx + 6, ly - 8);
        ctx.lineTo(lx + 12, ly);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing light bulb
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw chalkboard on the right wall
      const cbX = w - 95;
      const cbY = 55;
      const cbW = 80;
      const cbH = 75;
      
      // Wooden board frame
      ctx.fillStyle = '#653c24'; // dark wood
      ctx.fillRect(cbX, cbY, cbW, cbH);
      ctx.strokeStyle = '#442817';
      ctx.lineWidth = 2;
      ctx.strokeRect(cbX, cbY, cbW, cbH);
      
      // Blackboard surface
      ctx.fillStyle = '#2f3e46'; // slate chalk color
      ctx.fillRect(cbX + 4, cbY + 4, cbW - 8, cbH - 8);
      
      // Chalk text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // chalk white
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("Today's Goal:", cbX + cbW / 2, cbY + 18);
      ctx.font = '7px sans-serif';
      ctx.fillText("More Muffins,", cbX + cbW / 2, cbY + 36);
      ctx.fillText("More Happiness!", cbX + cbW / 2, cbY + 50);

      // Draw horizontal top pipe
      ctx.fillStyle = '#bfa598';
      ctx.fillRect(40, 60, w - 140, 10); 
      ctx.fillStyle = '#e2c2b3';
      ctx.fillRect(40, 64, w - 140, 3);

      // Conveyor Belt coordinates
      const beltY = 230;
      const beltH = 14;
      const beltX = 40;
      const beltW = w - 80;

      // Animate conveyor belt offset if active systems are normal
      const isBeltRunning = statusRef.current.mixing === 'ok' || statusRef.current.baking === 'ok';
      if (isBeltRunning) {
        beltOffsetRef.current = (beltOffsetRef.current + 1.5) % 20;
      }

      // Draw Conveyor belt structures
      ctx.fillStyle = '#475569';
      ctx.fillRect(beltX, beltY, beltW, beltH);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(beltX + 2, beltY + 2, beltW - 4, beltH - 4);

      // Draw moving conveyor rollers/grids
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      for (let rx = beltX + 5 - beltOffsetRef.current; rx < beltX + beltW - 5; rx += 15) {
        if (rx > beltX + 2) {
          ctx.beginPath();
          ctx.moveTo(rx, beltY + 2);
          ctx.lineTo(rx + 5, beltY + beltH - 2);
          ctx.stroke();
        }
      }

      // Draw conveyor support stands
      ctx.fillStyle = '#bfa598';
      ctx.strokeStyle = '#8c766b';
      ctx.lineWidth = 2;
      for (let sx = beltX + 80; sx < beltX + beltW; sx += 200) {
        ctx.fillRect(sx - 8, beltY + beltH, 16, h - (beltY + beltH) - 10);
        ctx.strokeRect(sx - 8, beltY + beltH, 16, h - (beltY + beltH) - 10);
      }

      // Draw Steam Particles above oven (Bake station)
      if (statusRef.current.baking === 'ok' && Math.random() < 0.15) {
        particlesRef.current.push({
          x: w * 0.45 + (Math.random() * 20 - 10),
          y: 95,
          vx: Math.random() * 0.4 - 0.2,
          vy: -1.0 - Math.random() * 0.8,
          size: 3 + Math.random() * 4,
          alpha: 0.7,
          life: 80
        });
      }

      // Update and draw steam particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / 80;

        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Animate rotating mixers
      if (statusRef.current.mixing === 'ok') {
        mixingAngleRef.current += 0.08;
      }

      // MACHINE STATIONS CONFIG
      const stations = [
        { type: 'mixing' as MachineType, name: 'MIX-01', x: w * 0.22, color: '#4aa0e6', lightColor: '#7ec0f2' },
        { type: 'baking' as MachineType, name: 'BAKE-01', x: w * 0.45, color: '#b57ae6', lightColor: '#cfa8f2' },
        { type: 'icing' as MachineType, name: 'ICE-01', x: w * 0.68, color: '#f26fae', lightColor: '#f79ac3' },
        { type: 'packaging' as MachineType, name: 'PACK-01', x: w * 0.88, color: '#68ca82', lightColor: '#95e3a8' }
      ];

      // Draw stations
      stations.forEach(station => {
        const sx = station.x;
        const sy = 120;
        const stat = statusRef.current[station.type];

        // Draw machine cabinet
        ctx.fillStyle = station.color;
        ctx.fillRect(sx - 30, sy, 60, 85);
        ctx.strokeStyle = '#2d2d2d';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx - 30, sy, 60, 85);

        // Draw status lights on machines
        const lightY = sy + 12;
        ctx.beginPath();
        ctx.arc(sx - 18, lightY, 4, 0, Math.PI * 2);
        if (stat === 'ok') {
          ctx.fillStyle = '#10b981'; // Green
        } else if (stat === 'broken') {
          ctx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? '#ef4444' : '#991b1b'; // Blinking red
        } else {
          ctx.fillStyle = '#fbbf24'; // Yellow
        }
        ctx.fill();
        ctx.stroke();

        // Draw machine label plate
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(sx - 22, sy + 64, 44, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(station.name, sx, sy + 74);

        // Specific Machine visual elements
        if (station.type === 'mixing') {
          // Draw a glass bowl with pink liquid
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(sx - 16, sy + 32, 32, 18);
          ctx.strokeStyle = '#2d2d2d';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(sx - 16, sy + 32, 32, 18);
          
          // Draw spinner paddle
          const angle = mixingAngleRef.current;
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy + 22);
          ctx.lineTo(sx + 12 * Math.cos(angle), sy + 30 + 4 * Math.sin(angle));
          ctx.stroke();
        } 
        else if (station.type === 'baking') {
          // Draw an oven window showing cookies rising
          ctx.fillStyle = '#1e1b4b'; 
          ctx.fillRect(sx - 16, sy + 28, 32, 26);
          ctx.strokeRect(sx - 16, sy + 28, 32, 26);

          if (stat === 'ok') {
            ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
            ctx.fillRect(sx - 14, sy + 30, 28, 22);
            
            // Baking muffins
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(sx - 10, sy + 40, 6, 6);
            ctx.fillRect(sx + 4, sy + 40, 6, 6);
          }
        }
        else if (station.type === 'icing') {
          // Draw icing tubes
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(sx - 5, sy + 22, 10, 30);
          ctx.strokeRect(sx - 5, sy + 22, 10, 30);
          
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(sx - 2, sy + 52, 4, 5);
        }
        else if (station.type === 'packaging') {
          // Hydraulic stamps
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(sx - 12, sy + 22, 24, 12);
          ctx.strokeRect(sx - 12, sy + 22, 24, 12);
          
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(sx - 4, sy + 34, 8, 20);
        }
      });

      // UPDATE AND DRAW MUFFIN SPRITES
      muffinsRef.current.forEach((muffin) => {
        if (isBeltRunning) {
          muffin.x += muffin.speed;
        }

        if (muffin.x > w - 60) {
          muffin.x = 40;
          muffin.state = 'batter';
        }

        const mx = muffin.x;
        if (mx > w * 0.22 && mx < w * 0.24) {
          muffin.state = 'batter';
        }
        if (mx > w * 0.45 && mx < w * 0.47 && statusRef.current.baking === 'ok') {
          muffin.state = 'baked';
        }
        if (mx > w * 0.68 && mx < w * 0.70 && statusRef.current.icing === 'ok') {
          muffin.state = 'iced';
        }
        if (mx > w * 0.88 && mx < w * 0.90 && statusRef.current.packaging === 'ok') {
          muffin.state = 'packaged';
        }

        const my = beltY - 6; 

        if (muffin.state === 'batter') {
          ctx.fillStyle = '#3b82f6'; 
          ctx.fillRect(mx - 7, my, 14, 7);
          ctx.fillStyle = '#f472b6'; 
          ctx.beginPath();
          ctx.arc(mx, my, 6, Math.PI, 0);
          ctx.fill();
        } 
        else if (muffin.state === 'baked') {
          ctx.fillStyle = '#fbbf24'; 
          ctx.fillRect(mx - 7, my, 14, 7);
          ctx.fillStyle = '#d97706'; 
          ctx.beginPath();
          ctx.arc(mx, my - 2, 8, Math.PI, 0);
          ctx.fill();
        }
        else if (muffin.state === 'iced') {
          ctx.fillStyle = '#fbbf24'; 
          ctx.fillRect(mx - 7, my, 14, 7);
          ctx.fillStyle = '#d97706'; 
          ctx.beginPath();
          ctx.arc(mx, my - 2, 8, Math.PI, 0);
          ctx.fill();

          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.arc(mx, my - 5, 5, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(mx - 1, my - 6, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        else if (muffin.state === 'packaged') {
          ctx.fillStyle = '#d97706'; 
          ctx.fillRect(mx - 9, my - 7, 18, 14);
          ctx.strokeStyle = '#7c2d12';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(mx - 9, my - 7, 18, 14);

          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(mx - 2, my - 7, 4, 3);
        }
      });

      // Schedule next frame
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [teamState]);

  return (
    <div className="bg-[#fdf7ea] rounded-[20px] border-2 border-[#f5ead5] shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header matching the image exactly */}
      <div className="bg-[#ffd24f] p-3 border-b-2 border-[#f5ead5] font-bold text-[#714f00] font-pixel text-[10px] tracking-wider uppercase flex items-center space-x-2.5">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-red-700 shadow-sm"></span>
        </span>
        <span>Factory Floor Live Feed</span>
      </div>

      {/* Canvas Box */}
      <div className="bg-[#ffd9c8] p-2 flex-1 min-h-[180px]">
        <canvas ref={canvasRef} className="w-full h-full block rounded-xl" />
      </div>
    </div>
  );
}
