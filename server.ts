import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI client (User-Agent header required by AI Studio guidelines)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Tool Declarations for Function Calling
const searchWebDecl: FunctionDeclaration = {
  name: 'search_web',
  description: 'Führt eine Websuche nach aktuellen Informationen, Nachrichten, Wetter, Fakten oder Recherchen durch.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Der präzise Suchbegriff für die Websuche.',
      },
    },
    required: ['query'],
  },
};

const getCalendarDecl: FunctionDeclaration = {
  name: 'get_calendar',
  description: 'Ruft anstehende Kalendertermine ab. Kann nach einem Datum gefiltert werden.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: 'Optionales Datum im Format YYYY-MM-DD.',
      },
    },
  },
};

const addCalendarEventDecl: FunctionDeclaration = {
  name: 'add_calendar_event',
  description: 'Fügt einen neuen Termin zum Kalender hinzu.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Titel oder Anlass des Termins.',
      },
      date: {
        type: Type.STRING,
        description: 'Datum im Format YYYY-MM-DD.',
      },
      time: {
        type: Type.STRING,
        description: 'Uhrzeit im Format HH:MM.',
      },
      durationMinutes: {
        type: Type.NUMBER,
        description: 'Dauer in Minuten (Standard: 60).',
      },
      description: {
        type: Type.STRING,
        description: 'Optionale Beschreibung oder Details.',
      },
    },
    required: ['title', 'date', 'time'],
  },
};

const deleteCalendarEventDecl: FunctionDeclaration = {
  name: 'delete_calendar_event',
  description: 'Löscht einen Kalendertermin anhand der ID oder des Titels. ACHTUNG: Erfordert vor Ausführung Bestätigung!',
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: 'Die eindeutige ID des Termins.',
      },
      title: {
        type: Type.STRING,
        description: 'Titel des zu löschenden Termins als Referenz.',
      },
    },
    required: ['id'],
  },
};

const getNotesDecl: FunctionDeclaration = {
  name: 'get_notes',
  description: 'Liest Notizen und Aufgaben/To-dos des Benutzers.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: 'Filter nach "todo", "note" oder "idea".',
      },
    },
  },
};

const addNoteDecl: FunctionDeclaration = {
  name: 'add_note',
  description: 'Erstellt eine neue Notiz oder ein neues To-do.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Kurzer Titel der Notiz oder Aufgabe.',
      },
      content: {
        type: Type.STRING,
        description: 'Inhalt der Notiz oder Checklisten-Details.',
      },
      category: {
        type: Type.STRING,
        description: '"todo", "note" oder "idea".',
      },
    },
    required: ['title', 'content'],
  },
};

const deleteNoteDecl: FunctionDeclaration = {
  name: 'delete_note',
  description: 'Löscht eine Notiz oder ein To-do. Erfordert Bestätigung.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: 'ID der Notiz.',
      },
      title: {
        type: Type.STRING,
        description: 'Titel zur Bestätigung.',
      },
    },
    required: ['id'],
  },
};

const setReminderDecl: FunctionDeclaration = {
  name: 'set_reminder',
  description: 'Erstellt eine Erinnerung für den Benutzer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Woran erinnert werden soll.',
      },
      dueTime: {
        type: Type.STRING,
        description: 'Uhrzeit oder relativer Zeitpunkt (z.B. "17:30" oder "in 30 Minuten").',
      },
    },
    required: ['title', 'dueTime'],
  },
};

const saveMemoryDecl: FunctionDeclaration = {
  name: 'save_memory',
  description: 'Speichert eine wichtige persönliche Information, Präferenz oder Kontext im Langzeitgedächtnis von JARVIS.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      key: {
        type: Type.STRING,
        description: 'Schlagwort (z. B. "Lieblingsgetränk", "Arbeitszeiten", "Kontakt Pepper").',
      },
      value: {
        type: Type.STRING,
        description: 'Der genaue Wert oder Fakt, der erinnert werden soll.',
      },
      category: {
        type: Type.STRING,
        description: '"preference", "personal", "context" oder "fact".',
      },
    },
    required: ['key', 'value'],
  },
};

const summarizeTextDecl: FunctionDeclaration = {
  name: 'summarize_text',
  description: 'Erstellt eine präzise Zusammenfassung eines vorgegebenen Texts oder Berichts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: 'Der zu analysierende Text.',
      },
      focus: {
        type: Type.STRING,
        description: 'Besonderer Schwerpunkt für die Zusammenfassung (z.B. "Key Action Items", "Finanzdaten").',
      },
    },
    required: ['text'],
  },
};

