/**
 * JARVIS Voice Interface (Web Speech API)
 * Handles German speech recognition and text-to-speech synthesis
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

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

class VoiceService {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private isSpeaking = false;
  private voiceEnabled = true;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      if (this.recognition) {
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'de-DE';
      }
    }
  }

  public isSpeechSupported(): boolean {
    return !!this.recognition;
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

  public startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError('Spracherkennung wird in diesem Browser nicht direkt unterstützt.');
      return;
    }

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    this.recognition.onstart = () => {
      this.isListening = true;
    };

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

      const text = final || interim;
      onResult(text, !!final);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error || 'Fehler bei der Spracherkennung');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      // In case already started
      this.recognition.stop();
      setTimeout(() => {
        try {
          this.recognition?.start();
        } catch {
          onError('Mikrofon konnte nicht aktiviert werden.');
        }
      }, 150);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
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

    // Clean text of markdown, code blocks, or tool meta for clean speech
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
    utterance.pitch = 0.95; // Slightly deeper, sophisticated Stark/JARVIS tone
    utterance.rate = 1.05;  // Crisp, articulate

    // Find best German voice
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
