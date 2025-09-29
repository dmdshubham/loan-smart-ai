export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionCallbacks {
  onResult?: (result: SpeechRecognitionResult) => void;
  onStart?: () => void;
  onEnd?: (finalTranscript?: string) => void;
  onError?: (error: string) => void;
  onFinalResult?: (transcript: string) => void;
}

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;
  private recognition: any;
  private callbacks: SpeechRecognitionCallbacks = {};
  private isListening: boolean = false;
  private finalTranscript: string = '';
  private interimTranscript: string = '';

  constructor() {
    // Don't initialize immediately - wait until first use
  }

  static getInstance(): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService();
    }
    return SpeechRecognitionService.instance;
  }

  private ensureInitialized(): boolean {
    if (this.recognition) {
      return true; // Already initialized
    }

    return this.initializeRecognition();
  }

  private initializeRecognition(): boolean {
    // Check if speech recognition is supported
    if (typeof window === 'undefined') {
      return false;
    }

    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionConstructor) {
      console.warn('Speech recognition not supported in this browser');
      return false;
    }

    try {
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      this.recognition = null;
      return false;
    }

    this.recognition.onstart = () => {
      this.isListening = true;
      this.finalTranscript = '';
      this.interimTranscript = '';
      this.callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }

        // Call result callback for each result
        this.callbacks.onResult?.({
          transcript: event.results[i].isFinal ? finalTranscript : interimTranscript,
          confidence,
          isFinal: event.results[i].isFinal
        });
      }

      // Update transcripts
      this.interimTranscript = interimTranscript;
      this.finalTranscript += finalTranscript;

      // Call final result callback when we have final results
      if (finalTranscript) {
        this.callbacks.onFinalResult?.(this.finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your connection.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      this.callbacks.onError?.(errorMessage);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Provide the final transcript to onEnd for convenience
      this.callbacks.onEnd?.(this.finalTranscript);
    };

    return true;
  }

  setCallbacks(callbacks: SpeechRecognitionCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  startListening(): boolean {
    if (!this.ensureInitialized()) {
      this.callbacks.onError?.('Speech recognition not supported or failed to initialize');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      // Hard reset transcripts at the start of every session to avoid carry-over
      this.finalTranscript = '';
      this.interimTranscript = '';
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.callbacks.onError?.('Failed to start speech recognition');
      return false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  }

  abortListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.abort();
      } catch (error) {
        console.error('Error aborting speech recognition:', error);
      }
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  getFinalTranscript(): string {
    return this.finalTranscript;
  }

  getInterimTranscript(): string {
    return this.interimTranscript;
  }

  clearTranscripts(): void {
    this.finalTranscript = '';
    this.interimTranscript = '';
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }
}

export const speechRecognitionService = SpeechRecognitionService.getInstance();