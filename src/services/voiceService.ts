/**
 * JARVIS Hybrid Voice Interface
 * Combines Web Speech API with MediaRecorder & Gemini Neural Audio Transcription
 * for 100% reliable voice input across browsers and sandboxed iframes.
 */

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

class VoiceService {
  private recognition: any = null;
  private isListening = false;
  private isSpeaking = false;
  private voiceEnabled = true;

  // MediaRecorder audio capture
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private capturedTranscript = '';

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        if (this.recognition) {
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          this.recognition.lang = 'de-DE';
          this.recognition.maxAlternatives = 1;
        }
      } catch (e) {
        console.warn('SpeechRecognition initialization warning:', e);
      }
    }
  }

  public isSpeechSupported(): boolean {
    return Boolean(
      (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia)
    );
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isVoiceOutputEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVoiceOutputEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled && this.isSpeaking) {
      this.stopSpeaking();
    }
  }

  public toggleVoiceOutput(): boolean {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled && this.isSpeaking) {
      this.stopSpeaking();
    }
    return this.voiceEnabled;
  }

  public getActiveMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public async checkPermission(): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'> {
    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
      return 'unsupported';
    }
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as any });
      return status.state;
    } catch {
      return 'unsupported';
    }
  }

  /**
   * Request microphone permission explicitly via user gesture
   */
  public async requestMicrophoneAccess(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep tracks active briefly then store or release
      this.mediaStream = stream;
      return true;
    } catch (e) {
      console.warn('Microphone permission request rejected:', e);
      return false;
    }
  }

  /**
   * Start listening using microphone MediaStream + optional SpeechRecognition.
   */
  public async startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (errorMsg: string) => void,
    onEnd: () => void
  ) {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    this.capturedTranscript = '';
    this.audioChunks = [];
    let hasMediaStream = false;
    let permDenied = false;

    // 1. Try requesting real microphone access via getUserMedia
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        // First try with enhanced audio constraints
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        hasMediaStream = true;
      } catch (err: any) {
        console.warn('Primary getUserMedia attempt note:', err.name, err.message);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          permDenied = true;
        } else {
          // Try minimal constraint { audio: true }
          try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            hasMediaStream = true;
          } catch (fallbackErr: any) {
            console.warn('Minimal getUserMedia failed:', fallbackErr.name);
            if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
              permDenied = true;
            }
          }
        }
      }
    }

    // 2. If getUserMedia was explicitly denied, do NOT try SpeechRecognition directly to prevent abrupt dual errors
    if (!hasMediaStream) {
      this.isListening = false;
      if (permDenied) {
        onError('Mikrofon-Berechtigung wurde verweigert. Bitte erlauben Sie den Mikrofonzugriff in den Browsereinstellungen für diese Seite.');
      } else if (this.recognition) {
        // If not explicitly denied (e.g. no getUserMedia support), try speech recognition
        try {
          this.isListening = true;

          this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const item = event.results[i][0];
              if (event.results[i].isFinal) {
                final += item.transcript;
              } else {
                interim += item.transcript;
              }
            }

            const currentText = final || interim;
            onResult(currentText, Boolean(final));
          };

          this.recognition.onerror = (event: any) => {
            this.isListening = false;
            console.warn('SpeechRecognition error:', event.error);
            if (event.error === 'not-allowed') {
              onError('Mikrofon-Berechtigung wurde verweigert. Bitte erlauben Sie den Mikrofonzugriff in den Browsereinstellungen für diese Seite.');
            } else if (event.error === 'no-speech') {
              onError('Keine Sprache erkannt. Bitte sprechen Sie deutlicher oder näher an das Mikrofon.');
            } else {
              onError(`Spracherkennungsfehler: ${event.error}`);
            }
            onEnd();
          };

          this.recognition.onend = () => {
            this.isListening = false;
            onEnd();
          };

          this.recognition.start();
          return;
        } catch (speechErr) {
          console.warn('SpeechRecognition start failed:', speechErr);
          onError('Mikrofon-Berechtigung wurde verweigert. Bitte erlauben Sie den Mikrofonzugriff in den Browsereinstellungen für diese Seite.');
        }
      } else {
        onError('Kein Mikrofonzugriff möglich. Bitte überprüfen Sie Ihre Mikrofoneinstellungen.');
      }
      return;
    }

    this.isListening = true;

    // 3. Setup MediaRecorder for fail-safe audio transcription via Gemini
    try {
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(this.mediaStream!, { mimeType })
        : new MediaRecorder(this.mediaStream!);

      this.mediaRecorder = recorder;
      this.audioChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // If SpeechRecognition already obtained a clear transcript, use it
        if (this.capturedTranscript.trim().length > 0) {
          onResult(this.capturedTranscript.trim(), true);
          onEnd();
          return;
        }

        // Otherwise transcribe recorded audio chunks using Gemini server endpoint
        if (this.audioChunks.length > 0) {
          try {
            const blobType = recorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(this.audioChunks, { type: blobType });
            
            // Only transcribe if audio has meaningful duration
            if (audioBlob.size > 1500) {
              onResult('JARVIS dekodiert Audiosignal...', false);
              const base64Data = await this.blobToBase64(audioBlob);

              const res = await fetch('/api/agent/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioData: base64Data,
                  mimeType: blobType,
                }),
              });

              if (res.ok) {
                const data = await res.json();
                if (data.text && data.text.trim()) {
                  this.capturedTranscript = data.text.trim();
                  onResult(this.capturedTranscript, true);
                  onEnd();
                  return;
                }
              }
            }
          } catch (e: any) {
            console.warn('Neural transcription fallback warning:', e);
          }
        }

        // If no transcript produced
        if (!this.capturedTranscript.trim()) {
          onResult('', false);
        }
        onEnd();
      };

      recorder.start(250); // Collect data slices every 250ms
    } catch (e) {
      console.warn('MediaRecorder init warning:', e);
    }

    // 4. Simultaneously start Web SpeechRecognition for instant live interim text (if supported)
    if (this.recognition) {
      try {
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i][0];
            if (event.results[i].isFinal) {
              final += item.transcript;
            } else {
              interim += item.transcript;
            }
          }

          const currentText = final || interim;
          if (final) {
            this.capturedTranscript = final;
          }
          onResult(currentText, Boolean(final));
        };

        this.recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition notification (MediaRecorder still recording):', event.error);
        };

        this.recognition.onend = () => {
          // Keep listening active while mediaRecorder records
        };

        this.recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition start skipped, using MediaRecorder:', e);
      }
    }
  }

  /**
   * Stop listening and finalize audio processing
   */
  public stopListening() {
    this.isListening = false;

    // Stop recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }

    // Stop MediaRecorder (which triggers onstop and transcription)
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
    }

    // Release microphone tracks
    if (this.mediaStream) {
      setTimeout(() => {
        this.mediaStream?.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }, 300);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:audio/xxx;base64, prefix
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private phraseTimer: any = null;
  private currentPhrases: string[] = [];
  private currentPhraseIndex = 0;
  private phraseListeners: ((phrase: string, index: number, total: number) => void)[] = [];

  public addPhraseListener(listener: (phrase: string, index: number, total: number) => void): () => void {
    this.phraseListeners.push(listener);
    return () => {
      this.phraseListeners = this.phraseListeners.filter((l) => l !== listener);
    };
  }

  private notifyPhrase(phrase: string, index: number, total: number) {
    for (const listener of this.phraseListeners) {
      try {
        listener(phrase, index, total);
      } catch (e) {
        console.warn('Error in phrase listener:', e);
      }
    }
  }

  /**
   * Splits spoken text into concise acoustic phrases (3-8 words or clause boundaries)
   * optimal for floating HUD echo effects.
   */
  public splitIntoSpokenPhrases(text: string): string[] {
    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/https?:\/\/\S+/g, 'Link')
      .replace(/["„“]/g, '')
      .trim();

    if (!clean) return [];

    // Split at sentence boundaries (., !, ?, ;) or newlines
    const rawSentences = clean.split(/(?<=[.!?;\n])\s+/);
    const phrases: string[] = [];

    for (const sentence of rawSentences) {
      const s = sentence.trim();
      if (!s) continue;

      // If sentence has more than 8 words or exceeds 50 characters, break at comma/clause
      const words = s.split(/\s+/);
      if (words.length > 8 || s.length > 50) {
        const subClauses = s.split(/(?<=[,–—])\s+/);
        for (const clause of subClauses) {
          const c = clause.trim();
          if (!c) continue;
          if (c.split(/\s+/).length > 8) {
            // Chunk into smaller word segments
            const cWords = c.split(/\s+/);
            for (let i = 0; i < cWords.length; i += 6) {
              const slice = cWords.slice(i, i + 6).join(' ');
              if (slice.trim()) phrases.push(slice.trim());
            }
          } else {
            phrases.push(c);
          }
        }
      } else {
        phrases.push(s);
      }
    }

    return phrases.length > 0 ? phrases : [clean];
  }

  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onPhrase?: (phrase: string, index: number, total: number) => void
  ) {
    if (!this.voiceEnabled || !this.isSynthesisSupported()) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Codeblock ausgelassen.')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/https?:\/\/\S+/g, 'Link');

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'de-DE';
    utterance.pitch = 0.95;
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find(
      (v) => v.lang.startsWith('de') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Martin') || v.name.includes('Stefan'))
    ) || voices.find((v) => v.lang.startsWith('de'));

    if (deVoice) {
      utterance.voice = deVoice;
    }

    // Prepare phrases for real-time speech echo layer
    const phrases = this.splitIntoSpokenPhrases(cleanText);
    this.currentPhrases = phrases;
    this.currentPhraseIndex = 0;

    const scheduleNextPhrase = (index: number) => {
      if (!this.isSpeaking || index >= phrases.length) return;
      const current = phrases[index];
      this.currentPhraseIndex = index;
      
      if (onPhrase) onPhrase(current, index, phrases.length);
      this.notifyPhrase(current, index, phrases.length);

      // Estimate duration based on word count (~240ms per word + base 600ms)
      const wordCount = current.split(/\s+/).length;
      const estimatedMs = Math.max(1200, Math.min(4200, wordCount * 250 + 600));

      if (index + 1 < phrases.length) {
        this.phraseTimer = setTimeout(() => {
          scheduleNextPhrase(index + 1);
        }, estimatedMs);
      }
    };

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
      if (phrases.length > 0) {
        scheduleNextPhrase(0);
      }
    };

    // Use boundary event if supported by browser for pinpoint synchronicity
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'sentence' || (event.name === 'word' && phrases.length > 1)) {
        // Find which phrase corresponds to the current charIndex
        let cumulativeChars = 0;
        for (let i = 0; i < phrases.length; i++) {
          cumulativeChars += phrases[i].length + 1;
          if (event.charIndex <= cumulativeChars) {
            if (i !== this.currentPhraseIndex) {
              this.currentPhraseIndex = i;
              const p = phrases[i];
              if (onPhrase) onPhrase(p, i, phrases.length);
              this.notifyPhrase(p, i, phrases.length);
            }
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (this.phraseTimer) {
        clearTimeout(this.phraseTimer);
        this.phraseTimer = null;
      }
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (this.phraseTimer) {
        clearTimeout(this.phraseTimer);
        this.phraseTimer = null;
      }
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (this.phraseTimer) {
      clearTimeout(this.phraseTimer);
      this.phraseTimer = null;
    }
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }
}

export const voiceService = new VoiceService();
