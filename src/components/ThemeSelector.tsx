import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, ChevronDown } from 'lucide-react';
import { HUD_THEMES, HudTheme, themeService } from '../services/themeService';
import { soundEffects } from '../services/soundEffects';

interface ThemeSelectorProps {
  currentTheme: HudTheme;
  onThemeChange: (theme: HudTheme) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTheme = (theme: HudTheme) => {
    soundEffects.playStartup();
    const applied = themeService.applyTheme(theme.id);
    onThemeChange(applied);
    setIsOpen(false);
  };

  const handleCycleNextTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEffects.playPing();
    const currentIndex = HUD_THEMES.findIndex((t) => t.id === currentTheme.id);
    const nextTheme = HUD_THEMES[(currentIndex + 1) % HUD_THEMES.length];
    const applied = themeService.applyTheme(nextTheme.id);
    onThemeChange(applied);
  };

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      {/* Trigger Button */}
      <div className="flex items-center">
        <button
          onClick={() => {
            soundEffects.playChirp();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-l border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] hover:bg-[var(--hud-border)]/20 text-slate-100 transition-all text-[11px] shadow-[0_0_12px_var(--hud-dim)] group"
          title="HUD Farbschema wechseln"
        >
          {/* Active theme color glow orb */}
          <span
            className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
            style={{
              backgroundColor: currentTheme.primary,
              boxShadow: `0 0 8px ${currentTheme.primary}`,
            }}
          />
          <span className="hidden sm:inline font-bold uppercase tracking-wider text-[var(--hud-primary)]">
            {currentTheme.name}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[var(--hud-primary)]' : ''
            }`}
          />
        </button>

        {/* Quick-Cycle button */}
        <button
          onClick={handleCycleNextTheme}
          className="px-1.5 py-1.5 rounded-r border-t border-r border-b border-l-0 border-[var(--hud-border)] bg-[var(--hud-accent-bg)] hover:bg-[var(--hud-primary)]/20 text-[var(--hud-primary)] text-[10px] transition-colors"
          title="Nächstes Protokoll aktivieren (Schnellwechsel)"
        >
          <Palette className="w-3 h-3" />
        </button>
      </div>

      {/* Holographic Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-lg hud-box border-[var(--hud-border)] p-2 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_var(--hud-dim)] z-50 animate-fadeIn backdrop-blur-xl">
          <div className="px-2 py-1.5 border-b border-[var(--hud-border)] flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
            <span className="text-[var(--hud-primary)] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              HUD PROTOKOLL-MATRIX
            </span>
            <span>{HUD_THEMES.length} SCHEMATA</span>
          </div>

          <div className="space-y-1">
            {HUD_THEMES.map((theme) => {
              const isActive = theme.id === currentTheme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme)}
                  className={`w-full text-left p-2 rounded transition-all flex items-start gap-2.5 group ${
                    isActive
                      ? 'bg-[var(--hud-accent-bg)] border border-[var(--hud-border)] shadow-[0_0_12px_var(--hud-dim)]'
                      : 'hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                  }`}
                >
                  {/* Swatch circle with concentric ring */}
                  <div className="relative shrink-0 mt-0.5 flex items-center justify-center w-5 h-5">
                    <span
                      className={`w-4 h-4 rounded-full transition-transform group-hover:scale-110 ${
                        isActive ? 'ring-2 ring-offset-2 ring-offset-slate-950' : ''
                      }`}
                      style={{
                        backgroundColor: theme.primary,
                        boxShadow: `0 0 10px ${theme.primary}`,
                        outlineColor: theme.primary,
                      }}
                    />
                  </div>

                  {/* Theme Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold font-mono tracking-wide ${
                          isActive ? 'text-[var(--hud-primary)]' : 'text-slate-200 group-hover:text-slate-100'
                        }`}
                      >
                        {theme.name}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[9px] text-[var(--hud-primary)] font-bold">
                          <Check className="w-3 h-3" />
                          AKTIV
                        </span>
                      )}
                    </div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono tracking-wider truncate mt-0.5">
                      {theme.badge}
                    </span>
                    <p className="text-[10px] text-slate-400/80 font-sans line-clamp-1 mt-0.5">
                      {theme.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-1.5 border-t border-[var(--hud-border)] text-[9px] text-slate-500 text-center font-mono">
            DYNAMISCHE CSS-ROOT-VARIABLEN IN ECHTZEIT SYNCHRONISIERT
          </div>
        </div>
      )}
    </div>
  );
};
