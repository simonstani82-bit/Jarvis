import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  RotateCcw,
  Cpu,
  Activity,
  Database,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { ThemeSelector } from './ThemeSelector';
import { HudTheme } from '../services/themeService';

interface HudHeaderProps {
  voiceOutputActive: boolean;
  onToggleVoiceOutput: () => void;
  onToggleTelemetry: () => void;
  onOpenSystemHealth: () => void;
  onResetChat: () => void;
  isTelemetryOpen: boolean;
  isSystemHealthOpen?: boolean;
  memoryCount: number;
  currentTheme: HudTheme;
  onThemeChange: (theme: HudTheme) => void;
}

export const HudHeader: React.FC<HudHeaderProps> = ({
  voiceOutputActive,
  onToggleVoiceOutput,
  onToggleTelemetry,
  onOpenSystemHealth,
  onResetChat,
  isTelemetryOpen,
  isSystemHealthOpen = false,
  memoryCount,
  currentTheme,
  onThemeChange,
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
    <header className="relative w-full border-b border-[var(--hud-border)] bg-slate-950/80 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between text-xs font-mono select-none z-30 transition-colors duration-300">
      {/* Brand & Mark */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] shadow-[0_0_12px_var(--hud-dim)] transition-colors">
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="hud-title font-bold text-sm tracking-widest text-slate-100">
              J.A.R.V.I.S.
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--hud-accent-bg)] border border-[var(--hud-border)] text-[var(--hud-primary)] font-semibold transition-colors">
              {currentTheme.badge.split(' // ')[0] || 'MARK LXXXV'}
            </span>
          </div>
          <p className="text-[10px] text-[var(--hud-primary)]/70 hidden sm:block transition-colors">
            STARK INDUSTRIES // AUTONOMOUS AGENT
          </p>
        </div>
      </div>

      {/* Center Telemetry Readout */}
      <div className="hidden lg:flex items-center gap-5 text-slate-300 text-[11px]">
        <button
          onClick={() => {
            soundEffects.playStartup();
            onOpenSystemHealth();
          }}
          className="flex items-center gap-1.5 hover:text-[var(--hud-primary)] transition-colors cursor-pointer group"
          title="D3 System Health Performance-Metriken öffnen"
        >
          <Cpu className="w-3.5 h-3.5 text-[var(--hud-primary)] group-hover:animate-pulse" />
          <span>CORE: <strong className="text-[var(--hud-primary)] font-bold group-hover:underline">D3 HEALTH</strong></span>
        </button>
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[var(--hud-primary)]" />
          <span>GEDÄCHTNIS: <strong className="text-slate-100 font-bold">{memoryCount}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--hud-border)] bg-[var(--hud-accent-bg)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-300 font-semibold">{timeStr} UTC</span>
        </div>
      </div>

      {/* Controls & Theme Toggler */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Dynamic HUD Theme Toggler */}
        <ThemeSelector
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
        />

        {/* System Health Diagnostics Toggle Button */}
        <button
          onClick={() => {
            soundEffects.playStartup();
            onOpenSystemHealth();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-all ${
            isSystemHealthOpen
              ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] hover:border-[var(--hud-primary)]'
          }`}
          title="D3 System Health Diagnostic Suite"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline text-[11px]">HEALTH</span>
        </button>

        {/* Voice Speech Toggle */}
        <button
          onClick={() => {
            soundEffects.playChirp();
            onToggleVoiceOutput();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all ${
            voiceOutputActive
              ? 'border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] shadow-[0_0_10px_var(--hud-dim)]'
              : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
          }`}
          title={voiceOutputActive ? 'Sprachausgabe aktiv' : 'Sprachausgabe stumm'}
        >
          {voiceOutputActive ? <Volume2 className="w-3.5 h-3.5 text-[var(--hud-primary)]" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline text-[11px]">TTS</span>
        </button>

        {/* SFX Toggle */}
        <button
          onClick={handleToggleSfx}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded border transition-all ${
            sfxActive
              ? 'border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] shadow-[0_0_10px_var(--hud-dim)]'
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
              : 'border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] hover:border-[var(--hud-primary)]'
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
