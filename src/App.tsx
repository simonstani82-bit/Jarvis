/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Message,
  JarvisStatus,
  JarvisMood,
  ConfirmationRequest,
  MemoryItem,
  CalendarEvent,
  NoteItem,
  ReminderItem,
} from './types/jarvis';
import { ArcReactor } from './components/ArcReactor';
import { HudHeader } from './components/HudHeader';
import { ChatMessage } from './components/ChatMessage';
import { QuickPrompts } from './components/QuickPrompts';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { SystemHealthWidget } from './components/SystemHealthWidget';
import { soundEffects } from './services/soundEffects';
import { voiceService } from './services/voiceService';
import { storageService } from './services/storageService';
import { themeService, HudTheme } from './services/themeService';
import { AudioFrequencyVisualizer } from './components/AudioFrequencyVisualizer';
import { Send, Mic, MicOff, Terminal, AlertTriangle, X, Activity } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

export default function App() {
  // Theme state dynamically controlling CSS root variables
  const [currentTheme, setCurrentTheme] = useState<HudTheme>(() => themeService.initTheme());

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = storageService.getChatHistory();
    if (saved && saved.length > 0) return saved;
    return [
      {
        id: 'msg-init',
        sender: 'jarvis',
        text: 'Guten Tag, Sir. Alle Protokolle der Mark LXXXV Plattform sind initialisiert. Die neuronalen Netze sind synchron und alle Sensoren arbeiten im optimalen Bereich. Wie darf ich Ihnen heute behilflich sein?',
        timestamp: Date.now(),
        thought: 'Systemboot erfolgreich abgeschlossen. Volle Funktionsbereitschaft gemeldet.',
        steps: [
          {
            id: 's-boot',
            title: 'Subsysteme online & kalibriert',
            status: 'completed',
            detail: 'Mark LXXXV Core: 100% Leistung',
          },
        ],
        toolCalls: [],
      },
    ];
  });

  const [status, setStatus] = useState<JarvisStatus>('idle');
  const [moodOverride, setMoodOverride] = useState<JarvisMood | 'auto'>('auto');
  const [isElevatedLoad, setIsElevatedLoad] = useState(false);
  const [showInlineHealth, setShowInlineHealth] = useState(false);
  const [telemetryTab, setTelemetryTab] = useState<'memory' | 'calendar' | 'notes' | 'system'>('memory');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOutputActive, setVoiceOutputActive] = useState(true);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // Floating Speech Echo state for Arc Reactor acoustic HUD feedback
  const [currentSpokenPhrase, setCurrentSpokenPhrase] = useState<string>('');
  const [recentSpokenPhrases, setRecentSpokenPhrases] = useState<string[]>([]);
  const echoClearTimerRef = useRef<any>(null);

  // Persistent storage state
  const [memories, setMemories] = useState<MemoryItem[]>(() => storageService.getMemories());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => storageService.getCalendarEvents());
  const [notes, setNotes] = useState<NoteItem[]>(() => storageService.getNotes());
  const [reminders, setReminders] = useState<ReminderItem[]>(() => storageService.getReminders());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const jarvisSectionRef = useRef<HTMLDivElement>(null);
  const wasSpeakingRef = useRef(false);

  // Initialize theme on initial load
  useEffect(() => {
    const applied = themeService.initTheme();
    setCurrentTheme(applied);
  }, []);

  // Smoothly scroll window to JARVIS so he remains front and center
  const scrollToJarvis = () => {
    if (jarvisSectionRef.current) {
      jarvisSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scroll only the internal chat feed without moving the entire window viewport
  const scrollChatFeedToBottom = () => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({
        top: chatFeedRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // On new messages, save history and scroll ONLY the internal chat container
  useEffect(() => {
    scrollChatFeedToBottom();
    storageService.saveChatHistory(messages);
  }, [messages]);

  // When JARVIS starts speaking, automatically scroll smoothly to him once
  useEffect(() => {
    if ((status === 'speaking' || isSpeaking) && !wasSpeakingRef.current) {
      wasSpeakingRef.current = true;
      scrollToJarvis();
    } else if (status !== 'speaking' && !isSpeaking) {
      wasSpeakingRef.current = false;
    }
  }, [status, isSpeaking]);

  // Handle theme changes
  const handleThemeChange = (newTheme: HudTheme) => {
    setCurrentTheme(newTheme);
  };

  // Handle voice speech output with subtle floating speech echo tracking
  const speakMessage = (text: string) => {
    if (!voiceOutputActive) return;
    if (echoClearTimerRef.current) {
      clearTimeout(echoClearTimerRef.current);
      echoClearTimerRef.current = null;
    }

    const initialPhrases = voiceService.splitIntoSpokenPhrases(text);
    if (initialPhrases.length > 0) {
      setCurrentSpokenPhrase(initialPhrases[0]);
      setRecentSpokenPhrases([initialPhrases[0]]);
    }

    setStatus('speaking');
    setIsSpeaking(true);
    scrollToJarvis();

    voiceService.speak(
      text,
      () => {
        setIsSpeaking(true);
        setStatus('speaking');
        scrollToJarvis();
      },
      () => {
        setIsSpeaking(false);
        setStatus('idle');
        // Gentle dissolve delay for the trailing echo
        echoClearTimerRef.current = setTimeout(() => {
          setCurrentSpokenPhrase('');
          setRecentSpokenPhrases([]);
        }, 1400);
      },
      (phrase: string) => {
        setCurrentSpokenPhrase(phrase);
        setRecentSpokenPhrases((prev) => {
          if (prev[prev.length - 1] === phrase) return prev;
          return [...prev.slice(-3), phrase];
        });
      }
    );
  };

  // Trigger quick interactive audio demo to showcase the speech echo effect
  const handleEchoDemo = () => {
    soundEffects.playStartup();
    speakMessage(
      'Akustische Rückkopplung aktiv. Alle Systeme der Mark LXXXV Plattform operieren mit nominaler Präzision. Subtiler Vokal-Echo-Layer kalibriert.'
    );
  };

  // Stop current speech
  const stopSpeaking = () => {
    if (echoClearTimerRef.current) {
      clearTimeout(echoClearTimerRef.current);
      echoClearTimerRef.current = null;
    }
    voiceService.stopSpeaking();
    setIsSpeaking(false);
    setStatus('idle');
    setCurrentSpokenPhrase('');
    setRecentSpokenPhrases([]);
  };

  const [voiceAlert, setVoiceAlert] = useState<{ message: string; type: 'warning' | 'info' } | null>(null);

  // Simulate voice command with full Arc Reactor & frequency visualizer activation
  const simulateVoiceCommand = (commandText: string) => {
    if (isSpeaking) stopSpeaking();
    soundEffects.playStartup();
    setStatus('listening');
    setIsListening(true);
    setInputText(commandText);
    setVoiceAlert(null);
    scrollToJarvis();

    // Provide visual acoustic feedback before dispatching to agent
    setTimeout(() => {
      soundEffects.playConfirm();
      setIsListening(false);
      handleSendMessage(commandText);
    }, 1200);
  };

  // Toggle voice recognition & neural audio recording
  const toggleListening = async () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setStatus('idle');
      soundEffects.playConfirm();
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
    }

    // Check permission state in advance to avoid abrupt failure sounds
    const perm = await voiceService.checkPermission();
    if (perm === 'denied') {
      soundEffects.playWarning();
      setVoiceAlert({
        type: 'warning',
        message: 'Mikrofon-Berechtigung wurde verweigert. Bitte erlauben Sie den Mikrofonzugriff in den Browsereinstellungen für diese Seite.',
      });
      return;
    }

    setVoiceAlert(null);
    soundEffects.playStartup();
    setIsListening(true);
    setStatus('listening');
    scrollToJarvis();

    voiceService.startListening(
      (transcript, isFinal) => {
        if (transcript) {
          setInputText(transcript);
        }
        if (isFinal && transcript.trim().length > 0 && transcript !== 'JARVIS dekodiert Audiosignal...') {
          setIsListening(false);
          setStatus('idle');
          handleSendMessage(transcript.trim());
        }
      },
      (error) => {
        console.warn('Speech error:', error);
        setIsListening(false);
        setStatus('idle');
        setVoiceAlert({ type: 'warning', message: error });
        soundEffects.playWarning();
      },
      () => {
        setIsListening(false);
        setStatus('idle');
      }
    );
  };

  // Synchronize client storage if tools executed on server or client
  const syncToolsExecution = (toolCalls?: any[]) => {
    if (!toolCalls || !Array.isArray(toolCalls)) return;

    for (const tc of toolCalls) {
      if (tc.name === 'save_memory' && tc.args?.key && tc.args?.value) {
        storageService.saveMemory(tc.args.key, tc.args.value, tc.args.category || 'fact');
        setMemories(storageService.getMemories());
      } else if (tc.name === 'add_note' && tc.args?.title && tc.args?.content) {
        storageService.addNote({
          title: tc.args.title,
          content: tc.args.content,
          category: tc.args.category || 'todo',
        });
        setNotes(storageService.getNotes());
      } else if (tc.name === 'add_calendar_event' && tc.args?.title && tc.args?.date && tc.args?.time) {
        storageService.addCalendarEvent({
          title: tc.args.title,
          date: tc.args.date,
          time: tc.args.time,
          durationMinutes: tc.args.durationMinutes || 60,
          description: tc.args.description,
        });
        setCalendarEvents(storageService.getCalendarEvents());
      } else if (tc.name === 'set_reminder' && tc.args?.title && tc.args?.dueTime) {
        storageService.addReminder(tc.args.title, tc.args.dueTime);
        setReminders(storageService.getReminders());
      }
    }
  };

  // Send message to Agent Backend
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    }
    if (isSpeaking) {
      stopSpeaking();
    }

    soundEffects.playConfirm();

    // User message
    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setStatus('thinking');

    try {
      // Build context
      const context = {
        memories,
        calendarEvents,
        notes,
        reminders,
      };

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: [...messages, userMsg],
          context,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server status: ${res.status}`);
      }

      const data = await res.json();

      // Process tool effects on local storage
      syncToolsExecution(data.toolCalls);

      const jarvisMsg: Message = {
        id: 'msg-j-' + Date.now(),
        sender: 'jarvis',
        text: data.text || 'Befehl verarbeitet, Sir.',
        timestamp: Date.now(),
        thought: data.thought,
        steps: data.steps,
        toolCalls: data.toolCalls,
        groundingUrls: data.groundingUrls,
        confirmationRequest: data.confirmationRequest,
      };

      setMessages((prev) => [...prev, jarvisMsg]);

      if (data.confirmationRequest) {
        setStatus('awaiting_confirmation');
        soundEffects.playWarning();
      } else {
        setStatus('idle');
        speakMessage(jarvisMsg.text);
      }
    } catch (err: any) {
      console.error('Agent chat error:', err);
      soundEffects.playWarning();
      setStatus('idle');

      const fallbackMsg: Message = {
        id: 'msg-err-' + Date.now(),
        sender: 'jarvis',
        text: 'Verzeihen Sie, Sir. Die Verbindung zur neuronalen Einheit wurde kurzzeitig unterbrochen. Ich halte die lokalen Systeme aufrecht.',
        timestamp: Date.now(),
        thought: `Fehler: ${err.message}`,
        steps: [
          {
            id: 'err-step',
            title: 'Verbindungsanomalie',
            status: 'failed',
            detail: err.message,
          },
        ],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }
  };

  // Handle confirmation of sensitive actions
  const handleConfirmAction = async (confirmation: ConfirmationRequest, confirmed: boolean) => {
    setStatus('thinking');
    soundEffects.playChirp();

    try {
      // If action is deletion, execute client-side state change if confirmed
      if (confirmed) {
        if (confirmation.actionType === 'delete_event' && confirmation.payload?.id) {
          storageService.deleteCalendarEvent(confirmation.payload.id);
          setCalendarEvents(storageService.getCalendarEvents());
        } else if (confirmation.actionType === 'delete_note' && confirmation.payload?.id) {
          storageService.deleteNote(confirmation.payload.id);
          setNotes(storageService.getNotes());
        } else if (confirmation.actionType === 'clear_memory') {
          storageService.clearAllMemory();
          setMemories([]);
        }
      }

      // Notify agent of outcome
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationResult: {
            actionType: confirmation.actionType,
            confirmed,
            payload: confirmation.payload,
          },
          context: { memories, calendarEvents, notes, reminders },
          history: messages,
        }),
      });

      const data = await res.json();
      const followUpMsg: Message = {
        id: 'msg-conf-' + Date.now(),
        sender: 'jarvis',
        text: data.text || (confirmed ? 'Aktion erfolgreich autorisiert und ausgeführt, Sir.' : 'Aktion wie gewünscht abgebrochen, Sir.'),
        timestamp: Date.now(),
        thought: confirmed ? 'Aktion autorisiert & ausgeführt.' : 'Vorgang durch Benutzer abgebrochen.',
        steps: data.steps,
      };

      setMessages((prev) => [...prev, followUpMsg]);
      setStatus('idle');
      speakMessage(followUpMsg.text);
    } catch (err: any) {
      setStatus('idle');
      console.error('Confirmation handling error:', err);
    }
  };

  // Reset conversation
  const handleResetChat = () => {
    storageService.clearChatHistory();
    setMessages([
      {
        id: 'msg-init-' + Date.now(),
        sender: 'jarvis',
        text: 'Systeme re-initialisiert, Sir. Speicher und Protokolle sind bereit für neue Instruktionen.',
        timestamp: Date.now(),
        steps: [
          { id: 's1', title: 'Chatprotokoll zurückgesetzt', status: 'completed' },
        ],
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative overflow-hidden select-text transition-colors duration-500">
      {/* Background HUD scanlines and ambient dynamic radial aura */}
      <div className="fixed inset-0 hud-scanlines pointer-events-none z-10" />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[850px] h-[420px] blur-[130px] rounded-full pointer-events-none transition-all duration-700"
        style={{
          backgroundColor: currentTheme.dim,
        }}
      />

      {/* Stark Industries HUD Header */}
      <HudHeader
        voiceOutputActive={voiceOutputActive}
        onToggleVoiceOutput={() => setVoiceOutputActive((prev) => !prev)}
        onToggleTelemetry={() => {
          setTelemetryTab('memory');
          setIsTelemetryOpen((prev) => !prev);
        }}
        onOpenSystemHealth={() => {
          setTelemetryTab('system');
          setIsTelemetryOpen(true);
        }}
        onResetChat={handleResetChat}
        isTelemetryOpen={isTelemetryOpen}
        isSystemHealthOpen={isTelemetryOpen && telemetryTab === 'system'}
        memoryCount={memories.length}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Main HUD Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col px-3 sm:px-6 relative z-20 pb-4">
        {/* JARVIS Core Visual Interface (Arc Reactor + Audio Waveform) */}
        <div ref={jarvisSectionRef} id="jarvis-avatar-section" className="shrink-0 scroll-mt-2">
          {/* Animated Arc Reactor with Mood, Processing Indicator, and Floating Speech Echo */}
          <div className="pt-2 pb-1">
            <ArcReactor
              status={status}
              isListening={isListening}
              isSpeaking={isSpeaking}
              onToggleListen={toggleListening}
              onStopSpeaking={stopSpeaking}
              moodOverride={moodOverride}
              onMoodChange={(m) => setMoodOverride(m)}
              currentSpokenPhrase={currentSpokenPhrase}
              recentSpokenPhrases={recentSpokenPhrases}
              onTriggerEchoDemo={handleEchoDemo}
            />
          </div>

          {/* Real-time Microphone & Audio Frequency Waveform Visualizer */}
          <div className="px-1 sm:px-2">
            <AudioFrequencyVisualizer
              isListening={isListening}
              isSpeaking={isSpeaking}
              currentTheme={currentTheme}
            />
          </div>
        </div>

        {/* Quick Diagnostics & System Health Bar */}
        <div className="shrink-0 flex items-center justify-between px-2 pt-1 pb-0.5 text-[11px] font-mono">
          <button
            onClick={() => {
              soundEffects.playChirp();
              setShowInlineHealth(!showInlineHealth);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all ${
              showInlineHealth
                ? 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'border-[var(--hud-border)] bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="D3.js System Health & Hardware-Diagnose auf der Hauptoberfläche anzeigen"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>D3 SYSTEM HEALTH WIDGET</span>
            <span className="text-[9px] text-[var(--hud-primary)]">{showInlineHealth ? '▲ SCHLIESSEN' : '▼ ÖFFNEN'}</span>
          </button>

          <span className="text-slate-400 hidden sm:inline text-[10px]">
            {status === 'thinking' || isElevatedLoad ? 'KOGNITIVE LAST: HOCH' : 'HARDWARE-INTEGRITÄT: 100%'}
          </span>
        </div>

        {/* Collapsible Inline D3 System Health Widget */}
        {showInlineHealth && (
          <div className="shrink-0 px-1 sm:px-2 py-2">
            <SystemHealthWidget
              currentTheme={currentTheme}
              isWorking={status === 'thinking' || status === 'planning' || status === 'executing_tool' || isElevatedLoad}
              onSimulateLoadChange={(elevated) => {
                setIsElevatedLoad(elevated);
                if (elevated) {
                  setMoodOverride('thinking');
                } else {
                  setMoodOverride('auto');
                }
              }}
            />
          </div>
        )}

        {/* Chat Message Scroll Feed */}
        <div ref={chatFeedRef} className="flex-1 overflow-y-auto px-1 sm:px-2 py-2 space-y-2 min-h-[220px]">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onConfirmAction={handleConfirmAction}
                onSpeak={speakMessage}
              />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="shrink-0 pt-1">
          <QuickPrompts
            onSelectPrompt={(prompt) => handleSendMessage(prompt)}
            disabled={status === 'thinking' || status === 'planning'}
          />
        </div>

        {/* Bottom Input Console */}
        <div className="shrink-0 pt-2">
          {/* Voice Permission Guidance Banner */}
          {voiceAlert && (
            <div className="mb-2 p-3 sm:p-4 rounded-xl border border-amber-500/60 bg-slate-950/95 backdrop-blur-md text-amber-200 text-xs font-mono shadow-[0_0_25px_rgba(245,158,11,0.3)] space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-amber-500/30 pb-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                  <span className="uppercase tracking-wider">Mikrofon-Zugriff im Browser freigeben</span>
                </div>
                <button
                  onClick={() => setVoiceAlert(null)}
                  className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
                  title="Hinweis schließen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[12px] text-slate-200 leading-relaxed font-sans space-y-1">
                <p>
                  Ihr Browser oder das Vorschaufenster blockiert aktuell den direkten Zugriff auf Ihr Mikrofon:
                </p>
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-amber-500/20 font-mono text-[11px] text-amber-200/90 space-y-1">
                  <div>1. Klicken Sie ganz oben in Ihrer <strong>Browser-Adressleiste</strong> links neben der URL auf das <strong>🔒 Schloss- / Einstellungs-Symbol</strong>.</div>
                  <div>2. Ändern Sie die Option <strong>"Mikrofon"</strong> auf <strong>"Zulassen" (Allow)</strong>.</div>
                  <div>3. Klicken Sie anschließend auf den Button <strong>"ERNEUT VERSUCHEN"</strong>.</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={async () => {
                    soundEffects.playStartup();
                    const success = await voiceService.requestMicrophoneAccess();
                    if (success) {
                      setVoiceAlert(null);
                      toggleListening();
                    } else {
                      soundEffects.playWarning();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition-all shadow-[0_0_12px_rgba(245,158,11,0.35)] flex items-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  ERNEUT VERSUCHEN
                </button>

                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-amber-400/50 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 font-mono text-xs transition-colors"
                  title="In separatem Tab öffnen, um Browser-Berechtigungen direkt zu verwalten"
                >
                  IN NEUEM TAB ÖFFNEN ↗
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setVoiceAlert(null);
                    simulateVoiceCommand('JARVIS, wie ist der Status aller Systeme?');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/60 text-slate-300 hover:text-slate-100 font-mono text-xs transition-colors"
                >
                  BEFEHL PER SPRACHMODUS SIMULIEREN
                </button>
              </div>

              {/* Instant Voice Commands Quick-bar */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Oder direkt als Sprachbefehl ausführen:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Status aller Systeme prüfen',
                    'Termine für heute abrufen',
                    'Websuche nach aktuellen KI-Entwicklungen',
                    'Merke dir: Mein Rufzeichen ist Iron-One',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => simulateVoiceCommand(preset)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-amber-500/30 hover:border-amber-400 text-amber-200 hover:text-amber-100 text-[11px] transition-colors"
                    >
                      🗣️ "{preset}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Audio Recording Indicator */}
          {isListening && (
            <div className="mb-2 p-2 rounded-lg border border-amber-500/50 bg-amber-950/40 text-amber-200 text-xs font-mono flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold">SPRACHAUFNAHME AKTIV: Sprechen Sie Ihren Befehl...</span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition-colors"
              >
                STOPPEN & SENDEN
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center gap-2 p-1.5 sm:p-2 rounded-xl hud-box border-[var(--hud-border)] bg-slate-950/85 shadow-[0_0_20px_var(--hud-dim)] transition-all"
          >
            {/* Terminal prompt symbol */}
            <div className="hidden sm:flex items-center pl-2 text-[var(--hud-primary)]">
              <Terminal className="w-4 h-4" />
            </div>

            {/* Input field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isListening
                  ? 'Ich lausche Ihren Worten, Sir...'
                  : 'Sprechen oder tippen Sie Ihren Befehl für JARVIS...'
              }
              disabled={status === 'thinking' || status === 'planning'}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
            />

            {/* Microphone Toggle Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-lg border transition-all ${
                isListening
                  ? 'border-amber-400 bg-amber-500/30 text-amber-200 shadow-[0_0_15px_#f59e0b]'
                  : 'border-[var(--hud-border)] bg-[var(--hud-accent-bg)] text-[var(--hud-primary)] hover:border-[var(--hud-primary)]'
              }`}
              title={isListening ? 'Zuhören beenden' : 'Spracheingabe starten'}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 animate-bounce" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || status === 'thinking' || status === 'planning'}
              className="px-4 py-2.5 rounded-lg bg-[var(--hud-primary)] hover:opacity-90 text-slate-950 font-mono text-xs font-bold transition-all shadow-[0_0_15px_var(--hud-dim)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SENDEN</span>
            </button>
          </form>
          <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-mono text-slate-400">
            <span className="text-[var(--hud-primary)]/80">{currentTheme.badge}</span>
            <span>ENTER ZUM ABSENDEN // MIKROFON FÜR SPRACHE</span>
          </div>
        </div>
      </main>

      {/* Telemetry & Memory Drawer */}
      <TelemetryDrawer
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        initialTab={telemetryTab}
        memories={memories}
        calendarEvents={calendarEvents}
        notes={notes}
        reminders={reminders}
        currentTheme={currentTheme}
        isWorking={status === 'thinking' || status === 'planning' || status === 'executing_tool' || isElevatedLoad}
        onThemeChange={handleThemeChange}
        onAddMemory={(key, value, category) => {
          storageService.saveMemory(key, value, category);
          setMemories(storageService.getMemories());
        }}
        onDeleteMemory={(id) => {
          storageService.deleteMemory(id);
          setMemories(storageService.getMemories());
        }}
        onAddCalendarEvent={(event) => {
          storageService.addCalendarEvent(event);
          setCalendarEvents(storageService.getCalendarEvents());
        }}
        onDeleteCalendarEvent={(id) => {
          storageService.deleteCalendarEvent(id);
          setCalendarEvents(storageService.getCalendarEvents());
        }}
        onAddNote={(note) => {
          storageService.addNote(note);
          setNotes(storageService.getNotes());
        }}
        onToggleNote={(id) => {
          storageService.toggleNote(id);
          setNotes(storageService.getNotes());
        }}
        onDeleteNote={(id) => {
          storageService.deleteNote(id);
          setNotes(storageService.getNotes());
        }}
      />
    </div>
  );
}