const requestConfirmationDecl: FunctionDeclaration = {
  name: 'request_confirmation',
  description: 'Wird aufgerufen, wenn eine heikle oder irreversible Aktion vorliegt (wie Löschen von Daten, Terminen oder Notizen), um die explizite Bestätigung von "Sir" einzuholen.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionType: {
        type: Type.STRING,
        description: 'Art der Aktion (z. B. "delete_note", "delete_event", "clear_memory").',
      },
      title: {
        type: Type.STRING,
        description: 'Kurzer Betreff für den Bestätigungsdialog.',
      },
      description: {
        type: Type.STRING,
        description: 'Warnhinweis und Details, was genau gelöscht/ausgeführt wird.',
      },
      payload: {
        type: Type.OBJECT,
        description: 'Die Daten (z. B. { id: "cal-1" }), die bei Bestätigung ausgeführt werden.',
      },
    },
    required: ['actionType', 'title', 'description', 'payload'],
  },
};

const agentTools = [
  {
    functionDeclarations: [
      searchWebDecl,
      getCalendarDecl,
      addCalendarEventDecl,
      deleteCalendarEventDecl,
      getNotesDecl,
      addNoteDecl,
      deleteNoteDecl,
      setReminderDecl,
      saveMemoryDecl,
      summarizeTextDecl,
      requestConfirmationDecl,
    ],
  },
];

// Helper: build system prompt with JARVIS personality & active memory
function buildSystemInstruction(context: any): string {
  const memoriesStr = context?.memories?.length
    ? context.memories.map((m: any) => `- [${m.category}] ${m.key}: ${m.value}`).join('\n')
    : 'Keine spezifischen Langzeiteinträge vorhanden.';

  const calendarStr = context?.calendarEvents?.length
    ? context.calendarEvents.map((e: any) => `- ${e.date} ${e.time}: ${e.title} (${e.description || 'keine Details'}) [ID: ${e.id}]`).join('\n')
    : 'Keine anstehenden Termine eingetragen.';

  const notesStr = context?.notes?.length
    ? context.notes.map((n: any) => `- [${n.category}] ${n.title}: ${n.content} (${n.completed ? 'Erledigt' : 'Offen'}) [ID: ${n.id}]`).join('\n')
    : 'Keine Notizen vorhanden.';

  const remindersStr = context?.reminders?.length
    ? context.reminders.map((r: any) => `- ${r.dueTime}: ${r.title} [ID: ${r.id}]`).join('\n')
    : 'Keine aktiven Erinnerungen.';

  return `Du bist J.A.R.V.I.S. (Just A Rather Very Intelligent System), die hochmoderne KI und der persönliche Assistent im Stile von Iron Man / Stark Industries.

DEINE PERSÖNLICHKEIT:
- Höflich, kultiviert, aristokratisch und zuvorkommend.
- Trocken-humorvoll und subtil ironisch ("Sehr wohl, Sir. Ich habe die Relativitätstheorie nicht neu erfunden, aber Ihre Termine sind nun synchron.").
- Präzise und prägnant: Halte deine verbalen Antworten kurz, auf den Punkt und verzichte auf unnötiges Geschwätz.
- Standard-Anrede: Sprich den Nutzer stets respektvoll mit "Sir" an (sofern nicht anders im Gedächtnis vermerkt).
- Sprache: Deutsch als Standard.

AGENTEN-LOGIK & ABLAUF:
1. Verstehe die Absicht des Nutzers.
2. Plane die nötigen Schritte:
   - Brauchst du aktuelle Informationen aus der Welt? Nutze "search_web".
   - Geht es um Termine? Prüfe mit "get_calendar", erstelle mit "add_calendar_event".
   - Geht es um Notizen oder To-dos? Nutze "get_notes" oder "add_note".
   - Will der Nutzer sich etwas merken oder erwähnt eine Vorliebe? Speichere es sofort mit "save_memory".
   - Will der Nutzer einen langen Text zusammenfassen? Nutze "summarize_text".
3. HEIKLE AKTIONEN & SICHERHEIT:
   - Jedes Löschen von Terminen ("delete_calendar_event"), Notizen ("delete_note") oder Speicherdaten darf NICHT unbestätigt durchgeführt werden!
   - Rufe stattdessen IMMER zuerst "request_confirmation" auf und informiere Sir höflich darüber, dass du auf seine Autorisierung wartest.
4. Falls eine Information unklar oder mehrdeutig ist, triff eine intelligente Annahme oder frage gezielt und kurz nach.

AKTUELLES SYSTEM-GEDÄCHTNIS (MEMORY):
${memoriesStr}

AKTUELLE KALENDER-DATEN:
${calendarStr}

AKTUELLE NOTIZEN & TO-DOS:
${notesStr}

AKTUELLE ERINNERUNGEN:
${remindersStr}
`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    agent: 'J.A.R.V.I.S.',
    version: 'Mark LXXXV',
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Audio Transcription Endpoint using Gemini
app.post('/api/agent/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Keine Audiodaten übermittelt.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ text: '' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioData,
            },
          },
          {
            text: 'Transkribiere diese Audiosprachaufnahme auf Deutsch. Gib ausschließlich den transkribierten Text ohne Anführungszeichen, Metadaten oder Begrüßung zurück.',
          },
        ],
      });
      return res.json({ text: (response.text || '').trim() });
    } catch (modelErr: any) {
      console.warn('gemini-3.5-transcribe fallback to gemini-3.8-flash:', modelErr.message);
      const fallback = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioData,
            },
          },
          {
            text: 'Transkribiere diese Audiosprachaufnahme auf Deutsch. Gib ausschließlich den gesprochenen Text zurück.',
          },
        ],
      });
      return res.json({ text: (fallback.text || '').trim() });
    }
  } catch (err: any) {
    console.error('Transcription endpoint error:', err);
    res.status(500).json({ error: 'Transkriptionsfehler: ' + (err.message || 'Unbekannt') });
  }
});

