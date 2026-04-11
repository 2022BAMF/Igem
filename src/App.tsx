import React, { useState, useRef, useEffect } from 'react';
import { 
  Delete, 
  Mic, 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSecondPassword } from './lib/algo';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [code, setCode] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleNumberClick = (num: string) => {
    if (code.length < 12) {
      setCode(prev => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setCode(prev => prev.slice(0, -1));
    setResult(null);
    setError(null);
  };

  const handleClear = () => {
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

  // AI Listen Mode
  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    setIsListening(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsListening(false);
        setIsAnalyzing(true);

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [
                {
                  inlineData: {
                    mimeType: "audio/webm",
                    data: base64Audio
                  }
                },
                {
                  text: "Listen to the audio and extract exactly 12 digits. Return ONLY the 12 digits, no spaces or other text. If you can't hear 12 digits, return 'ERROR'."
                }
              ]
            });

            const text = response.text?.trim() || '';
            if (/^\d{12}$/.test(text)) {
              setCode(text);
            } else {
              setError("Could not clearly identify 12 digits. Please try again.");
            }
          } catch (err) {
            setError("AI processing failed. Please try manual entry.");
          } finally {
            setIsAnalyzing(false);
          }
        };
      };

      mediaRecorder.start();
    } catch (err) {
      setError("Microphone access denied.");
      setIsListening(false);
    }
  };

  // AI Photo Mode
  const startCamera = async () => {
    setShowCamera(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied.");
      setShowCamera(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
      
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
      
      setIsAnalyzing(true);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: "Find the 12-digit code in this image. Return ONLY the 12 digits. If not found, return 'ERROR'."
            }
          ]
        });

        const text = response.text?.trim() || '';
        if (/^\d{12}$/.test(text)) {
          setCode(text);
        } else {
          setError("Could not find a 12-digit code in the photo.");
        }
      } catch (err) {
        setError("AI image analysis failed.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col overflow-hidden select-none">
      {/* Header / Display */}
      <div className="p-6 pt-12 flex flex-col items-center justify-center space-y-4">
        <h1 className="text-neutral-500 text-xs font-mono uppercase tracking-[0.2em]">Service Key Generator</h1>
        
        <div className="w-full max-w-xs bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[120px] relative overflow-hidden">
          {isAnalyzing && (
            <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-3 text-sm font-medium">AI Analyzing...</span>
            </div>
          )}
          
          <div className="grid grid-cols-6 gap-x-4 gap-y-4 mb-2 w-full px-2">
            {[...Array(12)].map((_, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-4 h-6 border-b-2 flex items-center justify-center text-xl font-bold ${
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
                className="mt-4 flex flex-col items-center"
              >
                <div className="text-blue-400 text-[10px] uppercase tracking-widest mb-1">Password Generated</div>
                <div className="text-4xl font-black tracking-tighter text-white">{result}</div>
              </motion.div>
            ) : (
              <div className="mt-4 text-neutral-600 text-[10px] uppercase tracking-widest">
                {code.length}/12 Digits
              </div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center text-red-400 text-xs bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20"
          >
            <AlertCircle className="w-3 h-3 mr-1.5" />
            {error}
          </motion.div>
        )}
      </div>

      {/* Pinpad */}
      <div className="flex-1 flex flex-col justify-end p-6 pb-12">
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleNumberClick(n.toString())}
              className="h-20 rounded-2xl bg-neutral-900 border border-neutral-800 text-3xl font-medium active:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center"
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-20 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-neutral-500 text-sm font-bold active:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center uppercase tracking-widest"
          >
            Clear
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="h-20 rounded-2xl bg-neutral-900 border border-neutral-800 text-3xl font-medium active:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-20 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-neutral-500 active:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* AI Controls */}
        <div className="grid grid-cols-2 gap-4 mt-8 max-w-sm mx-auto w-full">
          <button
            onClick={toggleListening}
            disabled={isAnalyzing}
            className={`h-14 rounded-2xl flex items-center justify-center space-x-3 transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-blue-600/10 border border-blue-500/30 text-blue-400 active:bg-blue-600/20'
            }`}
          >
            {isListening ? (
              <>
                <div className="flex space-x-1">
                  <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-4 bg-white animate-bounce" style={{ animationDelay: '100ms' }} />
                  <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '200ms' }} />
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span className="font-bold text-sm uppercase tracking-wider">Listen</span>
              </>
            )}
          </button>

          <button
            onClick={startCamera}
            disabled={isAnalyzing}
            className="h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 active:bg-blue-600/20 flex items-center justify-center space-x-3 transition-all"
          >
            <Camera className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-wider">Scan</span>
          </button>
        </div>
      </div>

      {/* Camera Overlay */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <div className="relative flex-1 bg-black flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none">
                <div className="w-full h-full border-2 border-blue-500/50 rounded-lg relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500/30 animate-pulse" />
                </div>
              </div>
              
              <button 
                onClick={() => {
                  const stream = videoRef.current?.srcObject as MediaStream;
                  stream?.getTracks().forEach(t => t.stop());
                  setShowCamera(false);
                }}
                className="absolute top-12 right-6 p-2 bg-black/50 rounded-full text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="h-32 bg-neutral-950 flex items-center justify-center px-6">
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
