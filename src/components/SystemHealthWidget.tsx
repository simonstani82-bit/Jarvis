import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  Cpu,
  Database,
  Wifi,
  Flame,
  Gauge,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { HudTheme } from '../services/themeService';
import { soundEffects } from '../services/soundEffects';

export interface HealthMetricPoint {
  timestamp: Date;
  cpu: number; // 0 - 100%
  memory: number; // 0 - 100%
  memoryMb: number; // e.g. 1420 MB
  latency: number; // ms
  jitter: number; // ms
  temp: number; // Celsius (e.g. 38 - 65)
}

interface SystemHealthWidgetProps {
  currentTheme: HudTheme;
  isWorking?: boolean;
  onSimulateLoadChange?: (isElevated: boolean) => void;
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  currentTheme,
  isWorking = false,
  onSimulateLoadChange,
}) => {
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const cpuGaugeSvgRef = useRef<SVGSVGElement | null>(null);
  const memGaugeSvgRef = useRef<SVGSVGElement | null>(null);
  const latGaugeSvgRef = useRef<SVGSVGElement | null>(null);

  const [isRunning, setIsRunning] = useState(true);
  const [stressTestActive, setStressTestActive] = useState(false);
  const [filter, setFilter] = useState<'all' | 'cpu' | 'memory' | 'latency'>('all');
  const [currentLatency, setCurrentLatency] = useState(24);
  const [isPinging, setIsPinging] = useState(false);

  // Buffer of historical metric points for D3 timeline
  const [history, setHistory] = useState<HealthMetricPoint[]>(() => {
    const points: HealthMetricPoint[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const t = new Date(now - i * 1500);
      points.push({
        timestamp: t,
        cpu: Math.floor(20 + Math.random() * 12),
        memory: Math.floor(48 + Math.random() * 6),
        memoryMb: Math.floor(1900 + Math.random() * 150),
        latency: Math.floor(18 + Math.random() * 14),
        jitter: Math.floor(1 + Math.random() * 3),
        temp: Math.floor(40 + Math.random() * 3),
      });
    }
    return points;
  });

  const latest = history[history.length - 1] || {
    cpu: 25,
    memory: 50,
    memoryMb: 2048,
    latency: 24,
    jitter: 2,
    temp: 42,
  };

  // Perform a real network ping to /api/health
  const runLivePing = async () => {
    setIsPinging(true);
    soundEffects.playChirp();
    const start = performance.now();
    try {
      await fetch('/api/health');
      const diff = Math.max(8, Math.round(performance.now() - start));
      setCurrentLatency(diff);
      return diff;
    } catch {
      const mock = Math.floor(32 + Math.random() * 20);
      setCurrentLatency(mock);
      return mock;
    } finally {
      setIsPinging(false);
    }
  };

  // Toggle simulated stress test / high neural load
  const toggleStressTest = () => {
    const nextState = !stressTestActive;
    setStressTestActive(nextState);
    if (nextState) {
      soundEffects.playStartup();
    } else {
      soundEffects.playConfirm();
    }
    if (onSimulateLoadChange) {
      onSimulateLoadChange(nextState);
    }
  };

  // Periodic metric recording loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const now = new Date();
      // CPU baseline elevated when agent is working or during stress test
      const baseCpu = stressTestActive ? 84 : isWorking ? 68 : 22;
      const cpuJitter = (Math.random() * 18 - 8);
      const newCpu = Math.min(99, Math.max(10, Math.round(baseCpu + cpuJitter)));

      // Memory baseline
      const baseMem = stressTestActive ? 78 : isWorking ? 62 : 46;
      const newMem = Math.min(95, Math.max(30, Math.round(baseMem + (Math.random() * 6 - 3))));
      const newMemMb = Math.round((newMem / 100) * 4096);

      // Latency with jitter
      const latJitter = Math.random() * 10 - 5;
      const newLat = Math.min(150, Math.max(12, Math.round(currentLatency + latJitter)));
      const newJitter = Math.abs(Math.round(latJitter));

      // Temp reacts to CPU
      const newTemp = Math.round(38 + (newCpu / 100) * 26 + (Math.random() * 2 - 1));

      setHistory((prev) => {
        const next = [...prev.slice(1)];
        next.push({
          timestamp: now,
          cpu: newCpu,
          memory: newMem,
          memoryMb: newMemMb,
          latency: newLat,
          jitter: newJitter,
          temp: newTemp,
        });
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning, stressTestActive, isWorking, currentLatency]);

  // Render D3 Timeline Multi-Metric Chart
  useEffect(() => {
    if (!chartSvgRef.current || history.length === 0) return;

    const svg = d3.select(chartSvgRef.current);
    svg.selectAll('*').remove();

    const width = 640;
    const height = 180;
    const margin = { top: 18, right: 36, bottom: 26, left: 38 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale: Time
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(history, (d) => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    // Y scale: 0 to 100 (for % and scaled ms)
    const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', 'rgba(255,255,255,0.06)')
      .attr('stroke-dasharray', '3 3');

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => d3.timeFormat('%H:%M:%S')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}%`))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');

    g.selectAll('.domain').attr('stroke', 'rgba(255,255,255,0.15)');

    // Defs for gradients
    const defs = svg.append('defs');

    // CPU Gradient (Primary Theme Color)
    const cpuGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-cpu-grad')
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    cpuGrad.append('stop').attr('offset', '0%').attr('stop-color', currentTheme.primary).attr('stop-opacity', 0.45);
    cpuGrad.append('stop').attr('offset', '100%').attr('stop-color', currentTheme.primary).attr('stop-opacity', 0.0);

    // RAM Gradient (Violet/Purple)
    const ramGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-ram-grad')
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');
    ramGrad.append('stop').attr('offset', '0%').attr('stop-color', '#a855f7').attr('stop-opacity', 0.35);
    ramGrad.append('stop').attr('offset', '100%').attr('stop-color', '#a855f7').attr('stop-opacity', 0.0);

    // D3 Line & Area Generators
    const cpuArea = d3
      .area<HealthMetricPoint>()
      .x((d) => xScale(d.timestamp))
      .y0(innerHeight)
      .y1((d) => yScale(d.cpu))
      .curve(d3.curveMonotoneX);

    const cpuLine = d3
      .line<HealthMetricPoint>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.cpu))
      .curve(d3.curveMonotoneX);

    const ramLine = d3
      .line<HealthMetricPoint>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.memory))
      .curve(d3.curveMonotoneX);

    const latLine = d3
      .line<HealthMetricPoint>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(Math.min(100, (d.latency / 120) * 100)))
      .curve(d3.curveMonotoneX);

    // Render curves based on selected filter
    if (filter === 'all' || filter === 'cpu') {
      g.append('path')
        .datum(history)
        .attr('fill', 'url(#d3-cpu-grad)')
        .attr('d', cpuArea);

      g.append('path')
        .datum(history)
        .attr('fill', 'none')
        .attr('stroke', currentTheme.primary)
        .attr('stroke-width', 2)
        .attr('filter', 'drop-shadow(0 0 6px ' + currentTheme.primary + ')')
        .attr('d', cpuLine);
    }

    if (filter === 'all' || filter === 'memory') {
      g.append('path')
        .datum(history)
        .attr('fill', 'none')
        .attr('stroke', '#c084fc')
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', filter === 'all' ? '4 2' : 'none')
        .attr('d', ramLine);
    }

    if (filter === 'all' || filter === 'latency') {
      g.append('path')
        .datum(history)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.6)
        .attr('d', latLine);
    }

    // Interactive Crosshair & Tooltip overlay
    const crosshair = g.append('line')
      .attr('stroke', '#f8fafc')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 2')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    const focusPoint = g.append('circle')
      .attr('r', 4)
      .attr('fill', currentTheme.primary)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    const tooltipGroup = g.append('g').style('opacity', 0);
    const tooltipRect = tooltipGroup.append('rect')
      .attr('fill', '#020617')
      .attr('stroke', currentTheme.primary)
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .attr('filter', 'drop-shadow(0 0 8px rgba(0,0,0,0.8))');

    const tooltipText = tooltipGroup.append('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('fill', '#f1f5f9');

    const bisectDate = d3.bisector<HealthMetricPoint, Date>((d) => d.timestamp).left;

    // Invisible mouse tracking overlay
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const x0 = xScale.invert(mx);
        const idx = bisectDate(history, x0, 1);
        const d0 = history[idx - 1];
        const d1 = history[idx];
        const d = !d0 ? d1 : !d1 ? d0 : (x0.getTime() - d0.timestamp.getTime() > d1.timestamp.getTime() - x0.getTime() ? d1 : d0);

        if (!d) return;

        const xPos = xScale(d.timestamp);
        const yPos = yScale(d.cpu);

        crosshair.attr('x1', xPos).attr('x2', xPos).style('opacity', 0.8);
        focusPoint.attr('cx', xPos).attr('cy', yPos).style('opacity', 1);

        const timeStr = d3.timeFormat('%H:%M:%S')(d.timestamp);
        tooltipText.text(`[${timeStr}] CPU: ${d.cpu}% | RAM: ${d.memory}% | PING: ${d.latency}ms`);
        const bbox = (tooltipText.node() as SVGTextElement).getBBox();
        tooltipRect
          .attr('x', bbox.x - 6)
          .attr('y', bbox.y - 3)
          .attr('width', bbox.width + 12)
          .attr('height', bbox.height + 6);

        let tipX = xPos + 10;
        if (tipX + bbox.width > innerWidth) tipX = xPos - bbox.width - 15;
        tooltipGroup.attr('transform', `translate(${tipX}, ${Math.max(15, yPos - 10)})`).style('opacity', 1);
      })
      .on('mouseleave', () => {
        crosshair.style('opacity', 0);
        focusPoint.style('opacity', 0);
        tooltipGroup.style('opacity', 0);
      });
  }, [history, filter, currentTheme]);

  // Render D3 Radial Gauge Helper
  const renderD3Gauge = (
    svgRef: React.RefObject<SVGSVGElement | null>,
    value: number,
    color: string,
    label: string,
    unit: string
  ) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const size = 110;
    const radius = size / 2;
    const strokeWidth = 9;

    svg.attr('viewBox', `0 0 ${size} ${size}`);

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

    const startAngle = -0.75 * Math.PI;
    const endAngle = 0.75 * Math.PI;

    // Track arc
    const backgroundArc = d3
      .arc()
      .innerRadius(radius - strokeWidth)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(4);

    g.append('path')
      .attr('d', backgroundArc as any)
      .attr('fill', 'rgba(255,255,255,0.08)');

    // Value arc
    const currentAngle = startAngle + (value / 100) * (endAngle - startAngle);
    const foregroundArc = d3
      .arc()
      .innerRadius(radius - strokeWidth)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(Math.min(endAngle, currentAngle))
      .cornerRadius(4);

    g.append('path')
      .attr('d', foregroundArc as any)
      .attr('fill', color)
      .attr('filter', `drop-shadow(0 0 6px ${color})`);

    // Center Value Readout
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.1em')
      .attr('fill', '#f8fafc')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(`${Math.round(value)}${unit}`);

    // Subtitle label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.6em')
      .attr('fill', '#94a3b8')
      .attr('font-size', '8px')
      .attr('letter-spacing', '1px')
      .attr('font-family', 'monospace')
      .text(label);
  };

  // Render the 3 Radial Gauges with D3
  useEffect(() => {
    // CPU Gauge
    const cpuColor = latest.cpu > 75 ? '#ef4444' : latest.cpu > 50 ? '#f59e0b' : currentTheme.primary;
    renderD3Gauge(cpuGaugeSvgRef, latest.cpu, cpuColor, 'CPU LOAD', '%');

    // Memory Gauge
    const memColor = latest.memory > 80 ? '#ef4444' : '#c084fc';
    renderD3Gauge(memGaugeSvgRef, latest.memory, memColor, 'RAM HEAP', '%');

    // Latency Gauge (scaled 0 - 100ms)
    const latColor = latest.latency > 70 ? '#ef4444' : latest.latency > 35 ? '#f59e0b' : '#38bdf8';
    renderD3Gauge(latGaugeSvgRef, Math.min(100, (latest.latency / 120) * 100), latColor, `${latest.latency}ms`, '');
  }, [latest, currentTheme]);

  return (
    <div className="rounded-xl border border-[var(--hud-border)] bg-slate-950/90 backdrop-blur-md p-3 sm:p-4 text-xs font-mono shadow-[0_0_20px_var(--hud-dim)] space-y-3.5 transition-colors duration-300">
      {/* Title & Live Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hud-border)]/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[var(--hud-accent-bg)] border border-[var(--hud-border)] text-[var(--hud-primary)]">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-100 tracking-wider">
              <span>SYSTEM HEALTH // D3-DIAGNOSE</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/40">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Echtzeit-Telemetrie & Hardware-Ressourcen der Mark-LXXXV-Architektur
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={runLivePing}
            disabled={isPinging}
            className="px-2.5 py-1 rounded border border-[var(--hud-border)] bg-[var(--hud-accent-bg)] hover:border-[var(--hud-primary)] text-[var(--hud-primary)] text-[10px] flex items-center gap-1 transition-all"
            title="Echten HTTP-Ping zur Server-API messen"
          >
            <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
            <span>PING TEST</span>
          </button>

          <button
            onClick={toggleStressTest}
            className={`px-2.5 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition-all ${
              stressTestActive
                ? 'border-rose-500 bg-rose-950/70 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.4)] animate-pulse'
                : 'border-amber-500/50 bg-amber-950/30 text-amber-300 hover:border-amber-400'
            }`}
            title="Simuliert hohe kognitive Rechenlast für Stresstests"
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>{stressTestActive ? 'STRESS-TEST AKTIV' : 'LAST SIMULIEREN'}</span>
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-1 rounded border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-100 transition-colors"
            title={isRunning ? 'Telemetrie pausieren' : 'Telemetrie fortsetzen'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 3 D3 Radial Gauges */}
      <div className="grid grid-cols-3 gap-2 py-1 bg-slate-900/40 rounded-lg p-2 border border-white/5">
        <div className="flex flex-col items-center">
          <svg ref={cpuGaugeSvgRef} className="w-20 h-20 sm:w-24 sm:h-24" />
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Cpu className="w-3 h-3 text-[var(--hud-primary)]" />
            <span>{stressTestActive ? 'HEAVY LOAD' : isWorking ? 'PROCESSING' : 'NORMAL'}</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <svg ref={memGaugeSvgRef} className="w-20 h-20 sm:w-24 sm:h-24" />
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Database className="w-3 h-3 text-purple-400" />
            <span>{latest.memoryMb} MB HEAP</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <svg ref={latGaugeSvgRef} className="w-20 h-20 sm:w-24 sm:h-24" />
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Wifi className="w-3 h-3 text-sky-400" />
            <span>JITTER: ±{latest.jitter}ms</span>
          </div>
        </div>
      </div>

      {/* D3 Multi-Line Stream Chart */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[var(--hud-primary)]" />
            <span>D3 HISTORIE (LETZTE 30s)</span>
          </span>

          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded border border-white/10 text-[10px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--hud-primary)] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ALLE
            </button>
            <button
              onClick={() => setFilter('cpu')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'cpu'
                  ? 'bg-[var(--hud-primary)] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setFilter('memory')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'memory'
                  ? 'bg-purple-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RAM
            </button>
            <button
              onClick={() => setFilter('latency')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'latency'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PING
            </button>
          </div>
        </div>

        {/* SVG Container for D3 */}
        <div className="w-full bg-slate-950/80 rounded-lg border border-[var(--hud-border)] overflow-hidden">
          <svg ref={chartSvgRef} className="w-full h-auto block" />
        </div>
      </div>

      {/* Live System Spec Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[var(--hud-border)]/50 text-[10px]">
        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
          <span className="text-slate-400 block">KERN-TEMPERATUR</span>
          <span className={`font-bold text-xs ${latest.temp > 55 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {latest.temp}°C {latest.temp > 55 ? '▲ ERHÖHT' : '● NOMINAL'}
          </span>
        </div>
        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
          <span className="text-slate-400 block">THREAD POOL</span>
          <span className="font-bold text-xs text-slate-200">8 vCPU / CLUSTER</span>
        </div>
        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
          <span className="text-slate-400 block">PAKETVERLUST</span>
          <span className="font-bold text-xs text-emerald-400">0.00% (STABIL)</span>
        </div>
        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
          <span className="text-slate-400 block">AGENT-PIPELINE</span>
          <span className="font-bold text-xs text-[var(--hud-primary)]">
            {isWorking ? 'AKTIV // FUNCTION' : 'IDLE // STANDBY'}
          </span>
        </div>
      </div>
    </div>
  );
};