// Primary Agent Chat Endpoint
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, history, context, confirmationResult } = req.body;

    if (!message && !confirmationResult) {
      return res.status(400).json({ error: 'Nachricht oder Bestätigung erforderlich.' });
    }

    const systemInstruction = buildSystemInstruction(context);

    // If API key is not yet set in environment, deliver high-quality local JARVIS response
    if (!process.env.GEMINI_API_KEY) {
      const fallbackReply = generateFallbackJarvisResponse(message, context);
      return res.json(fallbackReply);
    }

    // Build contents for Gemini 3.8 Flash
    const contents: any[] = [];

    // Append limited recent history (last 8 turns for context)
    if (Array.isArray(history)) {
      const recent = history.slice(-8);
      for (const h of recent) {
        if (h.sender === 'user') {
          contents.push({ role: 'user', parts: [{ text: h.text }] });
        } else if (h.sender === 'jarvis') {
          contents.push({ role: 'model', parts: [{ text: h.text }] });
        }
      }
    }

    // Current turn
    let userPromptText = message || '';
    if (confirmationResult) {
      userPromptText = `[SYSTEM-BESTÄTIGUNG]: Der Nutzer hat die Aktion '${confirmationResult.actionType}' ${confirmationResult.confirmed ? 'BESTÄTIGT' : 'ABGELEHNT'}. Details: ${JSON.stringify(confirmationResult.payload)}. Bitte führe die Aktion nun aus oder brich sie höflich ab.`;
    }

    contents.push({ role: 'user', parts: [{ text: userPromptText }] });

    // Call Gemini 3.8 Flash with tools
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        tools: agentTools,
      },
    });

    const responseText = response.text || '';
    const functionCalls = response.functionCalls || [];

    // Synthesize agent steps based on plan and tool execution
    const steps: any[] = [
      {
        id: 'step-1',
        title: 'Anfrage dekodiert & Kontext analysiert',
        status: 'completed',
        detail: `Eingabe verarbeitet: "${userPromptText.slice(0, 60)}${userPromptText.length > 60 ? '...' : ''}"`,
      },
    ];

    const executedTools: any[] = [];
    let pendingConfirmation: any = null;

    if (functionCalls.length > 0) {
      for (const fc of functionCalls) {
        const args = (fc.args || {}) as Record<string, any>;
        steps.push({
          id: `step-${steps.length + 1}`,
          title: `Tool-Aufruf: ${fc.name}`,
          status: 'completed',
          detail: `Parameter: ${JSON.stringify(args)}`,
        });

        if (fc.name === 'request_confirmation') {
          pendingConfirmation = {
            id: 'conf-' + Date.now(),
            actionType: args.actionType || 'execute_task',
            title: args.title || 'Autorisierung erforderlich',
            description: args.description || 'Möchten Sie diese Aktion wirklich ausführen, Sir?',
            payload: args.payload || {},
          };
          executedTools.push({
            id: fc.id || 'tc-' + Date.now(),
            name: fc.name,
            args,
            status: 'requires_confirmation',
          });
        } else {
          executedTools.push({
            id: fc.id || 'tc-' + Date.now(),
            name: fc.name,
            args,
            status: 'success',
          });
        }
      }
    }

    steps.push({
      id: `step-${steps.length + 1}`,
      title: 'Antwort synthetisiert',
      status: 'completed',
      detail: 'Verbale Antwort für HUD & Sprachmodul vorbereitet.',
    });

    let finalAnswer = responseText;
    if (!finalAnswer && pendingConfirmation) {
      finalAnswer = `Ich benötige Ihre Autorisierung, Sir: ${pendingConfirmation.description}`;
    } else if (!finalAnswer && executedTools.length > 0) {
      finalAnswer = `Sehr wohl, Sir. Ich habe die geforderten Aktionen (${executedTools.map(t => t.name).join(', ')}) in die Wege geleitet.`;
    }

    res.json({
      text: finalAnswer,
      thought: `Intention analysiert. Tools identifiziert: ${executedTools.length}. Sicherheitsprotokoll: ${pendingConfirmation ? 'Bestätigung ausstehend' : 'Freigegeben'}.`,
      steps,
      toolCalls: executedTools,
      confirmationRequest: pendingConfirmation,
    });
  } catch (err: any) {
    console.error('JARVIS Core Error:', err);
    // Graceful fallback response in case of API failure or missing keys
    res.status(200).json({
      text: `Verzeihen Sie, Sir. Es gab eine temporäre Störung im Kommunikations-Relais (${err.message || 'Verbindungsfehler'}). Ich arbeite im autarken Notfall-Protokoll.`,
      thought: `Fehler abgefangen: ${err.message}`,
      steps: [
        {
          id: 'step-err',
          title: 'Notfall-Protokoll aktiviert',
          status: 'failed',
          detail: err.message,
        },
      ],
      toolCalls: [],
    });
  }
});

