'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface DictationButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

function checkSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindow;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function DictationButton({ onTranscript, disabled = false }: DictationButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = React.useSyncExternalStore(
    () => () => {},
    checkSpeechSupported,
    () => false
  );

  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (isMountedRef.current) {
      setIsListening(false);
    }
  };

  const startRecognition = () => {
    if (typeof window === 'undefined' || disabled) return;
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    // Abort any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        if (isMountedRef.current) {
          setIsListening(true);
        }
      };

      recognition.onresult = (event: any) => {
        let finalSegment = '';

        // Only append chunks marked as isFinal to prevent duplicate text explosions
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0]?.transcript || '';
            finalSegment += transcript;
          }
        }

        const trimmed = finalSegment.trim();
        if (trimmed && onTranscriptRef.current) {
          onTranscriptRef.current(trimmed);
        }
      };

      recognition.onerror = (event: any) => {
        // Ignore non-fatal 'no-speech'
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition warning:', event.error);
        }
        if (isMountedRef.current && (event.error === 'not-allowed' || event.error === 'service-not-allowed')) {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not initialize Speech Recognition:', err);
      if (isMountedRef.current) {
        setIsListening(false);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? 'Stop dictation' : 'Dictate raw thoughts (Speech to text)'}
      className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
        isListening
          ? 'bg-rose-500/15 text-rose-500 ring-2 ring-rose-500/40 animate-pulse'
          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
      }`}
    >
      {isListening ? (
        <MicOff className="w-4 h-4 text-rose-500" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
      {isListening && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
        </span>
      )}
    </button>
  );
}
