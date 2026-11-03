/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Message,
  JarvisStatus,
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
import { soundEffects } from './services/soundEffects';
import { voiceService } from './services/voiceService';
import { storageService } from './services/storageService';
import { themeService, HudTheme } from './services/themeService';
import { Send, Mic, MicOff, Terminal } from 'lucide-react';
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
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOutputActive, setVoiceOutputActive] = useState(true);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  // Persistent storage state
  const [memories, setMemories] = useState<MemoryItem[]>(() => storageService.getMemories());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => storageService.getCalendarEvents());
  const [notes, setNotes] = useState<NoteItem[]>(() => storageService.getNotes());
  const [reminders, setReminders] = useState<ReminderItem[]>(() => storageService.getReminders());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize theme on initial load
  useEffect(() => {
    const applied = themeService.initTheme();
    setCurrentTheme(applied);
  }, []);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    storageService.saveChatHistory(messages);
  }, [messages]);

  // Handle theme changes
  const handleThemeChange = (newTheme: HudTheme) => {
    setCurrentTheme(newTheme);
  };

  // Handle voice speech output
  const speakMessage = (text: string) => {
    if (!voiceOutputActive) return;
    setStatus('speaking');
    setIsSpeaking(true);
    voiceService.speak(
      text,
      () => {
        setIsSpeaking(true);
        setStatus('speaking');
      },
      () => {
        setIsSpeaking(false);
        setStatus('idle');
      }
    );
  };

  // Stop current speech
  const stopSpeaking = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
    setStatus('idle');
  };

  // Toggle voice recognition
  const toggleListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setStatus('idle');
      soundEffects.playChirp();
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
    }

    soundEffects.playStartup();
    setIsListening(true);
    setStatus('listening');

    voiceService.startListening(
      (transcript, isFinal) => {
        setInputText(transcript);
        if (isFinal && transcript.trim().length > 0) {
          setIsListening(false);
          setStatus('idle');
          handleSendMessage(transcript.trim());
        }
      },
      (error) => {
        console.warn('Speech error:', error);
        setIsListening(false);
        setStatus('idle');
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
        onToggleTelemetry={() => setIsTelemetryOpen((prev) => !prev)}
        onResetChat={handleResetChat}
        isTelemetryOpen={isTelemetryOpen}
        memoryCount={memories.length}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Main HUD Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col px-3 sm:px-6 relative z-20 pb-4">
        {/* Animated Arc Reactor & Frequency Visualizer */}
        <div className="shrink-0 pt-2 pb-1">
          <ArcReactor
            status={status}
            isListening={isListening}
            isSpeaking={isSpeaking}
            onToggleListen={toggleListening}
            onStopSpeaking={stopSpeaking}
          />
        </div>

        {/* Chat Message Scroll Feed */}
        <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-2 space-y-2 min-h-[220px]">
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
        memories={memories}
        calendarEvents={calendarEvents}
        notes={notes}
        reminders={reminders}
        currentTheme={currentTheme}
        isWorking={status === 'thinking' || status === 'planning' || status === 'executing_tool'}
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
