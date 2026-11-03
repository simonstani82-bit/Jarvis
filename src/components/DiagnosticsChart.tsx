import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { Activity, Cpu, Database, Wifi, RefreshCw } from 'lucide-react';
import { HudTheme } from '../services/themeService';
import { soundEffects } from '../services/soundEffects';

interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  latency: number;
}

interface DiagnosticsChartProps {
  currentTheme: HudTheme;
  isWorking?: boolean;
}

export const DiagnosticsChart: React.FC<DiagnosticsChartProps> = ({
  currentTheme,
  isWorking = false,
}) => {
  const [data, setData] = useState<MetricPoint[]>(() => {
    const points: MetricPoint[] = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const t = new Date(now - i * 2000);
      points.push({
        time: t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cpu: Math.floor(18 + Math.random() * 15),
        memory: Math.floor(45 + Math.random() * 8),
        latency: Math.floor(22 + Math.random() * 18),
      });
    }
    return points;
  });

  const [activeMetric, setActiveMetric] = useState<'all' | 'cpu_mem' | 'latency'>('all');
  const [currentLatency, setCurrentLatency] = useState(28);
  const [isPinging, setIsPinging] = useState(false);

  // Ping test function
  const measurePing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await fetch('/api/health');
      const roundtrip = Math.round(performance.now() - start);
      setCurrentLatency(roundtrip);
      return roundtrip;
    } catch {
      return Math.floor(35 + Math.random() * 20);
    } finally {
      setIsPinging(false);
    }
  };

  // Real-time rolling update interval
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // CPU load increases when agent is working
      const baseCpu = isWorking ? 65 : 22;
      const cpuVal = Math.min(98, Math.max(8, Math.round(baseCpu + (Math.random() * 24 - 10))));
      const memVal = Math.min(85, Math.max(38, Math.round(52 + Math.sin(Date.now() / 8000) * 12 + (Math.random() * 4 - 2))));

      // Latency fluctuates realistically
      const latVal = Math.min(120, Math.max(16, Math.round(currentLatency + (Math.random() * 12 - 6))));

      setData((prev) => {
        const next = [...prev.slice(1)];
        next.push({
          time: timeStr,
          cpu: cpuVal,
          memory: memVal,
          latency: latVal,
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isWorking, currentLatency]);

  const latest = data[data.length - 1] || { cpu: 25, memory: 50, latency: 30 };

  // Custom HUD Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded p-2 bg-slate-950/90 border border-[var(--hud-border)] font-mono text-[10px] shadow-[0_0_15px_var(--hud-dim)] backdrop-blur-md">
          <p className="text-slate-400 font-bold mb-1 border-b border-[var(--hud-border)] pb-0.5">
            ZEIT: {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="flex items-center justify-between gap-3" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span className="font-bold">{entry.value} {entry.name.includes('Latenz') ? 'ms' : '%'}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-3 rounded-lg border border-[var(--hud-border)] bg-slate-900/60 space-y-3 font-mono">
      {/* Header with Title and Current Live Metrics */}
      <div className="flex items-center justify-between border-b border-[var(--hud-border)]/50 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--hud-primary)] animate-pulse" />
          <span className="text-xs font-bold text-[var(--hud-primary)] uppercase tracking-wider">
            ECHTZEIT-TELEMETRIE & DIAGNOSE
          </span>
        </div>
        <button
          onClick={() => {
            soundEffects.playChirp();
            measurePing();
          }}
          disabled={isPinging}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[var(--hud-accent-bg)] border border-[var(--hud-border)] text-slate-300 hover:text-[var(--hud-primary)] transition-colors"
          title="Netzwerk-Ping jetzt manuell messen"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isPinging ? 'animate-spin text-[var(--hud-primary)]' : ''}`} />
          <span>PING TEST</span>
        </button>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-3 gap-2 text-center select-none">
        <div className="p-2 rounded bg-slate-950/80 border border-[var(--hud-border)]">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Cpu className="w-3 h-3 text-[var(--hud-primary)]" />
            <span>CPU LAST</span>
          </div>
          <span className="text-sm font-bold text-[var(--hud-primary)]">{latest.cpu}%</span>
        </div>

        <div className="p-2 rounded bg-slate-950/80 border border-[var(--hud-border)]">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>SPEICHER</span>
          </div>
          <span className="text-sm font-bold text-emerald-400">{latest.memory}%</span>
        </div>

        <div className="p-2 rounded bg-slate-950/80 border border-[var(--hud-border)]">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Wifi className="w-3 h-3 text-amber-400" />
            <span>LATENZ</span>
          </div>
          <span className="text-sm font-bold text-amber-400">{latest.latency} ms</span>
        </div>
      </div>

      {/* Filter / Metric View Tabs */}
      <div className="flex items-center gap-1.5 text-[10px]">
        <button
          onClick={() => {
            soundEffects.playChirp();
            setActiveMetric('all');
          }}
          className={`px-2 py-1 rounded transition-colors ${
            activeMetric === 'all'
              ? 'bg-[var(--hud-primary)] text-slate-950 font-bold'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          KOMPLETT
        </button>
        <button
          onClick={() => {
            soundEffects.playChirp();
            setActiveMetric('cpu_mem');
          }}
          className={`px-2 py-1 rounded transition-colors ${
            activeMetric === 'cpu_mem'
              ? 'bg-[var(--hud-primary)] text-slate-950 font-bold'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          CPU & MEMORY
        </button>
        <button
          onClick={() => {
            soundEffects.playChirp();
            setActiveMetric('latency');
          }}
          className={`px-2 py-1 rounded transition-colors ${
            activeMetric === 'latency'
              ? 'bg-[var(--hud-primary)] text-slate-950 font-bold'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          NETZWERK LATENZ
        </button>
      </div>

      {/* Recharts Line Chart */}
      <div className="h-44 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {activeMetric === 'latency' ? (
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} />
              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[0, 100]} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="latency"
                name="Netzwerk-Latenz"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 9 }}
                domain={[0, 100]}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {(activeMetric === 'all' || activeMetric === 'cpu_mem') && (
                <>
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    name="CPU Auslastung"
                    stroke={currentTheme.primary}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    name="Speicherbelegung"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}
              {activeMetric === 'all' && (
                <Line
                  type="monotone"
                  dataKey="latency"
                  name="Latenz"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-[var(--hud-border)]/40">
        <div className="flex items-center gap-3">
          {(activeMetric === 'all' || activeMetric === 'cpu_mem') && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2 h-0.5 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                <span>CPU %</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-0.5 rounded-full bg-emerald-400" />
                <span>MEM %</span>
              </div>
            </>
          )}
          {(activeMetric === 'all' || activeMetric === 'latency') && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-0.5 rounded-full bg-amber-400" />
              <span>LATENZ (ms)</span>
            </div>
          )}
        </div>
        <span className="text-slate-500">2s ABTASTRATE</span>
      </div>
    </div>
  );
};
