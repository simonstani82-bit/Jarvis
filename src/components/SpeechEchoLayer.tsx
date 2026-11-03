import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Radio } from 'lucide-react';
import { JarvisMood } from '../types/jarvis';

interface SpeechEchoLayerProps {
  isSpeaking: boolean;
  currentPhrase: string;
  recentPhrases: string[];
  primaryColor?: string;
  textColor?: string;
  mood?: JarvisMood;
}

export const SpeechEchoLayer: React.FC<SpeechEchoLayerProps> = ({
  isSpeaking,
  currentPhrase,
  recentPhrases,
  primaryColor = '#00f0ff',
  textColor = 'text-sky-400',
  mood = 'speaking',
}) => {
  // If not speaking and no phrase, hide smoothly
  const hasActiveContent = isSpeaking && (Boolean(currentPhrase) || recentPhrases.length > 0);

  // Take the 2 most recent trailing echo phrases (excluding the currently active one)
  const trailingEchoes = recentPhrases
    .filter((p) => p !== currentPhrase)
    .slice(-2);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 -top-8 sm:-top-11 z-30 flex flex-col items-center justify-end overflow-visible select-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {hasActiveContent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -12, transition: { duration: 0.4 } }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col items-center w-full px-2"
          >
            {/* Holographic Header Tag: Acoustic Speech Echo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 mb-1.5 rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-sm"
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-ping"
                style={{ backgroundColor: primaryColor }}
              />
              <Volume2 className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
              <span
                className="text-[9px] font-mono tracking-[0.2em] font-bold uppercase"
                style={{ color: primaryColor }}
              >
                SUBTILES AUDIO-ECHO // VOCAL RELAY
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                {[0.4, 0.9, 0.6, 1, 0.5].map((scale, i) => (
                  <span
                    key={i}
                    className="w-0.5 h-2 rounded-full animate-pulse"
                    style={{
                      backgroundColor: primaryColor,
                      animationDelay: `${i * 120}ms`,
                      transform: `scaleY(${scale})`,
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Floating Echo Slices Container */}
            <div className="relative flex flex-col items-center justify-center min-h-[52px] max-w-md w-full">
              {/* Trailing Echo 2 (Oldest - most faded and elevated) */}
              {trailingEchoes.length > 1 && (
                <motion.div
                  key={`echo-deep-${trailingEchoes[0]}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.22, y: -24, scale: 0.86 }}
                  exit={{ opacity: 0, y: -32 }}
                  transition={{ duration: 0.45 }}
                  className="absolute pointer-events-none text-center font-mono text-[10px] tracking-[0.2em] uppercase px-4 truncate max-w-[85%] blur-[0.8px]"
                  style={{
                    color: primaryColor,
                    textShadow: `0 0 6px ${primaryColor}40`,
                  }}
                >
                  {trailingEchoes[0]}
                </motion.div>
              )}

              {/* Trailing Echo 1 (Recent - mid opacity, slight elevation) */}
              {trailingEchoes.length > 0 && (
                <motion.div
                  key={`echo-mid-${trailingEchoes[trailingEchoes.length - 1]}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 0.48, y: -12, scale: 0.93 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35 }}
                  className="absolute pointer-events-none text-center font-mono text-[11px] tracking-[0.18em] uppercase px-4 truncate max-w-[90%] blur-[0.3px]"
                  style={{
                    color: primaryColor,
                    textShadow: `0 0 8px ${primaryColor}60`,
                  }}
                >
                  « {trailingEchoes[trailingEchoes.length - 1]} »
                </motion.div>
              )}

              {/* Current Active Spoken Line (Foreground - crisp, glowing, dynamic) */}
              {currentPhrase && (
                <motion.div
                  key={`echo-active-${currentPhrase}`}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 0.95, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative z-10 text-center font-mono font-bold text-xs sm:text-[13px] tracking-[0.16em] uppercase px-4 py-1 rounded-lg bg-slate-950/85 border border-[var(--hud-border)] backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.6)]"
                  style={{
                    boxShadow: `0 0 20px ${primaryColor}22, inset 0 0 10px ${primaryColor}15`,
                  }}
                >
                  <span className="text-white/40 mr-1.5 select-none font-sans">⌠</span>
                  <span
                    className="transition-colors duration-200"
                    style={{
                      color: '#ffffff',
                      textShadow: `0 0 12px ${primaryColor}, 0 0 24px ${primaryColor}88`,
                    }}
                  >
                    {currentPhrase}
                  </span>
                  <span className="text-white/40 ml-1.5 select-none font-sans">⌡</span>
                </motion.div>
              )}
            </div>

            {/* Subtle Expanding Acoustic Echo Rings */}
            <div className="relative w-36 h-2 flex items-center justify-center mt-1 pointer-events-none">
              <motion.div
                initial={{ scaleX: 0.2, opacity: 0.8 }}
                animate={{ scaleX: [0.3, 1.4, 0.3], opacity: [0.8, 0.2, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="h-[1px] w-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${primaryColor} 50%, transparent 100%)`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
