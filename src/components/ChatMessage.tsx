import React, { useState } from 'react';
import {
  Message,
  AgentStep,
  ToolInvocation,
  ConfirmationRequest,
} from '../types/jarvis';
import {
  Cpu,
  User,
  ChevronDown,
  ChevronUp,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Volume2,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface ChatMessageProps {
  message: Message;
  onConfirmAction?: (confirmation: ConfirmationRequest, confirmed: boolean) => void;
  onSpeak?: (text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onConfirmAction,
  onSpeak,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const isJarvis = message.sender === 'jarvis';
  const isSystem = message.sender === 'system';

  const handleCopy = () => {
    soundEffects.playChirp();
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasAgentDetails =
    Boolean(message.thought) ||
    Boolean(message.steps && message.steps.length > 0) ||
    Boolean(message.toolCalls && message.toolCalls.length > 0);

  return (
    <div
      className={`flex flex-col my-3.5 px-2 sm:px-4 ${
        isJarvis ? 'items-start' : isSystem ? 'items-center' : 'items-end'
      }`}
    >
      {/* Sender Header Tag */}
      <div className="flex items-center gap-2 mb-1 text-[11px] font-mono tracking-wider">
        {isJarvis ? (
          <>
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-bold">J.A.R.V.I.S. // PROTOKOLL</span>
          </>
        ) : isSystem ? (
          <span className="text-slate-400 font-mono">SYSTEMMITTEILUNG</span>
        ) : (
          <>
            <span className="text-amber-400 font-bold">SIR // AUTORISIERTE EINGABE</span>
            <div className="w-2 h-2 rounded-full bg-amber-400" />
          </>
        )}
        <span className="text-slate-500 text-[10px]">
          {new Date(message.timestamp).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Message Card */}
      <div
        className={`relative max-w-full sm:max-w-2xl rounded-lg p-4 font-sans text-sm hud-corners transition-all ${
          isJarvis
            ? 'hud-box text-slate-100 border-cyan-500/30'
            : isSystem
            ? 'bg-slate-900/60 border border-slate-800 text-slate-400 text-xs text-center'
            : 'bg-cyan-950/40 border border-cyan-400/40 text-cyan-50 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
        }`}
      >
        {/* Main Content */}
        <div className="whitespace-pre-wrap leading-relaxed tracking-wide selection:bg-cyan-500/30">
          {message.text}
        </div>

        {/* Pending Confirmation UI (Bestätigung vor heiklen Aktionen) */}
        {message.confirmationRequest && (
          <div className="mt-4 p-3.5 rounded border border-rose-500/50 bg-rose-950/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>SICHERHEITSWARNUNG: AUTORISIERUNG ERFORDERLICH</span>
            </div>
            <p className="text-rose-100 text-xs mb-3 font-mono">
              {message.confirmationRequest.description}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundEffects.playConfirm();
                  onConfirmAction?.(message.confirmationRequest!, true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white font-mono text-xs font-semibold shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AUTORISIEREN & AUSFÜHREN</span>
              </button>
              <button
                onClick={() => {
                  soundEffects.playWarning();
                  onConfirmAction?.(message.confirmationRequest!, false);
                }}
                className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-mono text-xs transition-colors"
              >
                ABBRECHEN
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Agent Reasoning & Tool Execution Steps */}
        {isJarvis && hasAgentDetails && (
          <div className="mt-3 pt-3 border-t border-cyan-500/20">
            <button
              onClick={() => {
                soundEffects.playChirp();
                setShowDetails(!showDetails);
              }}
              className="flex items-center justify-between w-full text-[11px] font-mono text-cyan-400/80 hover:text-cyan-300 transition-colors py-1"
            >
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>
                  AGENTEN-PLANUNG & TOOL-TELEMETRIE (
                  {message.steps?.length || 0} Schritte /{' '}
                  {message.toolCalls?.length || 0} Tools)
                </span>
              </div>
              {showDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showDetails && (
              <div className="mt-2.5 space-y-2 text-xs font-mono bg-slate-950/70 p-3 rounded border border-cyan-500/20 animate-fadeIn">
                {/* Agent Thought */}
                {message.thought && (
                  <div className="mb-2 pb-2 border-b border-cyan-500/10">
                    <span className="text-cyan-400 font-semibold block mb-0.5 text-[10px] uppercase">
                      Neuronaler Gedankengang:
                    </span>
                    <p className="text-cyan-200/80 italic text-[11px] leading-relaxed">
                      "{message.thought}"
                    </p>
                  </div>
                )}

                {/* Steps Breakdown */}
                {message.steps && message.steps.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-cyan-400 font-semibold block text-[10px] uppercase">
                      Aktions-Schritte:
                    </span>
                    {message.steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-2 text-[11px] text-slate-300"
                      >
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : step.status === 'failed' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 animate-spin" />
                        )}
                        <div>
                          <span className="font-semibold text-slate-200">
                            {step.title}
                          </span>
                          {step.detail && (
                            <span className="text-slate-400 block text-[10px]">
                              {step.detail}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tool Calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-cyan-500/10 space-y-1">
                    <span className="text-cyan-400 font-semibold block text-[10px] uppercase">
                      Aufgerufene Tools:
                    </span>
                    {message.toolCalls.map((tc) => (
                      <div
                        key={tc.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-cyan-950/50 border border-cyan-500/20 text-[10px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <Wrench className="w-3 h-3 text-cyan-400" />
                          <code className="text-cyan-300">{tc.name}()</code>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                            tc.status === 'success'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : tc.status === 'requires_confirmation'
                              ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {tc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Grounding URLs if any */}
        {message.groundingUrls && message.groundingUrls.length > 0 && (
          <div className="mt-3 pt-2 border-t border-cyan-500/20 text-xs">
            <span className="text-cyan-400/80 font-mono text-[10px] uppercase block mb-1">
              Referenzierte Quellen:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.groundingUrls.map((g, i) => (
                <a
                  key={i}
                  href={g.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 text-[10px] font-mono transition-colors"
                >
                  {g.title || g.uri}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Message Action Toolbar */}
        <div className="mt-2.5 pt-2 flex items-center justify-end gap-2 text-slate-400 text-xs border-t border-cyan-500/10">
          {isJarvis && onSpeak && (
            <button
              onClick={() => {
                soundEffects.playChirp();
                onSpeak(message.text);
              }}
              className="p-1 rounded hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              title="Laut vorlesen"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
            title="Text kopieren"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