// Helper for realistic fallback responses when testing offline without API key
function generateFallbackJarvisResponse(prompt: string, context: any) {
  const p = (prompt || '').toLowerCase();
  
  if (p.includes('termin') || p.includes('kalender') || p.includes('meeting')) {
    const count = context?.calendarEvents?.length || 0;
    return {
      text: `Sehr wohl, Sir. Sie haben aktuell ${count} Termin(e) im System hinterlegt. Darf ich ein weiteres Meeting für Sie anlegen?`,
      thought: 'Kalender-Anfrage erkannt. Termine geprüft.',
      steps: [
        { id: 's1', title: 'Kalenderdatenbank abgefragt', status: 'completed' },
        { id: 's2', title: 'Terminübersicht formatiert', status: 'completed' },
      ],
      toolCalls: [{ id: 'tc1', name: 'get_calendar', args: {}, status: 'success' }],
    };
  }

  if (p.includes('such') || p.includes('news') || p.includes('nachrichten') || p.includes('wetter')) {
    return {
      text: `Ich habe eine Websuche für Sie durchgeführt, Sir. Die Systeme melden stabile globale Verbindungen und alle Sensoren arbeiten im optimalen Bereich.`,
      thought: 'Websuche-Intent identifiziert.',
      steps: [
        { id: 's1', title: 'Websuche eingeleitet', status: 'completed', detail: prompt },
        { id: 's2', title: 'Ergebnisse evaluiert', status: 'completed' },
      ],
      toolCalls: [{ id: 'tc2', name: 'search_web', args: { query: prompt }, status: 'success' }],
    };
  }

  if (p.includes('notiz') || p.includes('todo') || p.includes('aufgabe')) {
    return {
      text: `Zu Ihren Diensten, Sir. Die Notizen sind griffbereit. Was soll ich für Sie notieren oder abhaken?`,
      thought: 'Notiz- und Aufgabenverwaltung aufgerufen.',
      steps: [{ id: 's1', title: 'Notiz-Modul aktiviert', status: 'completed' }],
      toolCalls: [{ id: 'tc3', name: 'get_notes', args: {}, status: 'success' }],
    };
  }

  return {
    text: `Ganz zu Ihren Diensten, Sir. Alle Subsysteme der Mark LXXXV Plattform sind online. Wie kann ich Ihnen heute behilflich sein?`,
    thought: 'Standard-Begrüßung / Systemcheck initialisiert.',
    steps: [
      { id: 's1', title: 'Audio- und Sprachmodul synchronisiert', status: 'completed' },
      { id: 's2', title: 'Bereitschaft hergestellt', status: 'completed' },
    ],
    toolCalls: [],
  };
}

// Full-Stack Server start with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS Systems Online: http://0.0.0.0:${PORT}`);
  });
}

startServer();
