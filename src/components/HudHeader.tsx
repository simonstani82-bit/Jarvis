import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  RotateCcw,
  ShieldAlert,
  Cpu,
  Activity,
  Database,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface HudHeaderProps {
  voiceOutputActive: boolean;
  onToggleVoiceOutput: () => void;
  onToggleTelemetry: () => void;
  onResetChat: () => void;
  isTelemetryOpen: boolean;
  memoryCount: number;
}

export const HudHeader: React.FC<HudHeaderProps> = ({
  voiceOutputActive,
  onToggleVoiceOutput,
  onToggleTelemetry,
  onResetChat,
  isTelemetryOpen,
  memoryCount,
}) => {
  const [sfxActive, setSfxActive] = useState(soundEffects.isEnabled());
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('de-DE', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSfx = () => {
    const newState = soundEffects.toggle();
    setSfxActive(newState);
  };

  return (
    <header className="relative w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between text-xs font-mono select-none z-30">
      {/* Brand & Mark */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded border border-cyan-400/40 bg-cyan-950/40 text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="hud-title font-bold text-sm tracking-widest text-cyan-200">
              J.A.R.V.I.S.
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-semibold">
              MARK LXXXV
            </span>
          </div>
          <p className="text-[10px] text-cyan-400/60 hidden sm:block">
            STARK INDUSTRIES // AUTONOMOUS AGENT
          </p>
        </div>
      </div>

      {/* Center Telemetry Readout */}
      <div className="hidden md:flex items-center gap-5 text-cyan-400/80 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>CORE: <strong className="text-cyan-200 font-bold">100%</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>GEDÄCHTNIS: <strong className="text-cyan-200 font-bold">{memoryCount}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-300 font-semibold">{timeStr} UTC</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Voice Speech Toggle */}
        <button
          onClick={() => {
            soundEffects.playChirp();
            onToggleVoiceOutput();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all ${
            voiceOutputActive
              ? 'border-cyan-400/60 bg-cyan-950/60 text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
          }`}
          title={voiceOutputActive ? 'Sprachausgabe aktiv' : 'Sprachausgabe stumm'}
        >
          {voiceOutputActive ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline text-[11px]">TTS</span>
        </button>

        {/* SFX Toggle */}
        <button
          onClick={handleToggleSfx}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all ${
            sfxActive
              ? 'border-cyan-400/60 bg-cyan-950/60 text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
          }`}
          title={sfxActive ? 'HUD Sound-Effekte an' : 'HUD Sound-Effekte aus'}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">SFX</span>
        </button>

        {/* Data & Telemetry Drawer Toggle */}
        <button
          onClick={() => {
            soundEffects.playChirp();
            onToggleTelemetry();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all ${
            isTelemetryOpen
              ? 'border-amber-400/80 bg-amber-950/40 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40'
          }`}
          title="Tools & Gedächtnis einsehen"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">TOOLS & DATEN</span>
        </button>

        {/* Clear Chat */}
        <button
          onClick={() => {
            soundEffects.playChirp();
            onResetChat();
          }}
          className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
          title="Chatprotokoll leeren"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
