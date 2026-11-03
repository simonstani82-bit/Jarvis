/**
 * JARVIS Local Storage & State Management
 * Persistent offline-ready memory, calendar, notes, and reminders
 */

import { CalendarEvent, NoteItem, ReminderItem, MemoryItem } from '../types/jarvis';

const STORAGE_KEYS = {
  CALENDAR: 'jarvis_calendar_events_v1',
  NOTES: 'jarvis_notes_v1',
  REMINDERS: 'jarvis_reminders_v1',
  MEMORY: 'jarvis_memory_v1',
  MESSAGES: 'jarvis_chat_history_v1',
};

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    key: 'Benutzer-Anrede',
    value: 'Der Benutzer wird als "Sir" angesprochen.',
    category: 'preference',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-2',
    key: 'Sprachstil',
    value: 'Höflich, präzise, britisch-aristokratisch mit trockenem Humor, kurze Antworten.',
    category: 'preference',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-3',
    key: 'Kaffee-Vorliebe',
    value: 'Doppelter Espresso, schwarz ohne Zucker.',
    category: 'personal',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-4',
    key: 'Hauptprojekt',
    value: 'Autonomer Agent JARVIS für Multitasking & Workflow-Optimierung.',
    category: 'context',
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_CALENDAR: CalendarEvent[] = [
  {
    id: 'cal-1',
    title: 'Projekt-Review JARVIS Mark LXXXV',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    durationMinutes: 45,
    description: 'Architektur-Check, Tool-Calling-Evaluation und UI-Abstimmung.',
  },
  {
    id: 'cal-2',
    title: 'System-Update & Diagnose',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:30',
    durationMinutes: 30,
    description: 'Wartung der neuronalen Verknüpfungen und Cache-Bereinigung.',
  },
];

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    title: 'Agenten-Roadmap',
    content: '1. Chat & HUD UI\n2. Agenten-Schleife mit Websuche\n3. Sprachsteuerung\n4. Tools & Gedächtnis\n5. Feinschliff',
    category: 'todo',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Sicherheits-Protokoll',
    content: 'Vor destruktiven Aktionen (Löschen, Bereinigen, Senden) stets eine explizite Bestätigung einholen.',
    category: 'note',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-1',
    title: 'Tee zubereiten & kurze Pause einlegen',
    dueTime: '16:00',
    triggered: false,
  },
];

export const storageService = {
  // Calendar
  getCalendarEvents(): CalendarEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALENDAR);
      return data ? JSON.parse(data) : DEFAULT_CALENDAR;
    } catch {
      return DEFAULT_CALENDAR;
    }
  },

  addCalendarEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const events = this.getCalendarEvents();
    const newEvent: CalendarEvent = {
      ...event,
      id: 'cal-' + Date.now(),
    };
    events.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(events));
    return newEvent;
  },

  deleteCalendarEvent(id: string): boolean {
    const events = this.getCalendarEvents();
    const filtered = events.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(filtered));
    return filtered.length < events.length;
  },

  // Notes & Todos
  getNotes(): NoteItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      return data ? JSON.parse(data) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  },

  addNote(note: Omit<NoteItem, 'id' | 'createdAt'>): NoteItem {
    const notes = this.getNotes();
    const newNote: NoteItem = {
      ...note,
      id: 'note-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    notes.unshift(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return newNote;
  },

  toggleNote(id: string): NoteItem | null {
    const notes = this.getNotes();
    const note = notes.find((n) => n.id === id);
    if (note) {
      note.completed = !note.completed;
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
      return note;
    }
    return null;
  },

  deleteNote(id: string): boolean {
    const notes = this.getNotes();
    const filtered = notes.filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(filtered));
    return filtered.length < notes.length;
  },

  // Reminders
  getReminders(): ReminderItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      return data ? JSON.parse(data) : DEFAULT_REMINDERS;
    } catch {
      return DEFAULT_REMINDERS;
    }
  },

  addReminder(title: string, dueTime: string): ReminderItem {
    const reminders = this.getReminders();
    const newRem: ReminderItem = {
      id: 'rem-' + Date.now(),
      title,
      dueTime,
      triggered: false,
    };
    reminders.push(newRem);
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    return newRem;
  },

  deleteReminder(id: string): boolean {
    const reminders = this.getReminders();
    const filtered = reminders.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(filtered));
    return filtered.length < reminders.length;
  },

  // Memory (Gedächtnis)
  getMemories(): MemoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMORY);
      return data ? JSON.parse(data) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  },

  saveMemory(key: string, value: string, category: MemoryItem['category'] = 'fact'): MemoryItem {
    const memories = this.getMemories();
    const existingIndex = memories.findIndex((m) => m.key.toLowerCase() === key.toLowerCase());
    
    if (existingIndex >= 0) {
      memories[existingIndex].value = value;
      memories[existingIndex].updatedAt = new Date().toISOString();
      memories[existingIndex].category = category;
      localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memories));
      return memories[existingIndex];
    } else {
      const newMemory: MemoryItem = {
        id: 'mem-' + Date.now(),
        key,
        value,
        category,
        updatedAt: new Date().toISOString(),
      };
      memories.push(newMemory);
      localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memories));
      return newMemory;
    }
  },

  deleteMemory(id: string): boolean {
    const memories = this.getMemories();
    const filtered = memories.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(filtered));
    return filtered.length < memories.length;
  },

  clearAllMemory(): void {
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify([]));
  },

  // Chat History
  getChatHistory(): any[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveChatHistory(messages: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages.slice(-30))); // Keep last 30 for performance
    } catch {
      // Ignore
    }
  },

  clearChatHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  }
};
