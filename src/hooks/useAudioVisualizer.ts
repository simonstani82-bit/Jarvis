import { useState, useEffect, useRef } from 'react';
import { voiceService } from '../services/voiceService';

export interface AudioVisualizerState {
  frequencies: number[];     // 32 normalized frequency bins (0.0 to 1.0)
  waveform: number[];        // 64 time-domain waveform points (-1.0 to 1.0)
  radialBars: number[];      // 24 circular radial frequency points (0.0 to 1.0)
  amplitude: number;         // Overall RMS amplitude (0.0 to 1.0)
  decibels: number;          // Rough dB estimation (-60 to 0 dB)
  dominantFrequency: number; // Estimated dominant frequency in Hz
  isLiveMicActive: boolean;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}

export function useAudioVisualizer(isListening: boolean, isSpeaking: boolean): AudioVisualizerState {
  const [frequencies, setFrequencies] = useState<number[]>(() => Array(32).fill(0.08));
  const [waveform, setWaveform] = useState<number[]>(() => Array(64).fill(0));
  const [radialBars, setRadialBars] = useState<number[]>(() => Array(24).fill(0.08));
  const [amplitude, setAmplitude] = useState<number>(0.04);
  const [decibels, setDecibels] = useState<number>(-45);
  const [dominantFreq, setDominantFreq] = useState<number>(180);
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
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          audioCtxRef.current = ctx;

          const source = ctx.createMediaStreamSource(stream);
          sourceNodeRef.current = source;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128; // 64 frequency bins, 128 time-domain samples
          analyser.smoothingTimeConstant = 0.72;
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
        }, 120);
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
    const freqArray = new Uint8Array(64);
    const timeDomainArray = new Uint8Array(128);

    const updateFrame = () => {
      if (isListening && analyserRef.current) {
        // Real microphone frequency data & waveform
        analyserRef.current.getByteFrequencyData(freqArray);
        analyserRef.current.getByteTimeDomainData(timeDomainArray);

        let sum = 0;
        let maxVal = 0;
        let maxIdx = 0;
        const newFreqs: number[] = [];

        // 32 bins
        for (let i = 0; i < 32; i++) {
          const raw = freqArray[i] / 255;
          const val = Math.max(0.06, Math.min(1.0, raw * 1.35));
          newFreqs.push(val);
          sum += raw;
          if (raw > maxVal) {
            maxVal = raw;
            maxIdx = i;
          }
        }

        // 64 waveform points normalized (-1 to 1)
        const newWaveform: number[] = [];
        for (let j = 0; j < 64; j++) {
          const raw = (timeDomainArray[j * 2] - 128) / 128;
          newWaveform.push(raw);
        }

        const avg = sum / 32;
        const dB = avg > 0.01 ? Math.round(20 * Math.log10(avg)) : -60;
        const estimatedHz = Math.round(80 + maxIdx * 280);

        // 24 radial points
        const newRadial: number[] = [];
        for (let r = 0; r < 24; r++) {
          const idx = r < 12 ? r * 2 : (23 - r) * 2;
          newRadial.push(newFreqs[idx % 32] || 0.1);
        }

        setAmplitude(avg);
        setDecibels(dB);
        setDominantFreq(estimatedHz);
        setFrequencies(newFreqs);
        setWaveform(newWaveform);
        setRadialBars(newRadial);
      } else if (isSpeaking) {
        // Speech synthesis vocal cadence harmonics
        const time = performance.now() * 0.008;
        const newFreqs: number[] = [];
        const newWaveform: number[] = [];
        let sum = 0;

        for (let i = 0; i < 32; i++) {
          const base = Math.sin(time * 2.2 + i * 0.4) * 0.35;
          const harmonic = Math.cos(time * 3.8 - i * 0.25) * 0.25;
          const jitter = (Math.sin(time * 12 + i) + 1) * 0.1;
          const val = Math.max(0.08, Math.min(1.0, base + harmonic + jitter + 0.35));
          newFreqs.push(val);
          sum += val;
        }

        // Waveform with voice formant vibrations
        for (let j = 0; j < 64; j++) {
          const w = (Math.sin(time * 6 + j * 0.3) * 0.4 + Math.sin(time * 14 + j * 0.6) * 0.2) * (0.4 + (sum / 32) * 0.6);
          newWaveform.push(w);
        }

        const avg = sum / 32;
        const dB = Math.round(-32 + avg * 22);

        const newRadial: number[] = [];
        for (let r = 0; r < 24; r++) {
          const idx = r < 12 ? r : 23 - r;
          newRadial.push(newFreqs[idx % 32]);
        }

        setAmplitude(avg);
        setDecibels(dB);
        setDominantFreq(Math.round(280 + Math.sin(time * 2) * 140));
        setFrequencies(newFreqs);
        setWaveform(newWaveform);
        setRadialBars(newRadial);
      } else if (isListening) {
        // Listening fallback / waiting
        const time = performance.now() * 0.005;
        const newFreqs = Array.from({ length: 32 }, (_, i) => 
          Math.max(0.08, 0.2 + Math.sin(time * 3 + i * 0.4) * 0.16)
        );
        const newWaveform = Array.from({ length: 64 }, (_, j) => 
          Math.sin(time * 4 + j * 0.2) * 0.2
        );
        setAmplitude(0.2);
        setDecibels(-30);
        setDominantFreq(220);
        setFrequencies(newFreqs);
        setWaveform(newWaveform);
        setRadialBars(newFreqs.slice(0, 24));
      } else {
        // Idle state: subtle resting ripple
        const time = performance.now() * 0.002;
        const newFreqs = Array.from({ length: 32 }, (_, i) => 
          0.06 + Math.sin(time + i * 0.3) * 0.03
        );
        const newWaveform = Array.from({ length: 64 }, (_, j) => 
          Math.sin(time + j * 0.15) * 0.05
        );
        setAmplitude(0.04);
        setDecibels(-54);
        setDominantFreq(120);
        setFrequencies(newFreqs);
        setWaveform(newWaveform);
        setRadialBars(Array(24).fill(0.06));
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
    waveform,
    radialBars,
    amplitude,
    decibels,
    dominantFrequency: dominantFreq,
    isLiveMicActive,
    analyserRef,
  };
}
