import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mic, X, Volume2, VolumeX, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAudioCoordinator } from '@/hooks/useAudioCoordinator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OfficeHoursAssistantProps {
  appointments: any[];
}

export const OfficeHoursAssistant: React.FC<OfficeHoursAssistantProps> = ({ appointments }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('cgSgspJ2msm6clMCkdW9');
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const continuousListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);

  const { requestPlayback, registerPauseCallback, unregisterPauseCallback } = useAudioCoordinator();

  useEffect(() => {
    const pauseAria = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsSpeaking(false);
      }
    };
    registerPauseCallback('aria', pauseAria);
    return () => unregisterPauseCallback('aria');
  }, [registerPauseCallback, unregisterPauseCallback]);

  const voiceOptions = [
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', desc: 'Young, natural female' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Soft, warm female' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', desc: 'Clear, confident female' },
    { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', desc: 'Warm, friendly female' },
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Gentle, soothing female' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Deep, authoritative male' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Warm British male' },
    { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', desc: 'Professional male' },
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', desc: 'Classic, mature male' },
    { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', desc: 'Friendly, conversational male' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('aria-voice-id');
    if (saved) setSelectedVoiceId(saved);
  }, []);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  // ── Speech Recognition ──
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    continuousListeningRef.current = true;
    shouldRestartRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      errorCountRef.current = 0;
    };
    recognition.onend = () => {
      setIsListening(false);
      if (continuousListeningRef.current && shouldRestartRef.current) {
        const delay = Math.min(100 + errorCountRef.current * 500, 3000);
        setTimeout(() => {
          if (continuousListeningRef.current) {
            try {
              recognition._finalTranscript = '';
              setTranscript('');
              recognition.start();
            } catch (e) {
              setTimeout(() => {
                if (continuousListeningRef.current) startListening();
              }, 1000);
            }
          }
        }, delay);
      }
    };
    recognition.onerror = (e: any) => {
      const now = Date.now();
      if (now - lastErrorTimeRef.current > 5000) errorCountRef.current = 0;
      lastErrorTimeRef.current = now;
      errorCountRef.current++;

      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied');
        continuousListeningRef.current = false;
        shouldRestartRef.current = false;
        setIsListening(false);
      } else if (e.error === 'aborted' || e.error === 'no-speech') {
        // Normal
      } else {
        if (errorCountRef.current >= 5) {
          continuousListeningRef.current = false;
          shouldRestartRef.current = false;
          setIsListening(false);
          toast.error('Microphone disconnected. Tap mic to retry.');
        }
      }
    };

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    recognition.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        recognition._finalTranscript = (recognition._finalTranscript || '') + final;
        setTranscript(recognition._finalTranscript);
      } else {
        setTranscript((recognition._finalTranscript || '') + interim);
      }

      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (recognition._finalTranscript?.trim()) {
          const textToSend = recognition._finalTranscript.trim();
          recognition._finalTranscript = '';
          setTranscript('');
          shouldRestartRef.current = false;
          recognition.stop();
          handleSend(textToSend);
        }
      }, 1500);
    };

    recognition._finalTranscript = '';
    recognitionRef.current = recognition;
    setTranscript('');
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    continuousListeningRef.current = false;
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  // ── Send to AI ──
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setTranscript('');
    const userMsg: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsThinking(true);

    try {
      const { data, error } = await supabase.functions.invoke('office-hours-assistant', {
        body: {
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          appointments,
          currentDate: new Date().toISOString(),
          userId,
        }
      });

      if (error) throw new Error(error.message);
      const reply = data?.reply || "I couldn't process that.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (!isMuted) {
        await speakText(reply);
      } else {
        if (continuousListeningRef.current) {
          shouldRestartRef.current = true;
          startListening();
        }
      }
    } catch (err: any) {
      console.error('Assistant error:', err);
      toast.error('Assistant error: ' + (err.message || 'Unknown'));
    } finally {
      setIsThinking(false);
    }
  };

  // ── ElevenLabs TTS ──
  const speakText = async (text: string) => {
    setIsSpeaking(true);
    requestPlayback('aria');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId: selectedVoiceId }),
        }
      );

      if (!response.ok) throw new Error('TTS failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (continuousListeningRef.current) {
          shouldRestartRef.current = true;
          startListening();
        }
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (continuousListeningRef.current) {
          shouldRestartRef.current = true;
          startListening();
        }
      };
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem('aria-voice-id', voiceId);
    setShowVoicePicker(false);
    toast.success('Voice updated');
  };

  // ── Orb Button (collapsed) ──
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100001] group"
        aria-label="Open Aria Assistant"
      >
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-1 rounded-full bg-cyan-400/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-lg shadow-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-110">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
        </div>
      </button>
    );
  }

  // ── Voice-only orb overlay ──
  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { stopListening(); setIsOpen(false); }} />

      <div className="relative flex flex-col items-center gap-6 z-10">
        <button
          onClick={() => { stopListening(); setIsOpen(false); }}
          className="absolute -top-14 right-0 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Main orb */}
        <button
          onClick={isListening || continuousListeningRef.current ? stopListening : startListening}
          disabled={isThinking}
          className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all focus:outline-none"
        >
          {isListening && (
            <>
              <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-3 rounded-full bg-green-400/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
              <div className="absolute -inset-6 rounded-full bg-green-400/5 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.6s' }} />
            </>
          )}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute -inset-3 rounded-full bg-cyan-400/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
            </>
          )}
          {isThinking && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 border-t-transparent animate-spin" />
          )}
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl",
            isListening
              ? "bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-500/50"
              : isSpeaking
                ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/50 scale-105"
                : isThinking
                  ? "bg-gradient-to-br from-cyan-400/60 to-blue-600/60 shadow-cyan-500/20"
                  : "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/40 hover:scale-105"
          )}>
            {isThinking ? (
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            ) : (
              <Mic className={cn("h-10 w-10 text-white", isSpeaking && "animate-pulse")} />
            )}
          </div>
        </button>

        <p className="text-white/50 text-xs font-medium tracking-wide">
          {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isThinking ? 'Thinking...' : 'Tap to talk'}
        </p>

        {transcript && (
          <p className="text-white/40 text-sm italic max-w-xs text-center truncate">{transcript}</p>
        )}

        <div className="flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {isSpeaking && (
            <button onClick={stopSpeaking} className="p-2 rounded-full text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <VolumeX className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setShowVoicePicker(!showVoicePicker)} className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors text-[10px]">
            🎙
          </button>
        </div>

        {showVoicePicker && (
          <div className="absolute -bottom-48 bg-black/90 border border-white/10 rounded-xl p-2 max-h-40 overflow-y-auto w-64 backdrop-blur-lg">
            <div className="grid grid-cols-2 gap-1">
              {voiceOptions.map(voice => (
                <button
                  key={voice.id}
                  onClick={() => handleVoiceSelect(voice.id)}
                  className={cn(
                    "text-left p-1.5 rounded-lg text-[10px] transition-colors",
                    selectedVoiceId === voice.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-white/60 hover:bg-white/10 hover:text-white border border-transparent"
                  )}
                >
                  <div className="font-medium">{voice.name}</div>
                  <div className="text-white/30 text-[9px]">{voice.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
