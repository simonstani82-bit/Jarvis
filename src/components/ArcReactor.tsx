import React, { useState } from 'react';
import { JarvisStatus, JarvisMood } from '../types/jarvis';
import { Mic, MicOff, Volume2, Radio, Sparkles, AlertOctagon, Brain, Shield, MessageSquareCode } from 'lucide-react';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { soundEffects } from '../services/soundEffects';
import { SpeechEchoLayer } from './SpeechEchoLayer';

interface ArcReactorProps {
  status: JarvisStatus;
  isListening: boolean;
  isSpeaking: boolean;
  onToggleListen: () => void;
  onStopSpeaking: () => void;
  moodOverride?: JarvisMood | 'auto';
  onMoodChange?: (mood: JarvisMood | 'auto') => void;
  currentSpokenPhrase?: string;
  recentSpokenPhrases?: string[];
  onTriggerEchoDemo?: () => void;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  status,
  isListening,
  isSpeaking,
  onToggleListen,
  onStopSpeaking,
  moodOverride = 'auto',
  onMoodChange,
  currentSpokenPhrase = '',
  recentSpokenPhrases = [],
  onTriggerEchoDemo,
}) => {
  const [localMood, setLocalMood] = useState<JarvisMood | 'auto'>(moodOverride);

  // Capture real-time microphone frequency data and speech amplitude
  const { frequencies, radialBars, amplitude, decibels, isLiveMicActive } = useAudioVisualizer(
    isListening,
    isSpeaking
  );

  // Compute effective mood: either forced or auto-derived from agent state
  const effectiveMood: JarvisMood = (() => {
    if (localMood !== 'auto') {
      return localMood;
    }
    if (status === 'speaking' || isSpeaking) {
      return 'speaking';
    }
    if (status === 'thinking' || status === 'planning' || status === 'executing_tool' || status === 'listening' || isListening) {
      return 'thinking';
    }
    if (status === 'awaiting_confirmation') {
      return 'debugging';
    }
    return 'normal';
  })();

  const handleSelectMood = (mood: JarvisMood | 'auto') => {
    soundEffects.playChirp();
    setLocalMood(mood);
    if (onMoodChange) {
      onMoodChange(mood);
    }
  };

  // Color schemes for moods: Blau (normal), Gelb (nachdenken), Rot (fehlersuche), Grün (sprechen)
  const moodStyles = {
    normal: {
      name: 'NORMAL (BLAU)',
      stateLabel: 'AUSGEGLICHEN // PROTOKOLL BLAU',
      description: 'System nominal · Stabile Quantenmatrix',
      primaryColor: '#00f0ff',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-400',
      borderClass: 'border-sky-400/80',
      ringColor: 'border-t-sky-400 border-b-sky-400',
      glowBg: 'bg-sky-500/25',
      spikeBg: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]',
      orbBg: 'bg-sky-400 shadow-[0_0_24px_#38bdf8]',
      beaconBg: 'bg-sky-400 shadow-[0_0_10px_#38bdf8]',
      badgeBorder: 'border-sky-500/40 text-sky-300 bg-sky-950/40',
    },
    thinking: {
      name: 'NACHDENKEN (GELB)',
      stateLabel: 'KOGNITIV // ANALYSE (GELB)',
      description: 'Kognitive Synthese · Neuronale Berechnungen',
      primaryColor: '#f59e0b',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-400',
      borderClass: 'border-amber-400/90',
      ringColor: 'border-t-amber-400 border-b-amber-400',
      glowBg: 'bg-amber-500/35',
      spikeBg: 'bg-amber-400 shadow-[0_0_10px_#f59e0b]',
      orbBg: 'bg-amber-400 shadow-[0_0_26px_#f59e0b]',
      beaconBg: 'bg-amber-400 shadow-[0_0_12px_#f59e0b]',
      badgeBorder: 'border-amber-500/40 text-amber-300 bg-amber-950/40',
    },
    debugging: {
      name: 'FEHLERSUCHE (ROT)',
      stateLabel: 'DIAGNOSE // FEHLERSUCHE (ROT)',
      description: 'Anomalie-Scan · Integritätsprüfung',
      primaryColor: '#f43f5e',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500',
      borderClass: 'border-rose-500/90',
      ringColor: 'border-t-rose-500 border-b-rose-500',
      glowBg: 'bg-rose-500/40',
      spikeBg: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
      orbBg: 'bg-rose-500 shadow-[0_0_26px_#f43f5e]',
      beaconBg: 'bg-rose-500 shadow-[0_0_12px_#f43f5e]',
      badgeBorder: 'border-rose-500/40 text-rose-300 bg-rose-950/40',
    },
    speaking: {
      name: 'SPRECHEN (GRÜN)',
      stateLabel: 'VOKAL // AUDIO-SYNTHESE (GRÜN)',
      description: 'Akustische Modulation · Sprachausgabe',
      primaryColor: '#10b981',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-400',
      borderClass: 'border-emerald-400/90',
      ringColor: 'border-t-emerald-400 border-b-emerald-400',
      glowBg: 'bg-emerald-500/30',
      spikeBg: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
      orbBg: 'bg-emerald-400 shadow-[0_0_24px_#10b981]',
      beaconBg: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
      badgeBorder: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
    },
  };

  const currentMoodStyle = moodStyles[effectiveMood];

  const getStatusText = () => {
    switch (status) {
      case 'listening':
        return isLiveMicActive ? 'LAUSCHT // LIVE MIKROFON AKTIV' : 'LAUSCHT...';
      case 'thinking':
        return 'DENKT NACH // KOGNITIVER ZUSTAND';
      case 'planning':
        return 'PLANT SCHRITTE // MULTI-STEP';
      case 'executing_tool':
        return 'FÜHRT TOOL AUS // SYSTEMTASK';
      case 'speaking':
        return 'SPRICHT // AUDIO-SYNTHESE';
      case 'awaiting_confirmation':
        return 'AUTORISIERUNG AUSSTEHEND // SICHERHEITS-GATE';
      default:
        return 'BEREIT // STANDBY';
    }
  };

  const isWorking = status === 'thinking' || status === 'planning' || status === 'executing_tool';
  const isActiveAudio = isListening || isSpeaking;

  // Symmetrical frequency bar mapping for core equalizer (11 bars: low -> mid -> high -> mid -> low)
  const coreBarIndices = [2, 4, 6, 8, 10, 12, 11, 9, 7, 5, 3];

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 relative select-none">
      {/* Outer ambient glow reacting dynamically to live audio amplitude and mood color */}
      <div
        className={`absolute w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${currentMoodStyle.glowBg}`}
        style={{
          transform: `scale(${1 + amplitude * 0.45})`,
          opacity: 0.65 + amplitude * 0.35,
        }}
      />

      {/* Floating Holographic Speech Echo Layer: renders trailing faded text lines of currently spoken sentences */}
      <SpeechEchoLayer
        isSpeaking={isSpeaking}
        currentPhrase={currentSpokenPhrase}
        recentPhrases={recentSpokenPhrases}
        primaryColor={currentMoodStyle.primaryColor}
        textColor={currentMoodStyle.textColor}
        mood={effectiveMood}
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
        className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center cursor-pointer group mt-4 sm:mt-6"
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
                  className={`w-0.5 rounded-full transition-all duration-150 ${currentMoodStyle.spikeBg}`}
                  style={{
                    height: `${barHeight}px`,
                    opacity: isActiveAudio ? Math.max(0.4, val) : 0.3,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Layer 1: Outermost dashed telemetry ring */}
        <div
          className={`absolute inset-2 rounded-full border border-dashed border-[var(--hud-border)] transition-transform duration-700 ${
            isActiveAudio || isWorking || effectiveMood === 'thinking' || effectiveMood === 'debugging'
              ? 'animate-spin-fast'
              : 'animate-spin-slow'
          }`}
          style={{ borderSpacing: '8px' }}
        />

        {/* Layer 2: Counter-rotating geometric segmented ring tinted to current mood */}
        <div
          className={`absolute inset-4 rounded-full border border-white/10 ${currentMoodStyle.ringColor} transition-all duration-500 ${
            effectiveMood === 'debugging'
              ? 'animate-spin-fast'
              : isWorking
              ? 'animate-spin-reverse'
              : 'animate-spin-reverse'
          }`}
        />

        {/* Layer 3: Tech tick marks (12 ticks like a reactor coil) */}
        <div className="absolute inset-6 rounded-full flex items-center justify-center pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-full flex justify-center"
              style={{ transform: `rotate(${i * 30}deg)` }}
            >
              <div
                className={`w-0.5 h-2.5 rounded-full transition-all duration-300 ${currentMoodStyle.spikeBg}`}
              />
            </div>
          ))}
        </div>

        {/* Layer 4: Inner reactor core ring */}
        <div
          className={`absolute inset-9 rounded-full border-2 transition-all duration-300 flex items-center justify-center bg-slate-950/90 backdrop-blur-md shadow-inner ${currentMoodStyle.borderClass} ${currentMoodStyle.textColor}`}
          style={{
            transform: `scale(${1 + amplitude * 0.12})`,
            boxShadow: `0 0 20px ${currentMoodStyle.primaryColor}33`,
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
                  className={`w-1 rounded-full transition-all duration-75 ${currentMoodStyle.spikeBg}`}
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
              <Mic className={`w-8 h-8 ${currentMoodStyle.textColor} transition-transform group-hover:scale-110`} />
            )}
          </div>
        </div>

        {/* Reactor Core Central Orb with amplitude scale reaction */}
        <div
          className={`absolute rounded-full pointer-events-none transition-all duration-300 ${currentMoodStyle.orbBg}`}
          style={{
            width: `${18 + Math.round(amplitude * 14)}px`,
            height: `${18 + Math.round(amplitude * 14)}px`,
          }}
        />
      </div>

      {/* Main Status & Amplitude Readout */}
      <div className="mt-2.5 flex flex-col items-center gap-1.5 z-10 font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${currentMoodStyle.beaconBg} animate-ping`} />
          <span className="hud-title text-xs tracking-widest font-bold text-slate-100 uppercase">
            {getStatusText()}
          </span>
        </div>

        {/* Live Audio Amplitude Meter */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Radio className={`w-2.5 h-2.5 ${isActiveAudio ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
            <span>PEGEL:</span>
          </span>
          {/* Mini Level Gauge */}
          <div className="w-16 h-1.5 rounded bg-slate-900 border border-[var(--hud-border)] overflow-hidden">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${Math.min(100, Math.round(amplitude * 100))}%`,
                backgroundColor: currentMoodStyle.primaryColor,
              }}
            />
          </div>
          <span className={`text-[9px] ${currentMoodStyle.textColor}`}>
            {(amplitude * 100).toFixed(0)}% ({decibels} dB)
          </span>
        </div>

        {/* SUBTLE STATUS / MOOD INDICATOR: Visualizes JARVIS's internal processing state */}
        <div className="mt-1 flex flex-col sm:flex-row items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--hud-border)] bg-slate-950/75 backdrop-blur-sm text-[11px]">
          {/* Active Mood Pill */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: currentMoodStyle.primaryColor,
                boxShadow: `0 0 8px ${currentMoodStyle.primaryColor}`,
              }}
            />
            <span className="text-slate-400 font-sans text-[10px]">KOGNITIONS-ZUSTAND:</span>
            <span className={`font-bold tracking-wider ${currentMoodStyle.textColor}`}>
              {currentMoodStyle.stateLabel}
            </span>
          </div>

          <span className="hidden sm:inline text-slate-600">|</span>

          {/* Interactive Mood Selector for User Testing */}
          <div className="flex items-center gap-1 text-[10px]">
            <button
              onClick={() => handleSelectMood('auto')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                localMood === 'auto'
                  ? 'bg-slate-800 text-slate-100 font-bold border border-slate-600'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Automatisch synchron mit Aufgaben & Sprechstatus"
            >
              AUTO
            </button>
            <button
              onClick={() => handleSelectMood('normal')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                localMood === 'normal'
                  ? 'bg-sky-950 text-sky-300 font-bold border border-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                  : 'text-sky-400/70 hover:text-sky-300'
              }`}
              title="Normal / Ausgeglichen (Blau)"
            >
              BLAU
            </button>
            <button
              onClick={() => handleSelectMood('thinking')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                localMood === 'thinking'
                  ? 'bg-amber-950 text-amber-300 font-bold border border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'text-amber-400/70 hover:text-amber-300'
              }`}
              title="Nachdenken / Kognitive Synthese (Gelb)"
            >
              GELB
            </button>
            <button
              onClick={() => handleSelectMood('debugging')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                localMood === 'debugging'
                  ? 'bg-rose-950 text-rose-300 font-bold border border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                  : 'text-rose-400/70 hover:text-rose-300'
              }`}
              title="Fehlersuche / Systemdiagnose (Rot)"
            >
              ROT
            </button>

            {onTriggerEchoDemo && (
              <>
                <span className="hidden sm:inline text-slate-700">|</span>
                <button
                  onClick={onTriggerEchoDemo}
                  disabled={isSpeaking}
                  className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 border ${
                    isSpeaking
                      ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 animate-pulse'
                      : 'border-slate-700 hover:border-sky-500/60 bg-slate-900/60 text-slate-300 hover:text-sky-300'
                  }`}
                  title="Subtilen Echo-Effekt mit einer gesprochenen JARVIS-Phrase testen"
                >
                  <Volume2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>ECHO-TEST</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
