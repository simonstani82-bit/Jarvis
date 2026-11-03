/**
 * JARVIS Type Definitions
 * Mark LXXXV Core Protocols
 */

export type JarvisStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'planning'
  | 'executing_tool'
  | 'speaking'
  | 'awaiting_confirmation';

export interface AgentStep {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
  timestamp?: string;
}

export interface ToolInvocation {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'calling' | 'success' | 'failed' | 'requires_confirmation';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ConfirmationRequest {
  id: string;
  actionType: 'delete_note' | 'delete_event' | 'clear_memory' | 'execute_task';
  title: string;
  description: string;
  payload: Record<string, any>;
}

export interface Message {
  id: string;
  sender: 'user' | 'jarvis' | 'system';
  text: string;
  timestamp: number;
  thought?: string;
  steps?: AgentStep[];
  toolCalls?: ToolInvocation[];
  groundingUrls?: GroundingSource[];
  confirmationRequest?: ConfirmationRequest;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes?: number;
  description?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: 'todo' | 'note' | 'idea';
  completed?: boolean;
  createdAt: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  dueTime: string;
  triggered: boolean;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'personal' | 'context' | 'fact';
  updatedAt: string;
}

export interface SystemTelemetry {
  arcReactorOutput: number; // percentage (e.g. 98.4)
  cpuLoad: number;
  latencyMs: number;
  memorySlotsUsed: number;
  audioActive: boolean;
}
