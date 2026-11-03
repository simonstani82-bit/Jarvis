import { useState, useEffect, useRef } from 'react';
import { voiceService } from '../services/voiceService';

export interface AudioVisualizerState {
  frequencies: number[]; // 16 normalized frequency bins (0.05 to 1.0)
  radialBars: number[];  // 24 circular radial frequency points (0.05 to 1.0)
  amplitude: number;     // Overall RMS amplitude (0.0 to 1.0)
  decibels: number;      // Rough dB estimation (-60 to 0 dB)
  isLiveMicActive: boolean;
}

export function useAudioVisualizer(isListening: boolean, isSpeaking: boolean): AudioVisualizerState {
  const [frequencies, setFrequencies] = useState<number[]>(() => Array(16).fill(0.12));
  const [radialBars, setRadialBars] = useState<number[]>(() => Array(24).fill(0.12));
  const [amplitude, setAmplitude] = useState<number>(0.05);
  const [decibels, setDecibels] = useState<number>(-45);
  const [isLiveMicActive, setIsLiveMicActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const attachedStreamRef = useRef<MediaStream | null>(null);

  // Monitor voiceService.getActiveMediaStream() when listening
  useEffect(() => {
    let checkInterval: any = null;

    if (isListening) {
      const attachStream = (stream: MediaStream) => {
        try {
          if (attachedStreamRef.current === stream && analyserRef.current) return;
          attachedStreamRef.current = stream;

          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioCtxRef.current = ctx;

          const source = ctx.createMediaStreamSource(stream);
          sourceNodeRef.current = source;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.75;
          source.connect(analyser);
          analyserRef.current = analyser;
          setIsLiveMicActive(true);
        } catch (e) {
          console.warn('AudioVisualizer attach stream error:', e);
          setIsLiveMicActive(false);
        }
      };

      // Check immediately and poll until stream is acquired by voiceService
      const stream = voiceService.getActiveMediaStream();
      if (stream) {
        attachStream(stream);
      } else {
        checkInterval = setInterval(() => {
          const s = voiceService.getActiveMediaStream();
          if (s) {
            attachStream(s);
            clearInterval(checkInterval);
          }
        }, 150);
      }
    } else {
      setIsLiveMicActive(false);
      attachedStreamRef.current = null;
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch {}
        sourceNodeRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch {}
        sourceNodeRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      attachedStreamRef.current = null;
    };
  }, [isListening]);

  // Main 60FPS animation loop
  useEffect(() => {
    const dataArray = new Uint8Array(32);

    const updateFrame = () => {
      if (isListening && analyserRef.current) {
        // Real microphone frequency data from voiceService shared stream
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const newFreqs: number[] = [];
        for (let i = 0; i < 16; i++) {
          const raw = dataArray[i] / 255;
          const val = Math.max(0.1, Math.min(1.0, raw * 1.35));
          newFreqs.push(val);
          sum += raw;
        }

        const avg = sum / 16;
        const dB = avg > 0.01 ? Math.round(20 * Math.log10(avg)) : -60;

        const newRadial: number[] = [];
        for (let j = 0; j < 24; j++) {
          const idx = j < 12 ? j : 23 - j;
          newRadial.push(newFreqs[idx % 16] || 0.1);
        }

        setAmplitude(avg);
        setDecibels(dB);
        setFrequencies(newFreqs);
        setRadialBars(newRadial);
      } else if (isSpeaking) {
        // Speech synthesis vocal cadence harmonics
        const time = performance.now() * 0.008;
        const newFreqs: number[] = [];
        let sum = 0;

        for (let i = 0; i < 16; i++) {
          const baseSyllable = Math.sin(time * 2.2 + i * 0.5) * 0.35;
          const harmonic = Math.cos(time * 3.8 - i * 0.3) * 0.25;
          const jitter = (Math.sin(time * 12 + i) + 1) * 0.12;
          const val = Math.max(0.12, Math.min(1.0, baseSyllable + harmonic + jitter + 0.38));
          newFreqs.push(val);
          sum += val;
        }

        const avg = sum / 16;
        const dB = Math.round(-32 + avg * 24);

        const newRadial: number[] = [];
        for (let j = 0; j < 24; j++) {
          const idx = j < 12 ? j : 23 - j;
          newRadial.push(newFreqs[idx % 16]);
        }

        setAmplitude(avg);
        setDecibels(dB);
        setFrequencies(newFreqs);
        setRadialBars(newRadial);
      } else if (isListening) {
        // Listening waiting for mic initial sound
        const time = performance.now() * 0.005;
        const newFreqs = Array.from({ length: 16 }, (_, i) => 
          Math.max(0.1, 0.22 + Math.sin(time * 3 + i * 0.6) * 0.18)
        );
        setAmplitude(0.22);
        setDecibels(-30);
        setFrequencies(newFreqs);
        setRadialBars(newFreqs.slice(0, 12).concat(newFreqs.slice(0, 12).reverse()));
      } else {
        // Idle gentle breathing state
        const time = performance.now() * 0.002;
        const newFreqs = Array.from({ length: 16 }, (_, i) => 
          0.1 + Math.sin(time + i * 0.4) * 0.04
        );
        setAmplitude(0.06);
        setDecibels(-54);
        setFrequencies(newFreqs);
        setRadialBars(Array(24).fill(0.1));
      }

      animFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isListening, isSpeaking]);

  return {
    frequencies,
    radialBars,
    amplitude,
    decibels,
    isLiveMicActive,
  };
}
