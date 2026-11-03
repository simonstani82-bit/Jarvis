import React from 'react';
import { JarvisStatus } from '../types/jarvis';
import { Mic, MicOff, Volume2, Radio } from 'lucide-react';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';

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
  // Capture real-time microphone frequency data and speech amplitude
  const { frequencies, radialBars, amplitude, decibels, isLiveMicActive } = useAudioVisualizer(
    isListening,
    isSpeaking
  );

  const getStatusText = () => {
    switch (status) {
      case 'listening':
        return isLiveMicActive ? 'LAUSCHT // LIVE MIKROFON AKTIV' : 'LAUSCHT...';
      case 'thinking':
        return 'DENKT NACH...';
      case 'planning':
        return 'PLANT SCHRITTE...';
      case 'executing_tool':
        return 'FÜHRT TOOL AUS...';
      case 'speaking':
        return 'SPRICHT // AUDIO-SYNTHESE';
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
  const isActiveAudio = isListening || isSpeaking;

  // Symmetrical frequency bar mapping for core equalizer (11 bars: low -> mid -> high -> mid -> low)
  const coreBarIndices = [2, 4, 6, 8, 10, 12, 11, 9, 7, 5, 3];

  return (
    <div className="flex flex-col items-center justify-center p-4 relative select-none">
      {/* Outer ambient glow reacting dynamically to live audio amplitude */}
      <div
        className={`absolute w-56 h-56 rounded-full blur-3xl pointer-events-none transition-transform duration-100 ${
          isListening
            ? 'bg-amber-500/30'
            : isSpeaking
            ? 'bg-emerald-500/30'
            : isWorking
            ? 'bg-[var(--hud-primary)]/25'
            : 'bg-[var(--hud-primary)]/15'
        }`}
        style={{
          transform: `scale(${1 + amplitude * 0.45})`,
          opacity: 0.6 + amplitude * 0.4,
        }}
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
        className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center cursor-pointer group"
        title={isSpeaking ? 'Sprachausgabe stoppen' : isListening ? 'Zuhören beenden' : 'Mikrofon aktivieren'}
      >
        {/* Layer 0: Circular Radial Frequency Waveform Spikes (24 ray points) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {radialBars.map((val, i) => {
            const angle = i * 15;
            const barHeight = Math.max(3, Math.round(val * 24));
            return (
              <div
                key={i}
                className="absolute flex items-start justify-center"
                style={{
                  transform: `rotate(${angle}deg)`,
                  height: '100%',
                  width: '2px',
                }}
              >
                <div
                  className={`w-0.5 rounded-full transition-all duration-75 ${
                    isListening
                      ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                      : isSpeaking
                      ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                      : 'bg-[var(--hud-border)]'
                  }`}
                  style={{
                    height: `${barHeight}px`,
                    opacity: isActiveAudio ? Math.max(0.35, val) : 0.25,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Layer 1: Outermost dashed telemetry ring */}
        <div
          className={`absolute inset-2 rounded-full border border-dashed border-[var(--hud-border)] transition-transform duration-700 ${
            isActiveAudio || isWorking ? 'animate-spin-fast' : 'animate-spin-slow'
          }`}
          style={{ borderSpacing: '8px' }}
        />

        {/* Layer 2: Counter-rotating geometric segmented ring */}
        <div
          className={`absolute inset-4 rounded-full border border-[var(--hud-border)] border-t-[var(--hud-primary)] border-b-[var(--hud-primary)] transition-all ${
            isListening
              ? 'border-t-amber-400 border-b-amber-400 animate-spin-reverse'
              : isSpeaking
              ? 'border-t-emerald-400 border-b-emerald-400 animate-spin-reverse'
              : 'animate-spin-reverse'
          }`}
        />

        {/* Layer 3: Tech tick marks (12 ticks like a watch / reactor coil) */}
        <div className="absolute inset-6 rounded-full flex items-center justify-center pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-full flex justify-center"
              style={{ transform: `rotate(${i * 30}deg)` }}
            >
              <div
                className={`w-0.5 h-2.5 rounded-full transition-colors ${
                  isListening
                    ? 'bg-amber-400/90 shadow-[0_0_6px_#f59e0b]'
                    : isSpeaking
                    ? 'bg-emerald-400/90 shadow-[0_0_6px_#10b981]'
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
          className={`absolute inset-9 rounded-full border-2 transition-all duration-150 flex items-center justify-center bg-slate-950/90 backdrop-blur-md shadow-inner ${getStatusColor()}`}
          style={{
            transform: `scale(${1 + amplitude * 0.12})`,
          }}
        >
          {/* Real-time Core Frequency Waveform Bars */}
          <div className="flex items-center gap-1 h-14 px-2 pointer-events-none z-10">
            {coreBarIndices.map((idx, i) => {
              const freqVal = frequencies[idx] || 0.1;
              const barHeight = Math.max(12, Math.min(100, Math.round(freqVal * 100)));

              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isListening
                      ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                      : isSpeaking
                      ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                      : isWorking
                      ? 'bg-[var(--hud-primary)] shadow-[0_0_8px_var(--hud-primary)]'
                      : 'bg-[var(--hud-border)]'
                  }`}
                  style={{
                    height: `${barHeight}%`,
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

        {/* Reactor Core Central Orb with amplitude scale reaction */}
        <div
          className={`absolute rounded-full pointer-events-none transition-all duration-75 ${
            isListening
              ? 'bg-amber-400/90 shadow-[0_0_22px_#f59e0b]'
              : isSpeaking
              ? 'bg-emerald-400/90 shadow-[0_0_22px_#10b981]'
              : isWorking
              ? 'bg-[var(--hud-primary)] shadow-[0_0_18px_var(--hud-primary)]'
              : 'bg-[var(--hud-primary)]/50 shadow-[0_0_10px_var(--hud-primary)]'
          }`}
          style={{
            width: `${18 + Math.round(amplitude * 14)}px`,
            height: `${18 + Math.round(amplitude * 14)}px`,
          }}
        />
      </div>

      {/* Status Banner */}
      <div className="mt-2.5 flex flex-col items-center gap-1 z-10 font-mono">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isListening
                ? 'bg-amber-400 animate-ping'
                : isSpeaking
                ? 'bg-emerald-400 animate-ping'
                : isWorking
                ? 'bg-[var(--hud-primary)] animate-ping'
                : 'bg-[var(--hud-primary)]'
            }`}
          />
          <span className="hud-title text-xs tracking-widest font-bold text-slate-100 uppercase">
            {getStatusText()}
          </span>
        </div>

        {/* Live Audio Amplitude Meter */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
          <span className="flex items-center gap-1">
            <Radio className={`w-2.5 h-2.5 ${isActiveAudio ? 'text-[var(--hud-primary)] animate-pulse' : 'text-slate-600'}`} />
            <span>PEGEL:</span>
          </span>
          {/* Mini Level Gauge */}
          <div className="w-16 h-1.5 rounded bg-slate-900 border border-[var(--hud-border)] overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isListening
                  ? 'bg-amber-400'
                  : isSpeaking
                  ? 'bg-emerald-400'
                  : 'bg-[var(--hud-primary)]'
              }`}
              style={{ width: `${Math.min(100, Math.round(amplitude * 100))}%` }}
            />
          </div>
          <span className="text-[9px] text-[var(--hud-primary)]">
            {(amplitude * 100).toFixed(0)}% ({decibels} dB)
          </span>
        </div>

        <p className="text-[10px] text-[var(--hud-primary)]/70 font-mono tracking-wider">
          MARK LXXXV // AKUSTISCHE SPEKTRUM-MATRIX
        </p>
      </div>
    </div>
  );
};
