import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export default function FactoryVisualization() {
  const { room, teamState } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Handle resizing reactively
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Drawing helper functions for cupcake States
    const drawCupcake = (
      cCtx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      state: 'raw' | 'baked' | 'iced' | 'boxed',
      scale: number = 1,
      frostingProgress: number = 1
    ) => {
      cCtx.save();
      cCtx.translate(cx, cy);
      cCtx.scale(scale, scale);

      if (state === 'boxed') {
        // Draw 3D cardboard box
        cCtx.fillStyle = '#d97706'; // Cardboard brown base
        cCtx.beginPath();
        cCtx.roundRect(-14, -26, 28, 26, 3);
        cCtx.fill();
        
        cCtx.strokeStyle = '#92400e';
        cCtx.lineWidth = 1.5;
        cCtx.stroke();

        // Box flap details
        cCtx.fillStyle = '#b45309'; // Darker inner shadow
        cCtx.fillRect(-14, -26, 28, 4);

        // Yellow tape running across top
        cCtx.fillStyle = '#fef08a';
        cCtx.fillRect(-3, -26, 6, 26);
        cCtx.restore();
        return;
      }

      // Cupcake Liner (pleated cup)
      cCtx.fillStyle = '#f8fafc'; // White base liner
      cCtx.beginPath();
      cCtx.moveTo(-9, 0);
      cCtx.lineTo(-11, -11);
      cCtx.lineTo(11, -11);
      cCtx.lineTo(9, 0);
      cCtx.closePath();
      cCtx.fill();
      
      cCtx.strokeStyle = '#cbd5e1';
      cCtx.lineWidth = 1;
      cCtx.stroke();

      // Pleat vertical stripes
      cCtx.strokeStyle = '#e2e8f0';
      cCtx.lineWidth = 0.8;
      for (let offset = -7; offset <= 7; offset += 3.5) {
        cCtx.beginPath();
        cCtx.moveTo(offset * 0.9, 0);
        cCtx.lineTo(offset, -11);
        cCtx.stroke();
      }

      // Cake Dome
      if (state === 'baked' || state === 'iced') {
        cCtx.fillStyle = '#d97706'; // Golden brown dome
        cCtx.beginPath();
        cCtx.arc(0, -11, 10.5, Math.PI, 0);
        cCtx.fill();
        
        // Soft shading
        cCtx.fillStyle = '#b45309';
        cCtx.beginPath();
        cCtx.arc(-3, -15, 1.2, 0, Math.PI * 2);
        cCtx.arc(4, -14, 1.0, 0, Math.PI * 2);
        cCtx.fill();
      } else if (state === 'raw') {
        // Raw yellow batter
        cCtx.fillStyle = '#fef08a';
        cCtx.beginPath();
        cCtx.ellipse(0, -11, 9.5, 3.5, 0, 0, Math.PI * 2);
        cCtx.fill();
        cCtx.strokeStyle = '#eab308';
        cCtx.stroke();
      }

      // Frosting Swirl (stacked pink soft-serve look)
      if (state === 'iced' && frostingProgress > 0) {
        cCtx.save();
        cCtx.scale(frostingProgress, frostingProgress);

        // Bottom swirl layer
        cCtx.fillStyle = '#f472b6';
        cCtx.beginPath();
        cCtx.ellipse(0, -14, 10, 3.5, 0, 0, Math.PI * 2);
        cCtx.fill();

        // Middle swirl layer
        cCtx.fillStyle = '#ec4899';
        cCtx.beginPath();
        cCtx.ellipse(0, -17.5, 7.5, 3, 0, 0, Math.PI * 2);
        cCtx.fill();

        // Top swirl layer
        cCtx.fillStyle = '#f472b6';
        cCtx.beginPath();
        cCtx.ellipse(0, -20.5, 5, 2.5, 0, 0, Math.PI * 2);
        cCtx.fill();

        // Swirl tip
        cCtx.fillStyle = '#fbcfe8';
        cCtx.beginPath();
        cCtx.moveTo(-1.5, -21);
        cCtx.quadraticCurveTo(0, -25, 1.5, -24);
        cCtx.quadraticCurveTo(0, -22, -1.5, -21);
        cCtx.fill();

        // Highlights
        cCtx.fillStyle = '#ffffff';
        cCtx.beginPath();
        cCtx.arc(-2.5, -15, 0.8, 0, Math.PI * 2);
        cCtx.arc(1.5, -18.5, 0.6, 0, Math.PI * 2);
        cCtx.fill();

        cCtx.restore();
      }

      cCtx.restore();
    };

    // 2. Conveyor belt drawing function
    const drawConveyorBelt = (
      cCtx: CanvasRenderingContext2D,
      xStart: number,
      xEnd: number,
      cy: number,
      scrollOffset: number
    ) => {
      cCtx.save();

      // Belt shadow
      cCtx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      cCtx.fillRect(xStart - 10, cy + 9, (xEnd - xStart) + 20, 11);

      // Belt surface (cylindrical metallic bar)
      let beltGrad = cCtx.createLinearGradient(0, cy, 0, cy + 9);
      beltGrad.addColorStop(0, '#1e293b');
      beltGrad.addColorStop(0.3, '#475569');
      beltGrad.addColorStop(0.7, '#334155');
      beltGrad.addColorStop(1, '#0f172a');
      cCtx.fillStyle = beltGrad;
      cCtx.beginPath();
      cCtx.roundRect(xStart - 12, cy, (xEnd - xStart) + 24, 9, 3);
      cCtx.fill();
      
      cCtx.strokeStyle = '#0f172a';
      cCtx.lineWidth = 1.5;
      cCtx.stroke();

      // Legs / support structures
      cCtx.fillStyle = '#64748b';
      cCtx.strokeStyle = '#334155';
      cCtx.lineWidth = 1.8;
      const legInterval = 200;
      for (let lx = xStart + 50; lx < xEnd; lx += legInterval) {
        cCtx.fillRect(lx - 4, cy + 9, 8, 27);
        cCtx.strokeRect(lx - 4, cy + 9, 8, 27);
        cCtx.fillRect(lx - 10, cy + 34, 20, 3);
        cCtx.strokeRect(lx - 10, cy + 34, 20, 3);
      }

      // Spinning rollers
      const rollerSpacing = 35;
      for (let rx = xStart + 8; rx < xEnd; rx += rollerSpacing) {
        const ry = cy + 14;
        cCtx.save();
        cCtx.translate(rx, ry);

        let cylGrad = cCtx.createLinearGradient(-5, 0, 5, 0);
        cylGrad.addColorStop(0, '#334155');
        cylGrad.addColorStop(0.5, '#cbd5e1');
        cylGrad.addColorStop(1, '#334155');
        cCtx.fillStyle = cylGrad;
        cCtx.strokeStyle = '#1e293b';
        cCtx.lineWidth = 1.2;
        cCtx.beginPath();
        cCtx.arc(0, 0, 5, 0, Math.PI * 2);
        cCtx.fill();
        cCtx.stroke();

        // Rotational spinner spoke
        cCtx.rotate(scrollOffset * 0.12);
        cCtx.strokeStyle = '#0f172a';
        cCtx.lineWidth = 1.0;
        cCtx.beginPath();
        cCtx.moveTo(-5, 0);
        cCtx.lineTo(5, 0);
        cCtx.stroke();

        cCtx.restore();
      }

      cCtx.restore();
    };

    // 3. Machine drawer functions
    const drawStandMixer = (
      cCtx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      width: number,
      height: number,
      isRunning: boolean,
      frame: number
    ) => {
      cCtx.save();
      cCtx.translate(cx, cy);

      // Mixer base
      cCtx.fillStyle = '#1e40af';
      cCtx.beginPath();
      cCtx.roundRect(8, height - 12, width - 16, 12, 5);
      cCtx.fill();
      cCtx.fillStyle = '#3b82f6';
      cCtx.beginPath();
      cCtx.roundRect(8, height - 12, width - 16, 9, 3);
      cCtx.fill();
      cCtx.strokeStyle = '#1d4ed8';
      cCtx.lineWidth = 1.5;
      cCtx.stroke();

      // Column
      let colGrad = cCtx.createLinearGradient(12, 0, 40, 0);
      colGrad.addColorStop(0, '#1d4ed8');
      colGrad.addColorStop(0.4, '#60a5fa');
      colGrad.addColorStop(1, '#1e40af');
      cCtx.fillStyle = colGrad;
      cCtx.beginPath();
      cCtx.roundRect(12, 16, 26, height - 26, 3);
      cCtx.fill();

      // Top Arm
      let armGrad = cCtx.createLinearGradient(12, 10, width - 10, 30);
      armGrad.addColorStop(0, '#3b82f6');
      armGrad.addColorStop(0.4, '#60a5fa');
      armGrad.addColorStop(1, '#93c5fd');
      cCtx.fillStyle = armGrad;
      cCtx.beginPath();
      cCtx.moveTo(12, 16);
      cCtx.lineTo(width - 16, 16);
      cCtx.quadraticCurveTo(width - 8, 16, width - 8, 30);
      cCtx.lineTo(width - 8, 40);
      cCtx.quadraticCurveTo(width - 8, 45, width - 16, 45);
      cCtx.lineTo(34, 45);
      cCtx.lineTo(26, height - 26);
      cCtx.lineTo(12, height - 26);
      cCtx.closePath();
      cCtx.fill();

      // Metal Bowl
      let bowlGrad = cCtx.createLinearGradient(40, 0, width - 12, 0);
      bowlGrad.addColorStop(0, '#334155');
      bowlGrad.addColorStop(0.25, '#94a3b8');
      bowlGrad.addColorStop(0.5, '#cbd5e1');
      bowlGrad.addColorStop(0.8, '#f8fafc');
      bowlGrad.addColorStop(1, '#334155');
      cCtx.fillStyle = bowlGrad;
      cCtx.beginPath();
      cCtx.arc(width - 30, height - 30, 25, 0, Math.PI, false);
      cCtx.closePath();
      cCtx.fill();
      cCtx.strokeStyle = '#475569';
      cCtx.stroke();

      // Rotating Paddle
      cCtx.save();
      cCtx.translate(width - 30, 48);
      if (isRunning) {
        cCtx.rotate(frame * 0.16);
      }
      cCtx.strokeStyle = '#94a3b8';
      cCtx.lineWidth = 2.5;
      cCtx.beginPath();
      cCtx.moveTo(0, 0);
      cCtx.lineTo(0, 12);
      cCtx.stroke();
      
      cCtx.strokeStyle = '#cbd5e1';
      cCtx.lineWidth = 1.8;
      cCtx.beginPath();
      cCtx.ellipse(0, 18, 7, 10, 0, 0, Math.PI * 2);
      cCtx.stroke();
      cCtx.restore();

      // Nozzle drop
      cCtx.fillStyle = '#475569';
      cCtx.fillRect(width - 18, 45, 10, 8);
      cCtx.fillStyle = '#94a3b8';
      cCtx.fillRect(width - 15, 53, 4, 6);

      cCtx.restore();
    };

    const drawOven = (
      cCtx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      width: number,
      height: number,
      isRunning: boolean,
      frame: number,
      bakingMuffins: { progress: number; xOffset: number }[]
    ) => {
      cCtx.save();
      cCtx.translate(cx, cy);

      // Body cabinet
      let bodyGrad = cCtx.createLinearGradient(0, 0, width, height);
      bodyGrad.addColorStop(0, '#c084fc');
      bodyGrad.addColorStop(0.5, '#a855f7');
      bodyGrad.addColorStop(1, '#7e22ce');
      cCtx.fillStyle = bodyGrad;
      cCtx.beginPath();
      cCtx.roundRect(0, 0, width, height, 14);
      cCtx.fill();
      cCtx.strokeStyle = '#581c87';
      cCtx.lineWidth = 2;
      cCtx.stroke();

      // Bevel top highlight
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      cCtx.fillRect(4, 4, width - 8, 6);

      // Circular door frame
      let rimGrad = cCtx.createRadialGradient(width/2, height/2 - 4, 38, width/2, height/2 - 4, 48);
      rimGrad.addColorStop(0, '#e2e8f0');
      rimGrad.addColorStop(0.7, '#cbd5e1');
      rimGrad.addColorStop(1, '#475569');
      cCtx.fillStyle = rimGrad;
      cCtx.beginPath();
      cCtx.arc(width/2, height/2 - 4, 48, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.strokeStyle = '#1e293b';
      cCtx.lineWidth = 2;
      cCtx.stroke();

      // Window Glass
      cCtx.fillStyle = '#1e1b4b';
      cCtx.beginPath();
      cCtx.arc(width/2, height/2 - 4, 40, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.stroke();

      // Orange baking glow
      if (isRunning) {
        let glow = cCtx.createRadialGradient(width/2, height/2 - 4, 3, width/2, height/2 - 4, 38);
        glow.addColorStop(0, 'rgba(253, 186, 116, 0.7)');
        glow.addColorStop(0.4, 'rgba(249, 115, 22, 0.35)');
        glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
        cCtx.fillStyle = glow;
        cCtx.beginPath();
        cCtx.arc(width/2, height/2 - 4, 40, 0, Math.PI * 2);
        cCtx.fill();
      }

      // Draw inside the oven
      cCtx.save();
      cCtx.beginPath();
      cCtx.arc(width/2, height/2 - 4, 38, 0, Math.PI * 2);
      cCtx.clip();

      bakingMuffins.forEach(m => {
        const mx = width/2 + m.xOffset;
        const my = height/2 + 22;
        const state = m.progress > 0.75 ? 'baked' : 'raw';
        const scale = 0.52 + m.progress * 0.28;
        drawCupcake(cCtx, mx, my, state, scale, 0);
      });

      cCtx.restore();

      // Rotating Fan
      cCtx.save();
      cCtx.translate(width/2, height/2 - 16);
      if (isRunning) {
        cCtx.rotate(frame * 0.1);
      }
      cCtx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      cCtx.beginPath();
      cCtx.arc(0, 0, 3.5, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
      cCtx.lineWidth = 2.5;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
        cCtx.beginPath();
        cCtx.moveTo(0, 0);
        cCtx.lineTo(12 * Math.cos(angle), 12 * Math.sin(angle));
        cCtx.stroke();
      }
      cCtx.restore();

      // Label BAKE-01
      cCtx.fillStyle = '#0f172a';
      cCtx.fillRect(width/2 - 22, 10, 44, 12);
      cCtx.fillStyle = '#ffffff';
      cCtx.font = 'bold 6px monospace';
      cCtx.textAlign = 'center';
      cCtx.fillText('BAKE-01', width/2, 18);

      // Status indicator
      cCtx.beginPath();
      cCtx.arc(14, 14, 3.5, 0, Math.PI * 2);
      cCtx.fillStyle = isRunning ? '#10b981' : '#eab308';
      cCtx.fill();
      cCtx.strokeStyle = '#0f172a';
      cCtx.stroke();

      // Tunnel tunnels
      cCtx.fillStyle = '#0f172a';
      cCtx.fillRect(-5, height - 36, 5, 22);
      cCtx.fillRect(width, height - 36, 5, 22);

      cCtx.restore();
    };

    const drawFrostingMachine = (
      cCtx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      width: number,
      height: number,
      isRunning: boolean,
      frame: number,
      nozzleYOffset: number
    ) => {
      cCtx.save();
      cCtx.translate(cx, cy);

      // Machine Base
      let baseGrad = cCtx.createLinearGradient(0, 0, width, height);
      baseGrad.addColorStop(0, '#fbcfe8');
      baseGrad.addColorStop(0.5, '#f472b6');
      baseGrad.addColorStop(1, '#be185d');
      cCtx.fillStyle = baseGrad;
      cCtx.beginPath();
      cCtx.roundRect(10, height - 16, width - 20, 16, 5);
      cCtx.fill();
      cCtx.strokeStyle = '#be185d';
      cCtx.stroke();

      // Column & Arm
      let armGrad = cCtx.createLinearGradient(12, 10, width - 8, 30);
      armGrad.addColorStop(0, '#f472b6');
      armGrad.addColorStop(0.5, '#fbcfe8');
      armGrad.addColorStop(1, '#fdf2f8');
      cCtx.fillStyle = armGrad;
      cCtx.beginPath();
      cCtx.moveTo(12, 35);
      cCtx.lineTo(12, height - 16);
      cCtx.lineTo(30, height - 16);
      cCtx.lineTo(30, 42);
      cCtx.lineTo(width - 16, 42);
      cCtx.quadraticCurveTo(width - 8, 42, width - 8, 52);
      cCtx.lineTo(width - 8, 68);
      cCtx.lineTo(width - 22, 68);
      cCtx.lineTo(width - 22, 58);
      cCtx.lineTo(12, 35);
      cCtx.closePath();
      cCtx.fill();

      // Glass Cylinder (frosting container)
      const gX = 30;
      const gY = 8;
      const gH = 34;
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      cCtx.fillRect(gX, gY, 40, gH);

      // Frosting fill inside glass
      let frostingGrad = cCtx.createLinearGradient(0, 0, 40, 0);
      frostingGrad.addColorStop(0, '#db2777');
      frostingGrad.addColorStop(0.4, '#f472b6');
      frostingGrad.addColorStop(1, '#fbcfe8');
      cCtx.fillStyle = frostingGrad;
      cCtx.beginPath();
      cCtx.roundRect(gX + 3, gY + 3, 34, gH - 5, 2);
      cCtx.fill();

      // Glass highlights
      cCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      cCtx.lineWidth = 1.5;
      cCtx.strokeRect(gX, gY, 40, gH);
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      cCtx.fillRect(gX + 4, gY + 2, 5, gH - 3);

      // Lid
      cCtx.fillStyle = '#db2777';
      cCtx.fillRect(gX - 2, gY - 3, 44, 3);

      // Nozzle Assembly
      cCtx.save();
      cCtx.translate(width - 28, 68 + nozzleYOffset);

      cCtx.fillStyle = '#64748b';
      cCtx.fillRect(-8, -4, 16, 8);
      cCtx.strokeRect(-8, -4, 16, 8);

      cCtx.fillStyle = '#db2777';
      cCtx.beginPath();
      cCtx.moveTo(-5, 4);
      cCtx.lineTo(-2, 14);
      cCtx.lineTo(2, 14);
      cCtx.lineTo(5, 4);
      cCtx.closePath();
      cCtx.fill();
      cCtx.stroke();

      cCtx.fillStyle = '#94a3b8';
      cCtx.fillRect(-1.5, 14, 3, 2);

      cCtx.restore();

      // Label ICE-01
      cCtx.fillStyle = '#0f172a';
      cCtx.beginPath();
      cCtx.roundRect(14, height - 12, 42, 9, 2);
      cCtx.fill();
      cCtx.fillStyle = '#ffffff';
      cCtx.font = 'bold 6px monospace';
      cCtx.textAlign = 'center';
      cCtx.fillText('ICE-01', 35, height - 5);

      // Status indicator
      cCtx.beginPath();
      cCtx.arc(width - 16, 26, 3.5, 0, Math.PI * 2);
      cCtx.fillStyle = isRunning ? '#10b981' : '#eab308';
      cCtx.fill();
      cCtx.strokeStyle = '#0f172a';
      cCtx.stroke();

      cCtx.restore();
    };

    const drawPackagingMachine = (
      cCtx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      width: number,
      height: number,
      isRunning: boolean,
      frame: number,
      clawYOffset: number,
      isClawHoldingBox: boolean
    ) => {
      cCtx.save();
      cCtx.translate(cx, cy);

      // Body green cabinet
      let bodyGrad = cCtx.createLinearGradient(0, 0, width, height);
      bodyGrad.addColorStop(0, '#86efac');
      bodyGrad.addColorStop(0.5, '#4ade80');
      bodyGrad.addColorStop(1, '#16a34a');
      cCtx.fillStyle = bodyGrad;
      cCtx.beginPath();
      cCtx.roundRect(0, 0, width, height, 14);
      cCtx.fill();
      cCtx.strokeStyle = '#14532d';
      cCtx.lineWidth = 2;
      cCtx.stroke();

      // Bevel top
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      cCtx.fillRect(4, 4, width - 8, 6);

      // Dark glass viewport
      cCtx.fillStyle = '#0f172a';
      cCtx.beginPath();
      cCtx.roundRect(12, 26, width - 36, 52, 6);
      cCtx.fill();
      cCtx.strokeStyle = '#334155';
      cCtx.lineWidth = 2;
      cCtx.beginPath();
      cCtx.roundRect(12, 26, width - 36, 52, 6);
      cCtx.stroke();

      // Claw Mechanism
      cCtx.save();
      cCtx.beginPath();
      cCtx.roundRect(13, 27, width - 38, 50, 5);
      cCtx.clip();

      cCtx.translate(width/2 - 12, 26 + clawYOffset);

      // Metal pole
      cCtx.strokeStyle = '#94a3b8';
      cCtx.lineWidth = 3.5;
      cCtx.beginPath();
      cCtx.moveTo(0, -25);
      cCtx.lineTo(0, 8);
      cCtx.stroke();

      // Claw bracket
      cCtx.fillStyle = '#475569';
      cCtx.fillRect(-10, 8, 20, 5);

      // Claw hands
      cCtx.strokeStyle = '#cbd5e1';
      cCtx.lineWidth = 2;
      cCtx.beginPath();
      cCtx.moveTo(-8, 13);
      cCtx.lineTo(-10, 23);
      cCtx.lineTo(-5, 25);
      cCtx.stroke();

      cCtx.beginPath();
      cCtx.moveTo(8, 13);
      cCtx.lineTo(10, 23);
      cCtx.lineTo(5, 25);
      cCtx.stroke();

      // Box packaging visual
      if (isClawHoldingBox) {
        cCtx.fillStyle = '#d97706';
        cCtx.fillRect(-10, 20, 20, 18);
        cCtx.strokeStyle = '#92400e';
        cCtx.lineWidth = 0.8;
        cCtx.strokeRect(-10, 20, 20, 18);
      }

      cCtx.restore();

      // Status indicator panel
      const px = width - 16;
      const lightColors = [
        isRunning ? '#10b981' : '#047857',
        isRunning && Math.sin(frame * 0.08) > 0 ? '#f59e0b' : '#b45309',
        '#ef4444'
      ];
      lightColors.forEach((color, idx) => {
        cCtx.beginPath();
        cCtx.arc(px, 26 + idx * 8, 2.5, 0, Math.PI * 2);
        cCtx.fillStyle = color;
        cCtx.fill();
        cCtx.strokeStyle = '#0f172a';
        cCtx.lineWidth = 0.8;
        cCtx.stroke();
      });

      // Small square buttons
      cCtx.fillStyle = '#dc2626';
      cCtx.fillRect(px - 3.5, 54, 5.5, 4);
      cCtx.fillStyle = '#2563eb';
      cCtx.fillRect(px - 3.5, 61, 5.5, 4);

      // Label PACK-01
      cCtx.fillStyle = '#0f172a';
      cCtx.beginPath();
      cCtx.roundRect(12, 10, 44, 11, 2);
      cCtx.fill();
      cCtx.fillStyle = '#ffffff';
      cCtx.font = 'bold 6px monospace';
      cCtx.textAlign = 'center';
      cCtx.fillText('PACK-01', 34, 18);

      // Side tunnels
      cCtx.fillStyle = '#0f172a';
      cCtx.fillRect(-5, height - 30, 5, 18);
      cCtx.fillRect(width, height - 30, 5, 18);

      cCtx.restore();
    };

    // 4. Background details drawing
    const drawBackgroundPipes = (cCtx: CanvasRenderingContext2D, w: number, h: number) => {
      cCtx.save();
      
      const drawPipeLine = (
        px1: number, py1: number, px2: number, py2: number,
        cLight: string, cBase: string, cDark: string, thick: number
      ) => {
        let grad = cCtx.createLinearGradient(px1, py1, px2, py2);
        grad.addColorStop(0, cDark);
        grad.addColorStop(0.35, cLight);
        grad.addColorStop(0.55, cBase);
        grad.addColorStop(1, cDark);

        cCtx.strokeStyle = grad;
        cCtx.lineWidth = thick;
        cCtx.lineCap = 'round';
        cCtx.beginPath();
        cCtx.moveTo(px1, py1);
        cCtx.lineTo(px2, py2);
        cCtx.stroke();

        // Joint connectors
        cCtx.fillStyle = cDark;
        cCtx.strokeStyle = cLight;
        cCtx.lineWidth = 1;
        const drawRing = (rx: number, ry: number) => {
          cCtx.beginPath();
          cCtx.arc(rx, ry, thick / 2 + 2, 0, Math.PI * 2);
          cCtx.fill();
          cCtx.stroke();
        };
        drawRing(px1, py1);
        drawRing(px2, py2);
      };

      // Background horizontal & vertical blue pipes
      drawPipeLine(0, 36, 185, 36, '#93c5fd', '#3b82f6', '#1e40af', 11);
      drawPipeLine(185, 36, 185, 120, '#93c5fd', '#3b82f6', '#1e40af', 11);

      // Pink pipes
      drawPipeLine(0, 55, 700, 55, '#fbcfe8', '#f472b6', '#be185d', 10);
      drawPipeLine(700, 55, 700, 110, '#fbcfe8', '#f472b6', '#be185d', 10);

      // Yellow/orange pipes
      drawPipeLine(280, 72, 980, 72, '#fef08a', '#fbbf24', '#b45309', 8);
      drawPipeLine(980, 72, 980, 130, '#fef08a', '#fbbf24', '#b45309', 8);

      cCtx.restore();
    };

    const drawChalkboard = (cCtx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) => {
      cCtx.save();
      
      // Frame
      cCtx.fillStyle = '#7c2d12';
      cCtx.beginPath();
      cCtx.roundRect(cx, cy, w, h, 4);
      cCtx.fill();
      cCtx.strokeStyle = '#451a03';
      cCtx.lineWidth = 2;
      cCtx.strokeRect(cx, cy, w, h);

      // Board
      cCtx.fillStyle = '#064e3b';
      cCtx.beginPath();
      cCtx.roundRect(cx + 4, cy + 4, w - 8, h - 8, 2);
      cCtx.fill();

      // Goals text
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      cCtx.font = 'bold 7.5px "Courier New", monospace';
      cCtx.textAlign = 'left';
      cCtx.fillText("Today's Goal", cx + 10, cy + 14);

      cCtx.font = '6.5px "Courier New", monospace';
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      cCtx.fillText("[x] Find the mode", cx + 10, cy + 24);
      cCtx.fillText("[x] Bake Muffins", cx + 10, cy + 32);
      cCtx.fillText("[ ] More Happiness", cx + 10, cy + 40);

      // Small drawing
      cCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      cCtx.lineWidth = 0.8;
      cCtx.beginPath();
      cCtx.moveTo(cx + w - 20, cy + h - 10);
      cCtx.lineTo(cx + w - 22, cy + h - 18);
      cCtx.lineTo(cx + w - 12, cy + h - 18);
      cCtx.lineTo(cx + w - 14, cy + h - 10);
      cCtx.closePath();
      cCtx.arc(cx + w - 17, cy + h - 18, 5, Math.PI, 0);
      cCtx.stroke();

      cCtx.restore();
    };

    const drawPendantLamp = (cCtx: CanvasRenderingContext2D, lx: number, ly: number, color: string, isRunning: boolean) => {
      cCtx.save();

      // Cord
      cCtx.strokeStyle = '#475569';
      cCtx.lineWidth = 1.2;
      cCtx.beginPath();
      cCtx.moveTo(lx, 0);
      cCtx.lineTo(lx, ly - 8);
      cCtx.stroke();

      // Shade
      cCtx.fillStyle = color;
      cCtx.beginPath();
      cCtx.arc(lx, ly - 8, 12, Math.PI, 0, false);
      cCtx.closePath();
      cCtx.fill();
      cCtx.strokeStyle = '#334155';
      cCtx.lineWidth = 1.2;
      cCtx.stroke();

      // Bulb
      cCtx.fillStyle = '#fef08a';
      cCtx.beginPath();
      cCtx.arc(lx, ly - 7, 3.5, 0, Math.PI * 2);
      cCtx.fill();

      // Glow light cone
      if (isRunning) {
        let grad = cCtx.createLinearGradient(lx, ly - 4, lx, ly + 240);
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
        grad.addColorStop(0.4, 'rgba(254, 240, 138, 0.12)');
        grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        
        cCtx.fillStyle = grad;
        cCtx.beginPath();
        cCtx.moveTo(lx - 4, ly - 4);
        cCtx.lineTo(lx - 75, ly + 240);
        cCtx.lineTo(lx + 75, ly + 240);
        cCtx.lineTo(lx + 4, ly - 4);
        cCtx.closePath();
        cCtx.fill();
      }

      cCtx.restore();
    };

    // 5. MAIN RENDER LOOP
    const render = () => {
      const activeTime = performance.now();
      if (lastTimeRef.current === 0) lastTimeRef.current = activeTime;
      const dt = (activeTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = activeTime;

      const isRunning = room?.status === 'active' && teamState?.status === 'active';

      // Increment running animation time only if room is active
      if (isRunning) {
        timeRef.current += dt;
      }

      const t = timeRef.current;
      const frame = Math.floor(t * 60);

      // Clean & configure scaling for responsiveness
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);

      const logicalW = 1200;
      const logicalH = 420;
      const clientW = canvas.width / dpr;
      const clientH = canvas.height / dpr;
      const scaleX = clientW / logicalW;
      const scaleY = clientH / logicalH;
      ctx.scale(scaleX, scaleY);

      // Draw cream walls
      ctx.fillStyle = '#fdf8f5';
      ctx.fillRect(0, 0, logicalW, logicalH);

      // Draw floor tiles
      ctx.fillStyle = '#fcf3e3';
      ctx.fillRect(0, 310, logicalW, 110);
      
      ctx.strokeStyle = '#f3e5cd';
      ctx.lineWidth = 1;
      for (let ty = 310; ty <= 420; ty += 18) {
        ctx.beginPath();
        ctx.moveTo(0, ty);
        ctx.lineTo(logicalW, ty);
        ctx.stroke();
      }
      for (let tx = -120; tx <= logicalW + 120; tx += 55) {
        ctx.beginPath();
        ctx.moveTo(tx, 420);
        ctx.lineTo(tx + 25, 310);
        ctx.stroke();
      }

      // Draw background decorations
      drawBackgroundPipes(ctx, logicalW, logicalH);
      drawChalkboard(ctx, 1025, 45, 140, 56);
      drawPendantLamp(ctx, 150, 45, '#86efac', isRunning);
      drawPendantLamp(ctx, 480, 45, '#93c5fd', isRunning);
      drawPendantLamp(ctx, 800, 45, '#fbcfe8', isRunning);

      // Draw support legs & Conveyor Belts
      const scrollOffset = t * 25; // 25 px/sec
      drawConveyorBelt(ctx, 50, 1150, 290, scrollOffset);
      drawConveyorBelt(ctx, 100, 1100, 380, -scrollOffset); // moves left

      // 6. Draw active cupcakes on top conveyor belt (Mixer exit is 170, Packaging entry is 920)
      const spawnX = 140;
      const spacing = 50;
      const speed = 25;

      const currentCycle = Math.floor(t / 2);
      const startJ = Math.max(0, currentCycle - 25);
      const endJ = currentCycle;

      // Gather cupcake coordinates to render or check machine overlaps
      const topCupcakes: { x: number; state: 'raw' | 'baked' | 'iced' | 'boxed'; progress: number }[] = [];
      const bakingMuffinsInOven: { progress: number; xOffset: number }[] = [];
      let activeMuffinAtFrosting = null;
      let activeMuffinAtPackaging = null;

      for (let j = startJ; j <= endJ; j++) {
        const cx = spawnX + speed * (t - 2 * j);
        if (cx >= 140 && cx <= 1070) {
          // Determine cupcake state based on x-coordinate
          let state: 'raw' | 'baked' | 'iced' | 'boxed' = 'raw';
          let progress = 1;

          if (cx < 320) {
            state = 'raw';
          } else if (cx >= 320 && cx <= 480) {
            // Baking inside the oven
            state = 'raw';
            progress = (cx - 320) / 160; // bake progress 0 to 1
            bakingMuffinsInOven.push({ progress, xOffset: cx - 400 });
          } else if (cx > 480 && cx < 700) {
            state = 'baked';
          } else if (cx >= 700 && cx <= 715) {
            // Frosting is growing under ICE-01 nozzle
            state = 'iced';
            progress = (cx - 700) / 15;
            activeMuffinAtFrosting = cx;
          } else if (cx > 715 && cx < 980) {
            state = 'iced';
          } else if (cx >= 980 && cx <= 995) {
            // Box is being placed by PACK-01 claw
            state = cx >= 988 ? 'boxed' : 'iced';
            progress = (cx - 980) / 15;
            activeMuffinAtPackaging = cx;
          } else {
            state = 'boxed';
          }

          topCupcakes.push({ x: cx, state, progress });
        }
      }

      // Draw top cupcakes (only draw visible ones: Mixer-Oven 170-320, Oven-Frosting 480-630, Frosting-Packaging 770-920, and Boxed exiting packaging 1070)
      topCupcakes.forEach(c => {
        const cy = 290;
        const isBetweenMixerAndOven = c.x >= 170 && c.x <= 320;
        const isBetweenOvenAndFrosting = c.x >= 480 && c.x <= 630;
        const isBetweenFrostingAndPackaging = c.x >= 770 && c.x <= 920;
        const isExitingPackaging = c.x > 1070;

        // If it is in the visible segments, draw it!
        if (isBetweenMixerAndOven) {
          drawCupcake(ctx, c.x, cy, c.state, 0.8, c.progress);
        } else if (isBetweenOvenAndFrosting) {
          drawCupcake(ctx, c.x, cy, c.state, 0.8, c.progress);
        } else if (isBetweenFrostingAndPackaging) {
          drawCupcake(ctx, c.x, cy, c.state, 0.8, c.progress);
        } else if (isExitingPackaging) {
          drawCupcake(ctx, c.x, cy, c.state, 0.8, c.progress);
        }
      });

      // 7. Draw bottom conveyor belt cupcakes (Exactly 5 finished moving right to left)
      const lowerSpacing = 200;
      for (let k = 0; k < 5; k++) {
        const lx = 100 + ((1000 - (30 * t + k * lowerSpacing) % 1000) % 1000);
        drawCupcake(ctx, lx, 380, 'iced', 0.82, 1);
      }

      // 8. Calculate dynamic machine tool movements based on spatial overlaps
      let nozzleYOffset = 0;
      if (activeMuffinAtFrosting !== null) {
        const frostingDist = activeMuffinAtFrosting - 700; // 0 to 15
        nozzleYOffset = 9 * Math.sin(Math.PI * (frostingDist / 15));
      }

      let clawYOffset = 0;
      let isClawHoldingBox = false;
      if (activeMuffinAtPackaging !== null) {
        const packagingDist = activeMuffinAtPackaging - 980; // 0 to 15
        clawYOffset = 18 * Math.sin(Math.PI * (packagingDist / 15));
        isClawHoldingBox = packagingDist < 8; // holds the box during descent
      }

      // 9. Draw Machine structures on top of the conveyor belt and cupcakes
      drawStandMixer(ctx, 40, 150, 110, 140, !!(isRunning && teamState?.machines?.mixing?.active), frame);
      drawOven(ctx, 315, 145, 170, 145, !!(isRunning && teamState?.machines?.baking?.active), frame, bakingMuffinsInOven);
      drawFrostingMachine(ctx, 630, 140, 130, 150, !!(isRunning && teamState?.machines?.icing?.active), frame, nozzleYOffset);
      drawPackagingMachine(ctx, 920, 140, 135, 150, !!(isRunning && teamState?.machines?.packaging?.active), frame, clawYOffset, isClawHoldingBox);

      // Yellow batter stream from mixer nozzle
      if (isRunning && teamState?.machines?.mixing?.active) {
        const offsetInCycle = t % 2;
        if (offsetInCycle < 0.4) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(138, 209, 4, 73);
          
          // Outer edge outline
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(138, 209, 4, 73);
        }
      }

      ctx.restore();

      // Schedule next frame
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [room?.status, teamState]);

  return (
    <div className="bg-[#fefaf4] rounded-[24px] border-2 border-[#f0e4d0] shadow-sm overflow-hidden flex flex-col h-full select-none">
      {/* Title Header bar */}
      <div className="bg-[#ffebe3] px-4 py-2 border-b-2 border-[#f5ded4] font-bold text-green-700 font-pixel text-[9px] tracking-widest uppercase flex items-center space-x-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-sm border border-green-700"></span>
        </span>
        <span>Factory Floor Live Feed</span>
      </div>

      {/* Canvas view box container */}
      <div ref={containerRef} className="flex-1 bg-[#fff8ef] p-1.5 relative min-h-[180px]">
        <canvas ref={canvasRef} className="block w-full h-full rounded-2xl" />
      </div>
    </div>
  );
}
