import React, { useState, useEffect } from 'react';
import { 
  Delete, 
  Mic, 
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSecondPassword } from './lib/algo';

// Add type declarations for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [code, setCode] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15); // Short, crisp haptic feedback
    }
  };

  const handleNumberClick = (num: string) => {
    triggerHaptic();
    setCode(prev => prev.length < 12 ? prev + num : prev);
    setError(null);
  };

  const handleBackspace = () => {
    triggerHaptic();
    setCode(prev => prev.slice(0, -1));
    setResult(null);
    setError(null);
  };

  const handleClear = () => {
    triggerHaptic();
    setCode('');
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    if (code.length === 12) {
      try {
        const pass = generateSecondPassword(code);
        setResult(pass);
      } catch (err) {
        setError("Invalid code format");
      }
    } else {
      setResult(null);
    }
  }, [code]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        // Extract all digits from the transcript
        const digits = transcript.replace(/\D/g, '');
        if (digits.length >= 12) {
          setCode(digits.slice(0, 12));
          setError(null);
        } else {
          setError(`Found ${digits.length} digits. Please clearly speak 12 digits.`);
        }
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        setError("Voice recognition error: " + event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    } else {
      setError("Speech recognition not supported on this device.");
    }
  }, []);

  // Offline Listen Mode
  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
      return;
    }

    if (recognition) {
      setError(null);
      setIsListening(true);
      try {
        recognition.start();
      } catch (e) {
        recognition.stop();
        setIsListening(false);
      }
    } else {
      setError("Speech recognition not supported on this device.");
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-neutral-950 text-white font-sans flex flex-col overflow-hidden select-none">
      {/* Header / Display */}
      <div className="p-4 pt-8 shrink-0 flex flex-col items-center justify-center space-y-3">
        <h1 className="text-neutral-500 text-[10px] font-mono uppercase tracking-[0.2em]">Service Key Generator</h1>
        
        <div className="w-full max-w-xs bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[100px] relative overflow-hidden">
          
          <div className="grid grid-cols-6 gap-x-3 gap-y-3 mb-1 w-full px-1">
            {[...Array(12)].map((_, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-full aspect-[2/3] border-b-2 flex items-center justify-center text-lg font-bold ${
                  code[i] ? 'border-blue-500 text-white' : 'border-neutral-700 text-neutral-700'
                }`}
              >
                {code[i] || ''}
              </motion.div>
            ))}
          </div>
          
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="mt-2 flex flex-col items-center"
              >
                <div className="text-blue-400 text-[8px] uppercase tracking-widest mb-0.5">Password Generated</div>
                <div className="text-3xl font-black tracking-tighter text-white">{result}</div>
              </motion.div>
            ) : (
              <div className="mt-2 text-neutral-600 text-[8px] uppercase tracking-widest">
                {code.length}/12 Digits
              </div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center text-red-400 text-[10px] bg-red-400/10 px-2 py-1 rounded-full border border-red-400/20"
          >
            <AlertCircle className="w-2.5 h-2.5 mr-1" />
            {error}
          </motion.div>
        )}
      </div>

      {/* Pinpad */}
      <div className="flex-1 flex flex-col justify-center p-4 min-h-0">
        <div className="grid grid-cols-3 grid-rows-4 gap-3 max-w-sm mx-auto w-full flex-1 max-h-[400px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onPointerDown={() => handleNumberClick(n.toString())}
              className="rounded-xl bg-neutral-900 border border-neutral-800 text-2xl font-medium active:bg-neutral-700 active:scale-95 flex items-center justify-center select-none touch-none"
            >
              {n}
            </button>
          ))}
          <button
            onPointerDown={handleClear}
            className="rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-500 text-[10px] font-bold active:bg-neutral-700 active:scale-95 flex items-center justify-center uppercase tracking-widest select-none touch-none"
          >
            Clear
          </button>
          <button
            onPointerDown={() => handleNumberClick('0')}
            className="rounded-xl bg-neutral-900 border border-neutral-800 text-2xl font-medium active:bg-neutral-700 active:scale-95 flex items-center justify-center select-none touch-none"
          >
            0
          </button>
          <button
            onPointerDown={handleBackspace}
            className="rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-500 active:bg-neutral-700 active:scale-95 flex items-center justify-center select-none touch-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Controls */}
        <div className="mt-4 max-w-sm mx-auto w-full shrink-0">
          <button
            onPointerDown={toggleListening}
            className={`w-full h-12 rounded-xl flex items-center justify-center space-x-2 transition-all select-none touch-none ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-blue-600/10 border border-blue-500/30 text-blue-400 active:bg-blue-600/20'
            }`}
          >
            {isListening ? (
              <>
                <div className="flex space-x-1">
                  <div className="w-0.5 h-2.5 bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-0.5 h-3.5 bg-white animate-bounce" style={{ animationDelay: '100ms' }} />
                  <div className="w-0.5 h-2.5 bg-white animate-bounce" style={{ animationDelay: '200ms' }} />
                </div>
                <span className="font-bold text-[10px] uppercase tracking-wider">Listening...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span className="font-bold text-[10px] uppercase tracking-wider">Listen for Code</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
