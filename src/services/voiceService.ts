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

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError('Mikrofonzugriff wird von diesem Browser nicht unterstützt.');
      return;
    }

    this.capturedTranscript = '';
    this.audioChunks = [];

    // 1. Request real microphone access via getUserMedia
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      this.isListening = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        onError('Mikrofon-Berechtigung wurde verweigert. Bitte erlauben Sie den Mikrofonzugriff in den Browsereinstellungen für diese Seite.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        onError('Kein funktionierendes Mikrofon auf diesem System gefunden.');
      } else {
        onError(`Mikrofon konnte nicht aktiviert werden: ${err.message || 'Unbekannter Fehler'}`);
      }
      return;
    }

    this.isListening = true;

    // 2. Setup MediaRecorder for fail-safe audio transcription via Gemini
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
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);

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

    // 3. Simultaneously start Web SpeechRecognition for instant live interim text (if supported)
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
          // Do not kill listening on standard minor errors ('no-speech', 'network' in iframes)
          // because MediaRecorder continues recording in the background!
          console.warn('SpeechRecognition notification (MediaRecorder still recording):', event.error);
        };

        this.recognition.onend = () => {
          // Don't kill listening if mediaRecorder is still recording
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

  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (!this.voiceEnabled || !this.isSynthesisSupported()) {
      if (onEnd) onEnd();
      return;
    }

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

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }
}

export const voiceService = new VoiceService();
