import React from 'react';
import { JarvisStatus } from '../types/jarvis';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface ArcReactorProps {
  status: JarvisStatus;
  isListening: boolean;
  isSpeaking: boolean;
  onToggleListen: () => void;
  onStopSpeaking: () => void;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  status,
  isListening,
  isSpeaking,
  onToggleListen,
  onStopSpeaking,
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'listening':
        return 'LAUSCHT...';
      case 'thinking':
        return 'DENKT NACH...';
      case 'planning':
        return 'PLANT SCHRITTE...';
      case 'executing_tool':
        return 'FÜHRT TOOL AUS...';
      case 'speaking':
        return 'SPRICHT...';
      case 'awaiting_confirmation':
        return 'AUTORISIERUNG AUSSTEHEND';
      default:
        return 'BEREIT // STANDBY';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return 'text-amber-400 border-amber-400/80 shadow-amber-400/40';
      case 'thinking':
      case 'planning':
      case 'executing_tool':
        return 'text-[var(--hud-primary)] border-[var(--hud-primary)] shadow-[0_0_20px_var(--hud-glow)]';
      case 'speaking':
        return 'text-emerald-400 border-emerald-400/80 shadow-emerald-400/40';
      case 'awaiting_confirmation':
        return 'text-rose-400 border-rose-400/80 shadow-rose-400/40';
      default:
        return 'text-[var(--hud-primary)] border-[var(--hud-border)] shadow-[0_0_12px_var(--hud-dim)]';
    }
  };

  const isWorking = status === 'thinking' || status === 'planning' || status === 'executing_tool';

  return (
    <div className="flex flex-col items-center justify-center p-4 relative select-none">
      {/* Outer ambient glow reacting to dynamic theme */}
      <div
        className={`absolute w-56 h-56 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isListening
            ? 'bg-amber-500/25 scale-110'
            : isSpeaking
            ? 'bg-emerald-500/25 scale-125'
            : isWorking
            ? 'bg-[var(--hud-primary)]/25 scale-120'
            : 'bg-[var(--hud-primary)]/15'
        }`}
      />

      {/* Interactive Arc Reactor Container */}
      <div
        onClick={() => {
          if (isSpeaking) {
            onStopSpeaking();
          } else {
            onToggleListen();
          }
        }}
        className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center cursor-pointer group"
        title={isSpeaking ? 'Sprachausgabe stoppen' : isListening ? 'Zuhören beenden' : 'Mikrofon aktivieren'}
      >
        {/* Layer 1: Outermost dashed telemetry ring */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed border-[var(--hud-border)] transition-transform duration-1000 ${
            isListening || isWorking ? 'animate-spin-fast' : 'animate-spin-slow'
          }`}
          style={{ borderSpacing: '8px' }}
        />

        {/* Layer 2: Counter-rotating geometric segmented ring */}
        <div
          className={`absolute inset-2 rounded-full border border-[var(--hud-border)] border-t-[var(--hud-primary)] border-b-[var(--hud-primary)] transition-all ${
            isListening
              ? 'border-t-amber-400 border-b-amber-400 animate-spin-reverse'
              : 'animate-spin-reverse'
          }`}
        />

        {/* Layer 3: Tech tick marks (12 ticks like a watch / reactor coil) */}
        <div className="absolute inset-4 rounded-full flex items-center justify-center pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-full flex justify-center"
              style={{ transform: `rotate(${i * 30}deg)` }}
            >
              <div
                className={`w-0.5 h-2.5 rounded-full transition-colors ${
                  isListening
                    ? 'bg-amber-400/80 shadow-[0_0_6px_#f59e0b]'
                    : isWorking
                    ? 'bg-[var(--hud-primary)] shadow-[0_0_6px_var(--hud-primary)]'
                    : 'bg-[var(--hud-border)]'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Layer 4: Inner reactor core ring */}
        <div
          className={`absolute inset-7 rounded-full border-2 transition-all duration-300 flex items-center justify-center bg-slate-950/85 backdrop-blur-md shadow-inner ${getStatusColor()}`}
        >
          {/* Audio Wave Frequency Bars */}
          <div className="flex items-center gap-1 h-12 px-2 pointer-events-none z-10">
            {[40, 75, 55, 90, 60, 80, 45].map((height, i) => {
              const animatedHeight = isListening || isSpeaking || isWorking
                ? `${height}%`
                : '20%';
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isListening
                      ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                      : isSpeaking
                      ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                      : isWorking
                      ? 'bg-[var(--hud-primary)] shadow-[0_0_8px_var(--hud-primary)]'
                      : 'bg-[var(--hud-border)]'
                  }`}
                  style={{
                    height: animatedHeight,
                    animation:
                      isListening || isSpeaking || isWorking
                        ? `pulse-hud ${0.4 + (i % 3) * 0.2}s infinite alternate ease-in-out`
                        : 'none',
                  }}
                />
              );
            })}
          </div>

          {/* Core center icon/button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-950/90 rounded-full transition-opacity duration-200">
            {isSpeaking ? (
              <Volume2 className="w-8 h-8 text-emerald-400 animate-pulse" />
            ) : isListening ? (
              <MicOff className="w-8 h-8 text-amber-400 animate-bounce" />
            ) : (
              <Mic className="w-8 h-8 text-[var(--hud-primary)] transition-transform group-hover:scale-110" />
            )}
          </div>
        </div>

        {/* Reactor Core Central Orb */}
        <div
          className={`absolute w-6 h-6 rounded-full pointer-events-none transition-all duration-300 ${
            isListening
              ? 'bg-amber-400/90 shadow-[0_0_18px_#f59e0b]'
              : isSpeaking
              ? 'bg-emerald-400/90 shadow-[0_0_18px_#10b981]'
              : isWorking
              ? 'bg-[var(--hud-primary)] shadow-[0_0_18px_var(--hud-primary)]'
              : 'bg-[var(--hud-primary)]/50 shadow-[0_0_10px_var(--hud-primary)]'
          }`}
        />
      </div>

      {/* Status Banner */}
      <div className="mt-3 flex flex-col items-center gap-1 z-10">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full animate-ping ${
              isListening
                ? 'bg-amber-400'
                : isSpeaking
                ? 'bg-emerald-400'
                : isWorking
                ? 'bg-[var(--hud-primary)]'
                : 'bg-[var(--hud-primary)]'
            }`}
          />
          <span className="hud-title text-xs tracking-widest font-bold text-slate-100 uppercase">
            {getStatusText()}
          </span>
        </div>
        <p className="text-[11px] text-[var(--hud-primary)]/70 font-mono tracking-wider">
          MARK LXXXV // NEURAL INTERFACE
        </p>
      </div>
    </div>
  );
};
