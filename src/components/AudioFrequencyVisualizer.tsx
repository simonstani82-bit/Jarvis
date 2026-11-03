import React, { useRef, useEffect, useState } from 'react';
import { Activity, Radio, Waves, BarChart2, Zap, Minimize2, Maximize2 } from 'lucide-react';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { HudTheme } from '../services/themeService';
import { soundEffects } from '../services/soundEffects';

interface AudioFrequencyVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  currentTheme: HudTheme;
}

export const AudioFrequencyVisualizer: React.FC<AudioFrequencyVisualizerProps> = ({
  isListening,
  isSpeaking,
  currentTheme,
}) => {
  const { frequencies, waveform, amplitude, decibels, dominantFrequency, isLiveMicActive } =
    useAudioVisualizer(isListening, isSpeaking);

  const [visualMode, setVisualMode] = useState<'dual' | 'wave' | 'bars'>('dual');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Peak decay tracker for frequency spectrum bars
  const peakLevelsRef = useRef<number[]>(Array(32).fill(0));

  // 60FPS Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with subtle trail fade
      ctx.clearRect(0, 0, width, height);

      // Background acoustic grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Center horizontal line
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      // Quarter horizontal lines
      ctx.moveTo(0, height / 4);
      ctx.lineTo(width, height / 4);
      ctx.moveTo(0, (height * 3) / 4);
      ctx.lineTo(width, (height * 3) / 4);
      // Vertical grid divisions (8 columns)
      for (let x = 0; x < width; x += width / 8) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      const primaryColor = currentTheme.primary || '#00f0ff';
      const rgb = currentTheme.primaryRgb || '0, 240, 255';

      // 1. RENDER FFT FREQUENCY BARS (if mode is 'bars' or 'dual')
      if (visualMode === 'bars' || visualMode === 'dual') {
        const barCount = 32;
        const totalPadding = (barCount - 1) * 2;
        const barWidth = Math.max(2, (width - totalPadding) / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = frequencies[i] || 0.06;
          const barHeight = Math.max(3, val * height * 0.85);
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Peak level tracking with decay
          if (val > peakLevelsRef.current[i]) {
            peakLevelsRef.current[i] = val;
          } else {
            peakLevelsRef.current[i] = Math.max(0.06, peakLevelsRef.current[i] - 0.015);
          }
          const peakY = height - Math.max(3, peakLevelsRef.current[i] * height * 0.85);

          // Bar Gradient
          const gradient = ctx.createLinearGradient(0, height, 0, y);
          if (isListening) {
            gradient.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
            gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.7)');
            gradient.addColorStop(1, '#f59e0b');
          } else if (isSpeaking) {
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
            gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.7)');
            gradient.addColorStop(1, '#10b981');
          } else {
            gradient.addColorStop(0, `rgba(${rgb}, 0.1)`);
            gradient.addColorStop(0.7, `rgba(${rgb}, 0.55)`);
            gradient.addColorStop(1, primaryColor);
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Peak needle dot
          ctx.fillStyle = isListening ? '#fbbf24' : isSpeaking ? '#34d399' : primaryColor;
          ctx.fillRect(x, peakY - 2, barWidth, 1.5);
        }
      }

      // 2. RENDER OSCILLOSCOPE TIME-DOMAIN WAVEFORM (if mode is 'wave' or 'dual')
      if (visualMode === 'wave' || visualMode === 'dual') {
        const points = waveform;
        const step = width / (points.length - 1);
        const centerY = height / 2;

        ctx.beginPath();
        ctx.lineWidth = visualMode === 'dual' ? 2 : 2.5;

        // Glowing wave style
        ctx.strokeStyle = isListening ? '#f59e0b' : isSpeaking ? '#10b981' : primaryColor;
        ctx.shadowColor = isListening ? '#f59e0b' : isSpeaking ? '#10b981' : primaryColor;
        ctx.shadowBlur = isListening || isSpeaking ? 12 : 6;

        for (let j = 0; j < points.length; j++) {
          const x = j * step;
          // Scale wave amplitude: boost when active
          const ampScale = (height / 2) * (visualMode === 'dual' ? 0.65 : 0.85);
          const y = centerY + points[j] * ampScale;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            // Smooth curve
            const prevX = (j - 1) * step;
            const prevY = centerY + points[j - 1] * ampScale;
            const cx = (prevX + x) / 2;
            const cy = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cx, cy);
          }
        }
        ctx.stroke();

        // Reset shadow for next draws
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [frequencies, waveform, visualMode, currentTheme, isListening, isSpeaking]);

  const isActive = isListening || isSpeaking;

  return (
    <div className="w-full my-2 rounded-xl hud-box border-[var(--hud-border)] bg-slate-950/80 shadow-[0_0_15px_var(--hud-dim)] transition-all select-none">
      {/* Visualizer Telemetry Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--hud-border)]/40 text-[10px] font-mono">
        {/* Left: Signal Status */}
        <div className="flex items-center gap-2">
          <Activity
            className={`w-3.5 h-3.5 ${
              isListening
                ? 'text-amber-400 animate-pulse'
                : isSpeaking
                ? 'text-emerald-400 animate-pulse'
                : 'text-[var(--hud-primary)]'
            }`}
          />
          <span className="font-bold uppercase tracking-wider text-slate-200">
            {isLiveMicActive
              ? 'LIVE-MIKROFON // FREQUENZVERLAUF'
              : isListening
              ? 'LAUSCHT // SIGNAL-DETEKTOR'
              : isSpeaking
              ? 'SPRACHAUSGABE // RESONANZ'
              : 'AKUSTISCHES SPEKTROMETER'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isListening
                ? 'bg-amber-400 animate-ping'
                : isSpeaking
                ? 'bg-emerald-400 animate-ping'
                : 'bg-[var(--hud-primary)]'
            }`}
          />
        </div>

        {/* Center: Live Real-time Acoustic Metrics */}
        <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[10px]">
          <span>
            PEAK: <strong className="text-slate-200">{decibels} dB</strong>
          </span>
          <span>
            DOMINANZ: <strong className="text-[var(--hud-primary)]">{dominantFrequency} Hz</strong>
          </span>
          <span>
            PEGEL: <strong className="text-slate-200">{(amplitude * 100).toFixed(0)}%</strong>
          </span>
        </div>

        {/* Right: Mode Toggles & Collapse */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundEffects.playChirp();
              setVisualMode('dual');
            }}
            className={`p-1 rounded transition-colors ${
              visualMode === 'dual'
                ? 'bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] border border-[var(--hud-border)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Kombi-Modus: Oszilloskop & Spektrum"
          >
            <Zap className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              soundEffects.playChirp();
              setVisualMode('wave');
            }}
            className={`p-1 rounded transition-colors ${
              visualMode === 'wave'
                ? 'bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] border border-[var(--hud-border)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Oszilloskop-Wellenform"
          >
            <Waves className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              soundEffects.playChirp();
              setVisualMode('bars');
            }}
            className={`p-1 rounded transition-colors ${
              visualMode === 'bars'
                ? 'bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] border border-[var(--hud-border)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="FFT-Frequenzspektrum"
          >
            <BarChart2 className="w-3 h-3" />
          </button>

          <button
            onClick={() => {
              soundEffects.playChirp();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 ml-1 text-slate-400 hover:text-slate-200"
            title={isExpanded ? 'Visualizer einklappen' : 'Visualizer ausklappen'}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      {isExpanded && (
        <div className="relative px-3 py-2">
          {/* Real-time HTML5 60FPS Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={74}
            className="w-full h-16 sm:h-20 block rounded bg-slate-950/90 border border-[var(--hud-border)]/30"
          />

          {/* Scale Overlay Footer */}
          <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 px-1">
            <span>20 Hz</span>
            <span>125 Hz</span>
            <span>500 Hz</span>
            <span>1 kHz</span>
            <span>4 kHz</span>
            <span>16 kHz</span>
          </div>
        </div>
      )}
    </div>
  );
};
