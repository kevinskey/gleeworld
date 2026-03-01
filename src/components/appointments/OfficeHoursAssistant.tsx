import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, X, Volume2, VolumeX, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [lastReply, setLastReply] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('cgSgspJ2msm6clMCkdW9'); // Jessica default
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const continuousListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);

  // Predefined ElevenLabs voices to pick from
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

  // Load saved voice preference
  useEffect(() => {
    const saved = localStorage.getItem('aria-voice-id');
    if (saved) setSelectedVoiceId(saved);
  }, []);

  // Fetch custom voices from ElevenLabs account
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('elevenlabs-voice-info', {
          body: { voiceIds: voiceOptions.map(v => v.id) }
        });
        if (data?.voices) {
          setAvailableVoices(data.voices);
        }
      } catch (err) {
        console.log('Could not fetch voice info, using defaults');
      }
    };
    if (isOpen) fetchVoices();
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, lastReply]);

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

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if continuous mode is still on (like ChatGPT voice)
      if (continuousListeningRef.current && shouldRestartRef.current) {
        setTimeout(() => {
          if (continuousListeningRef.current) {
            try {
              recognition._finalTranscript = '';
              setTranscript('');
              recognition.start();
            } catch (e) {
              console.log('Recognition restart failed, retrying...', e);
              // If start fails, create a new instance
              setTimeout(() => {
                if (continuousListeningRef.current) startListening();
              }, 300);
            }
          }
        }, 100);
      }
    };
    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e);
      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied');
        continuousListeningRef.current = false;
        setIsListening(false);
      } else if (e.error === 'aborted' || e.error === 'no-speech') {
        // These are normal — recognition will auto-restart via onend
      } else {
        setIsListening(false);
      }
    };

    // Silence timeout: auto-send after user stops talking
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    recognition.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) {
        recognition._finalTranscript = (recognition._finalTranscript || '') + final;
        setTranscript(recognition._finalTranscript);

        // Reset silence timer — send after 1.5s of silence
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (recognition._finalTranscript?.trim()) {
            const textToSend = recognition._finalTranscript.trim();
            recognition._finalTranscript = '';
            setTranscript('');
            // Pause listening while processing, will resume after TTS
            shouldRestartRef.current = false;
            recognition.stop();
            handleSend(textToSend);
          }
        }, 1500);
      } else {
        setTranscript((recognition._finalTranscript || '') + interim);
        // Reset silence timer on interim results too
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
      }
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
        }
      });

      if (error) throw new Error(error.message);
      const reply = data?.reply || "I'm sorry, I couldn't process that.";
      const assistantMsg: Message = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      setLastReply(reply);

      // Speak the reply
      if (!isMuted) {
        await speakText(reply);
      } else {
        // If muted, restart listening immediately
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
        // Auto-restart listening after speaking (ChatGPT voice mode behavior)
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

  const selectedVoiceName = voiceOptions.find(v => v.id === selectedVoiceId)?.name || 'Custom';

  // ── Orb Button (collapsed) ──
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100001] group"
        aria-label="Open Aria Assistant"
      >
        <div className="relative w-16 h-16">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-1 rounded-full bg-cyan-400/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          {/* Core orb */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-lg shadow-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-110">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
        </div>
      </button>
    );
  }

  // ── Full Overlay ──
  return (
    <div className="fixed inset-0 z-[100001] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      {/* Assistant Panel */}
      <div className="relative w-full max-w-md mx-2 mb-2 sm:mb-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10"
        style={{ background: 'linear-gradient(180deg, rgba(0,30,60,0.95) 0%, rgba(0,15,40,0.98) 100%)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Aria</h3>
              <p className="text-white/40 text-[10px]">Office Hours Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowVoicePicker(!showVoicePicker)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 text-[10px] transition-colors"
              title="Change voice"
            >
              🎙 {selectedVoiceName}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Voice Picker */}
        {showVoicePicker && (
          <div className="border-b border-white/10 bg-white/5 p-2 max-h-40 overflow-y-auto">
            <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1.5 px-1">Select Aria's Voice</p>
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

        {/* Messages */}
        <div className="h-64 overflow-y-auto p-3 space-y-2.5">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 flex items-center justify-center mb-3">
                <Sparkles className="h-7 w-7 text-cyan-400/60" />
              </div>
              <p className="text-white/40 text-xs">Tap the mic and ask me anything</p>
              <p className="text-white/25 text-[10px] mt-1">Schedule, reminders, analysis, tasks...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                msg.role === 'user'
                  ? "bg-cyan-600/30 text-white/90 border border-cyan-500/20"
                  : "bg-white/8 text-white/80 border border-white/10"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-white/8 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                <span className="text-white/40 text-xs">Aria is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Live transcript */}
        {transcript && (
          <div className="px-3 pb-1">
            <div className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/50 text-[11px] italic">
              {transcript}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-center gap-4">
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-2.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
            >
              <VolumeX className="h-5 w-5" />
            </button>
          )}

          <button
            onClick={isListening || continuousListeningRef.current ? stopListening : startListening}
            disabled={isThinking || isSpeaking}
            className={cn(
              "relative p-4 rounded-full transition-all",
              isListening
                ? "bg-green-500 text-white shadow-lg shadow-green-500/40"
                : (isThinking || isSpeaking)
                  ? "bg-white/10 text-white/30 cursor-not-allowed"
                  : "bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
            )}
          >
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute -inset-1 rounded-full bg-green-400/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
              </>
            )}
            {isListening ? <Mic className="h-6 w-6 relative z-10" /> : <Mic className="h-6 w-6" />}
          </button>
        </div>

        {/* Status */}
        <div className="text-center pb-2">
          <span className="text-white/25 text-[9px]">
            {isListening ? '🟢 Listening — speak naturally' : isSpeaking ? '🔊 Aria is speaking...' : isThinking ? '💭 Thinking...' : 'Tap mic to start conversation'}
          </span>
        </div>
      </div>
    </div>
  );
};
