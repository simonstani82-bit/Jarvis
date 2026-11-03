import React from 'react';
import { Sparkles, Search, Calendar, CheckSquare, Brain, AlertOctagon } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  {
    icon: Sparkles,
    label: 'Statusbericht',
    prompt: 'JARVIS, gib mir einen kurzen Statusbericht aller Systeme.',
  },
  {
    icon: Search,
    label: 'Websuche News',
    prompt: 'Recherchiere die aktuellsten Entwicklungen in der künstlichen Intelligenz.',
  },
  {
    icon: Calendar,
    label: 'Termine prüfen',
    prompt: 'Welche Termine stehen für heute und morgen auf meiner Agenda?',
  },
  {
    icon: CheckSquare,
    label: 'Notiz anlegen',
    prompt: 'Notiere bitte: "Mark 85 Flugstabilisatoren und Repulsor-Kühlung testen".',
  },
  {
    icon: Brain,
    label: 'Gedächtnis abfragen',
    prompt: 'Welche Informationen und Vorlieben hast du aktuell über mich gespeichert?',
  },
  {
    icon: AlertOctagon,
    label: 'Test: Lösch-Bestätigung',
    prompt: 'Lösche bitte den ersten Kalendertermin.',
  },
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({
  onSelectPrompt,
  disabled,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 text-xs select-none no-scrollbar">
      <span className="text-[10px] font-mono text-[var(--hud-primary)]/70 uppercase shrink-0">
        BEFEHLE:
      </span>
      {PROMPTS.map((p, idx) => {
        const Icon = p.icon;
        return (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => {
              soundEffects.playChirp();
              onSelectPrompt(p.prompt);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] hover:bg-[var(--hud-border)]/30 hover:border-[var(--hud-primary)] text-[var(--hud-primary)] hover:text-slate-100 text-[11px] font-mono whitespace-nowrap transition-all shadow-[0_0_8px_var(--hud-dim)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Icon className="w-3 h-3 text-[var(--hud-primary)]" />
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
};
