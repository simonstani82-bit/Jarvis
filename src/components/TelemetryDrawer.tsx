import React, { useState } from 'react';
import {
  X,
  Brain,
  Calendar,
  CheckSquare,
  Activity,
  Trash2,
  Check,
  Info,
  Palette,
} from 'lucide-react';
import {
  CalendarEvent,
  NoteItem,
  ReminderItem,
  MemoryItem,
} from '../types/jarvis';
import { soundEffects } from '../services/soundEffects';
import { HUD_THEMES, HudTheme, themeService } from '../services/themeService';
import { DiagnosticsChart } from './DiagnosticsChart';

interface TelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  calendarEvents: CalendarEvent[];
  notes: NoteItem[];
  reminders: ReminderItem[];
  currentTheme: HudTheme;
  isWorking?: boolean;
  onThemeChange: (theme: HudTheme) => void;
  onAddMemory: (key: string, value: string, category: MemoryItem['category']) => void;
  onDeleteMemory: (id: string) => void;
  onAddCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteCalendarEvent: (id: string) => void;
  onAddNote: (note: Omit<NoteItem, 'id' | 'createdAt'>) => void;
  onToggleNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  isOpen,
  onClose,
  memories,
  calendarEvents,
  notes,
  reminders,
  currentTheme,
  isWorking = false,
  onThemeChange,
  onAddMemory,
  onDeleteMemory,
  onAddCalendarEvent,
  onDeleteCalendarEvent,
  onAddNote,
  onToggleNote,
  onDeleteNote,
}) => {
  const [activeTab, setActiveTab] = useState<'memory' | 'calendar' | 'notes' | 'system'>('memory');

  // Local form states
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-lg h-full bg-slate-950/95 border-l border-[var(--hud-border)] flex flex-col shadow-[-10px_0_30px_var(--hud-dim)] font-sans transition-colors duration-300">
        {/* Header */}
        <div className="p-4 border-b border-[var(--hud-border)] flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--hud-primary)] animate-pulse" />
            <div>
              <h2 className="hud-title text-sm font-bold text-slate-100">
                TELEMETRIE & DATEN-CORE
              </h2>
              <p className="text-[10px] text-[var(--hud-primary)]/70 font-mono">
                INTERNE SPEICHER & SUBSYSTEME
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEffects.playChirp();
              onClose();
            }}
            className="p-1.5 rounded border border-slate-700 hover:border-[var(--hud-primary)] text-slate-400 hover:text-[var(--hud-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[var(--hud-border)] text-xs font-mono bg-slate-900/40">
          <button
            onClick={() => {
              soundEffects.playChirp();
              setActiveTab('memory');
            }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'memory'
                ? 'border-[var(--hud-primary)] text-[var(--hud-primary)] bg-[var(--hud-accent-bg)] font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>GEDÄCHTNIS ({memories.length})</span>
          </button>
          <button
            onClick={() => {
              soundEffects.playChirp();
              setActiveTab('calendar');
            }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'calendar'
                ? 'border-[var(--hud-primary)] text-[var(--hud-primary)] bg-[var(--hud-accent-bg)] font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>KALENDER ({calendarEvents.length})</span>
          </button>
          <button
            onClick={() => {
              soundEffects.playChirp();
              setActiveTab('notes');
            }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'notes'
                ? 'border-[var(--hud-primary)] text-[var(--hud-primary)] bg-[var(--hud-accent-bg)] font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>NOTIZEN ({notes.length})</span>
          </button>
          <button
            onClick={() => {
              soundEffects.playChirp();
              setActiveTab('system');
            }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'system'
                ? 'border-[var(--hud-primary)] text-[var(--hud-primary)] bg-[var(--hud-accent-bg)] font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>DIAGNOSE</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="p-3 rounded border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-xs text-slate-300 font-mono leading-relaxed">
                <Info className="w-4 h-4 text-[var(--hud-primary)] inline mr-1.5" />
                JARVIS nutzt dieses Langzeitgedächtnis bei jeder Anfrage, um Vorlieben, Anrede und persönliche Fakten zu berücksichtigen.
              </div>

              {/* Add Memory Form */}
              <div className="p-3 rounded border border-[var(--hud-border)] bg-slate-900/60 space-y-2">
                <span className="text-[11px] font-mono text-[var(--hud-primary)] font-bold uppercase">
                  Neuen Eintrag einprägen:
                </span>
                <input
                  type="text"
                  placeholder="Schlagwort (z. B. Projektziel)"
                  value={newMemKey}
                  onChange={(e) => setNewMemKey(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-[var(--hud-primary)]"
                />
                <input
                  type="text"
                  placeholder="Wert (z. B. Deadline am 15. November)"
                  value={newMemVal}
                  onChange={(e) => setNewMemVal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-[var(--hud-primary)]"
                />
                <button
                  onClick={() => {
                    if (newMemKey.trim() && newMemVal.trim()) {
                      soundEffects.playConfirm();
                      onAddMemory(newMemKey.trim(), newMemVal.trim(), 'fact');
                      setNewMemKey('');
                      setNewMemVal('');
                    }
                  }}
                  className="w-full py-1.5 rounded bg-[var(--hud-primary)] hover:opacity-90 text-slate-950 font-mono text-xs font-bold transition-all shadow-[0_0_10px_var(--hud-dim)]"
                >
                  IM GEDÄCHTNIS VERANKERN
                </button>
              </div>

              {/* Memory List */}
              <div className="space-y-2">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] flex items-start justify-between gap-2 group hover:border-[var(--hud-primary)] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[var(--hud-primary)]">
                          {m.key}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-[var(--hud-border)] font-mono">
                          {m.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-snug">
                        {m.value}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        soundEffects.playWarning();
                        onDeleteMemory(m.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors opacity-80 group-hover:opacity-100"
                      title="Aus Gedächtnis löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CALENDAR */}
          {activeTab === 'calendar' && (
            <div className="space-y-3">
              <div className="p-3 rounded border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-xs text-slate-300 font-mono">
                Termine werden von JARVIS über das Kalender-Tool synchronisiert und abgefragt.
              </div>
              <div className="space-y-2">
                {calendarEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs text-amber-300 font-bold mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{evt.date} // {evt.time} Uhr</span>
                      </div>
                      <h4 className="font-semibold text-sm text-slate-100">
                        {evt.title}
                      </h4>
                      {evt.description && (
                        <p className="text-xs text-slate-400 mt-1">
                          {evt.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        soundEffects.playWarning();
                        onDeleteCalendarEvent(evt.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Termin entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {/* Quick Add Note */}
              <div className="p-3 rounded border border-[var(--hud-border)] bg-slate-900/60 space-y-2">
                <span className="text-[11px] font-mono text-[var(--hud-primary)] font-bold uppercase">
                  Schnellnotiz hinzufügen:
                </span>
                <input
                  type="text"
                  placeholder="Titel"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-[var(--hud-primary)]"
                />
                <textarea
                  placeholder="Notizinhalt..."
                  rows={2}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-[var(--hud-primary)] resize-none"
                />
                <button
                  onClick={() => {
                    if (newNoteTitle.trim() && newNoteContent.trim()) {
                      soundEffects.playConfirm();
                      onAddNote({
                        title: newNoteTitle.trim(),
                        content: newNoteContent.trim(),
                        category: 'todo',
                      });
                      setNewNoteTitle('');
                      setNewNoteContent('');
                    }
                  }}
                  className="w-full py-1.5 rounded bg-[var(--hud-primary)] hover:opacity-90 text-slate-950 font-mono text-xs font-bold transition-all shadow-[0_0_10px_var(--hud-dim)]"
                >
                  NOTIZ SPEICHERN
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded border transition-colors flex items-start gap-3 ${
                      note.completed
                        ? 'border-slate-800 bg-slate-900/40 text-slate-500'
                        : 'border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => {
                        soundEffects.playChirp();
                        onToggleNote(note.id);
                      }}
                      className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-colors ${
                        note.completed
                          ? 'border-emerald-500 bg-emerald-950 text-emerald-400'
                          : 'border-[var(--hud-border)] hover:border-[var(--hud-primary)]'
                      }`}
                    >
                      {note.completed && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex-1">
                      <h4
                        className={`text-xs font-bold ${
                          note.completed ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}
                      >
                        {note.title}
                      </h4>
                      <p className="text-xs whitespace-pre-wrap mt-0.5">
                        {note.content}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        soundEffects.playWarning();
                        onDeleteNote(note.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Notiz löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM DIAGNOSTICS & THEMES */}
          {activeTab === 'system' && (
            <div className="space-y-4 font-mono text-xs">
              {/* Real-time System Diagnostics Recharts Widget */}
              <DiagnosticsChart
                currentTheme={currentTheme}
                isWorking={isWorking}
              />

              {/* Color Scheme Quick Chooser in Diagnostics */}
              <div className="p-3 rounded border border-[var(--hud-border)] bg-slate-900/60 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[var(--hud-primary)] font-bold text-xs uppercase">
                  <Palette className="w-4 h-4" />
                  <span>HUD FARBSCHEMATA (DYNAMISCHE CSS-ROOTS)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {HUD_THEMES.map((theme) => {
                    const isSelected = theme.id === currentTheme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          soundEffects.playStartup();
                          const applied = themeService.applyTheme(theme.id);
                          onThemeChange(applied);
                        }}
                        className={`p-2 rounded border text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'border-[var(--hud-primary)] bg-[var(--hud-accent-bg)] shadow-[0_0_10px_var(--hud-dim)]'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: theme.primary,
                            boxShadow: `0 0 6px ${theme.primary}`,
                          }}
                        />
                        <div className="min-w-0">
                          <span className={`block font-bold truncate text-[11px] ${isSelected ? 'text-[var(--hud-primary)]' : 'text-slate-200'}`}>
                            {theme.name}
                          </span>
                          <span className="text-[9px] text-slate-400 truncate block">
                            {theme.primary}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Telemetry Status */}
              <div className="p-3 rounded border border-[var(--hud-border)] bg-slate-900/60 space-y-2 text-slate-300">
                <div className="flex justify-between border-b border-[var(--hud-border)]/50 pb-1.5">
                  <span className="text-slate-400">Aktives Protokoll:</span>
                  <span className="font-bold text-[var(--hud-primary)]">{currentTheme.name}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--hud-border)]/50 pb-1.5">
                  <span className="text-slate-400">Core Neural Engine:</span>
                  <span className="font-bold">Gemini 3.8 Flash (Multimodal)</span>
                </div>
                <div className="flex justify-between border-b border-[var(--hud-border)]/50 pb-1.5">
                  <span className="text-slate-400">Agenten-Architektur:</span>
                  <span className="text-emerald-400">Function Calling + Multiturn Loop</span>
                </div>
                <div className="flex justify-between border-b border-[var(--hud-border)]/50 pb-1.5">
                  <span className="text-slate-400">Sicherheits-Gate:</span>
                  <span className="text-amber-400">Human-in-the-Loop Bestätigung</span>
                </div>
                <div className="flex justify-between border-b border-[var(--hud-border)]/50 pb-1.5">
                  <span className="text-slate-400">CSS Root Dynamik:</span>
                  <span className="text-emerald-400">--hud-primary: {currentTheme.primary}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Audio-Synthesizer:</span>
                  <span className="text-[var(--hud-primary)]">Web Audio API (Synthetisch)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
