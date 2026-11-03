import { useState, useEffect, useRef } from 'react';

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
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Setup / teardown microphone audio analyzer when isListening changes
  useEffect(() => {
    let active = true;

    if (isListening) {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            if (!active) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            micStreamRef.current = stream;
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64; // 32 frequency bins
            analyser.smoothingTimeConstant = 0.75;
            source.connect(analyser);
            analyserRef.current = analyser;
            setIsLiveMicActive(true);
          })
          .catch((err) => {
            console.warn('Microphone access for visualizer:', err.message);
            setIsLiveMicActive(false);
          });
      }
    } else {
      setIsLiveMicActive(false);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    }

    return () => {
      active = false;
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [isListening]);

  // Main 60FPS animation loop
  useEffect(() => {
    const dataArray = new Uint8Array(32);

    const updateFrame = () => {
      if (isListening && analyserRef.current) {
        // Real microphone frequency data
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const newFreqs: number[] = [];
        for (let i = 0; i < 16; i++) {
          const raw = dataArray[i] / 255;
          const val = Math.max(0.1, Math.min(1.0, raw * 1.3)); // Boost slightly for high visual responsiveness
          newFreqs.push(val);
          sum += raw;
        }

        const avg = sum / 16;
        const dB = avg > 0.01 ? Math.round(20 * Math.log10(avg)) : -60;

        // Generate 24 radial points mirrored from the 16 bins for symmetry
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
        // Realistic synthetic speech vocal cadence harmonics
        const time = performance.now() * 0.008;
        const newFreqs: number[] = [];
        let sum = 0;

        for (let i = 0; i < 16; i++) {
          // Multitonal syllabic resonance: vowels formants + consonant noise
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
        // Fallback when mic permission is loading/denied
        const time = performance.now() * 0.005;
        const newFreqs = Array.from({ length: 16 }, (_, i) => 
          Math.max(0.1, 0.2 + Math.sin(time * 3 + i * 0.6) * 0.2)
        );
        setAmplitude(0.25);
        setDecibels(-28);
        setFrequencies(newFreqs);
        setRadialBars(newFreqs.slice(0, 12).concat(newFreqs.slice(0, 12).reverse()));
      } else {
        // Idle state: subtle pulsing resting breath
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
