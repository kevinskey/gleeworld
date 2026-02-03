import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAssistant } from '@/contexts/AssistantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRadioPlayer } from '@/hooks/useRadioPlayer';
import { useRadioChannels } from '@/hooks/useRadioChannels';
import { AttendanceFullScreenModal } from '@/components/course/AttendanceFullScreenModal';
import QRCode from 'qrcode';
import { 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Loader2,
  User,
  ExternalLink,
  Music,
  Radio,
  Volume2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import gleeAssistantAvatar from '@/assets/glee-assistant-avatar.png';
import { requestMicrophonePermission } from '@/utils/microphonePermission';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: AssistantAction[];
}

interface AssistantAction {
  action: string;
  route?: string;
  score_id?: string;
  title?: string;
  url?: string;
  recipients?: any[];
  command?: string; // for radio control
  playlist_id?: number; // for playlist request
  playlist_name?: string;
  // New action types for enrollment management
  poll_id?: string;
  draft_id?: string;
  recipient?: string;
  message?: string;
  // Attendance QR action fields
  course_code?: string;
  course_title?: string;
  session_id?: string;
  session_title?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  qr_token?: string;
  expires_at?: string;
  enrolled_count?: number;
  checked_in_count?: number;
  // Calendar event creation fields
  event_id?: string;
  event_title?: string;
  event_date?: string;
  is_public?: boolean;
  is_recurring?: boolean;
  has_image?: boolean;
  attendance_required?: boolean;
}

export const GleeAssistant = () => {
  // Use shared context for assistant state
  const { 
    isWakeWordActive, 
    isAssistantOpen: isOpen, 
    wakeWordStatus,
    setIsWakeWordActive,
    setIsAssistantOpen: setIsOpen,
    setWakeWordStatus 
  } = useAssistant();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Refs to track current state for use in callbacks (avoids stale closures)
  const isWakeWordActiveRef = useRef(isWakeWordActive);
  const isOpenRef = useRef(isOpen);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlaying: isRadioPlaying, play: playRadio, pause: pauseRadio, togglePlayPause: toggleRadio, setVolume, volume } = useRadioPlayer();
  const { channels } = useRadioChannels();

  // Hide assistant on printable syllabi page
  const hiddenPaths = ['/academy/printable-syllabi'];
  const isHidden = hiddenPaths.some(path => location.pathname.startsWith(path));

  if (isHidden) {
    return null;
  }

  // Attendance QR modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceQrDataUrl, setAttendanceQrDataUrl] = useState<string | null>(null);
  const [attendanceSessionData, setAttendanceSessionData] = useState<{
    sessionTitle: string;
    sessionDate: Date;
    startTime?: string;
    endTime?: string;
    location?: string;
    enrolledCount: number;
    checkedInCount: number;
  } | null>(null);

  // ElevenLabs voice options (female only to match assistant avatar)
  const voiceOptions = [
    // Black female voices (prioritized per community identity)
    { id: '9wYX8b0wRvLUEYtGuzP5', name: 'KeKe', description: 'Black woman, sassy' },
    { id: 'OOk3INdXVLRmSaQoAX9D', name: 'Alicia Speaks', description: 'Black woman, calm' },
    // Standard female voices
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Young female' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft female' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Warm female' },
  ];
  const [selectedVoice, setSelectedVoice] = useState('9wYX8b0wRvLUEYtGuzP5'); // Default to KeKe

  // ElevenLabs TTS function - uses fetch for binary audio data
  const speakWithElevenLabs = async (text: string) => {
    try {
      // Import and call forceUnlockAudio to ensure audio works on iOS/PWA
      const { forceUnlockAudio } = await import('@/utils/mobileAudioUnlock');
      forceUnlockAudio();
      
      console.log('Speaking with ElevenLabs:', text.substring(0, 50) + '...');
      
      // Use fetch instead of supabase.functions.invoke for binary audio
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId: selectedVoice }),
        }
      );

      if (!response.ok) {
        console.error('ElevenLabs TTS error:', response.status);
        // Fallback to browser TTS
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1;
          utterance.pitch = 1;
          window.speechSynthesis.speak(utterance);
        }
        return;
      }

      // Get audio as blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // For iOS/PWA: set properties before play
      audio.preload = 'auto';
      audio.volume = 1.0;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      // Try to play with error handling
      try {
        await audio.play();
      } catch (playError) {
        console.warn('Audio play failed, will retry on next interaction:', playError);
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Keep refs in sync with state
  useEffect(() => {
    isWakeWordActiveRef.current = isWakeWordActive;
  }, [isWakeWordActive]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Initialize wake word detection (always listening for "Hey Glee")
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      
      // Wake word recognition (continuous)
      wakeWordRecognitionRef.current = new SpeechRecognition();
      wakeWordRecognitionRef.current.continuous = true;
      wakeWordRecognitionRef.current.interimResults = true;
      wakeWordRecognitionRef.current.lang = 'en-US';

      wakeWordRecognitionRef.current.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.toLowerCase().trim();
        
        console.log('Wake word listener heard:', transcript);
        
        // Check for wake word
        if (transcript.includes('hey glee') || transcript.includes('hey glea') || transcript.includes('a glee')) {
          console.log('Wake word detected!');
          setWakeWordStatus('activated');
          
          // Stop wake word listening temporarily
          wakeWordRecognitionRef.current.stop();
          
          // Open assistant and start command listening
          setIsOpen(true);
          
          // Extract command after wake word if present
          const wakeWordIndex = transcript.indexOf('hey glee') !== -1 
            ? transcript.indexOf('hey glee') + 8 
            : transcript.indexOf('hey glea') !== -1
            ? transcript.indexOf('hey glea') + 8
            : transcript.indexOf('a glee') + 6;
          const command = transcript.substring(wakeWordIndex).trim();
          
          if (command && command.length > 2) {
            // User said command after wake word
            handleSend(command);
          } else {
            // Start listening for command
            setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.start();
                setIsListening(true);
              }
            }, 300);
          }
        }
      };

      wakeWordRecognitionRef.current.onerror = (event: any) => {
        console.log('Wake word recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          // Restart wake word listening after error
          setTimeout(() => {
            if (isWakeWordActiveRef.current && wakeWordRecognitionRef.current) {
              try {
                wakeWordRecognitionRef.current.start();
                setWakeWordStatus('listening');
              } catch (e) {
                console.log('Could not restart wake word recognition');
              }
            }
          }, 1000);
        }
      };

      wakeWordRecognitionRef.current.onend = () => {
        console.log('Wake word recognition ended, isWakeWordActive:', isWakeWordActiveRef.current, 'isOpen:', isOpenRef.current);
        // Restart if wake word mode is still active and assistant is closed
        if (isWakeWordActiveRef.current && !isOpenRef.current) {
          setTimeout(() => {
            if (wakeWordRecognitionRef.current && isWakeWordActiveRef.current) {
              try {
                wakeWordRecognitionRef.current.start();
                setWakeWordStatus('listening');
                console.log('Wake word listening restarted');
              } catch (e) {
                console.log('Could not restart wake word recognition:', e);
              }
            }
          }, 500);
        }
      };

      // Command recognition (for after wake word)
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast({
            title: "Voice Error",
            description: "Could not understand. Please try again.",
            variant: "destructive",
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Manage wake word listening state
  useEffect(() => {
    if (isWakeWordActive && !isOpen && wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.start();
        setWakeWordStatus('listening');
        console.log('Wake word listening started');
      } catch (e) {
        console.log('Wake word already listening or error');
      }
    } else if (!isWakeWordActive && wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.stop();
        setWakeWordStatus('inactive');
      } catch (e) {}
    }
  }, [isWakeWordActive, isOpen]);

  // Resume wake word listening when assistant closes
  useEffect(() => {
    if (!isOpen && isWakeWordActive && wakeWordRecognitionRef.current) {
      setTimeout(() => {
        try {
          wakeWordRecognitionRef.current.start();
          setWakeWordStatus('listening');
        } catch (e) {
          console.log('Could not resume wake word listening');
        }
      }, 500);
    }
  }, [isOpen, isWakeWordActive]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages]);

  // Track if greeting has been spoken (only speak after user interaction)
  const greetingSpokenRef = useRef(false);
  
  // Greet user when assistant opens (text only - audio deferred until interaction)
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add greeting message (text only for now)
      const greetingMessage: Message = { 
        role: 'assistant', 
        content: 'How can I help you?' 
      };
      setMessages([greetingMessage]);
      greetingSpokenRef.current = false;
    }
  }, [isOpen]);
  
  // Speak greeting on first user interaction (required for iOS/PWA audio unlock)
  const handleAssistantInteraction = useCallback(() => {
    if (!greetingSpokenRef.current && messages.length === 1 && messages[0]?.role === 'assistant') {
      greetingSpokenRef.current = true;
      speakWithElevenLabs('How can I help you?');
    }
  }, [messages, selectedVoice]);

  const toggleWakeWord = async () => {
    if (!wakeWordRecognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    if (isWakeWordActive) {
      setIsWakeWordActive(false);
      toast({
        title: "Hey Glee Disabled",
        description: "Wake word detection turned off.",
      });
    } else {
      try {
        const perm = await requestMicrophonePermission();
        if (!perm.ok) {
          throw perm;
        }
        setIsWakeWordActive(true);
        toast({
          title: "Hey Glee Enabled",
          description: "Say \"Hey Glee\" to activate the assistant.",
        });
      } catch (e: any) {
        const denied = e?.reason === 'denied' || e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
        toast({
          title: "Microphone Required",
          description: denied
            ? "Please allow microphone access in your browser settings, then try again."
            : "Could not access the microphone. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      setIsListening(false);
    } else {
      try {
        const perm = await requestMicrophonePermission();
        if (!perm.ok) {
          throw perm;
        }
      } catch (e: any) {
        console.error('Microphone permission failed:', e);
        toast({
          title: "Microphone Access Required",
          description: e?.reason === 'not-supported'
            ? 'Microphone access is not supported in this browser.'
            : 'Please allow microphone access to use voice input.',
          variant: "destructive",
        });
        return;
      }

      // Stop wake word temporarily while manual listening
      if (wakeWordRecognitionRef.current && isWakeWordActive) {
        try {
          wakeWordRecognitionRef.current.stop();
        } catch (e) {}
      }

      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Speech recognition started');
      } catch (e: any) {
        console.error('Error starting speech recognition:', e);
        // Handle "already started" error
        if (e.message?.includes('already started') || e.name === 'InvalidStateError') {
          // Already running, try to restart
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
                setIsListening(true);
              } catch (e2) {
                console.error('Failed to restart recognition:', e2);
              }
            }, 100);
          } catch (stopError) {
            console.error('Error stopping recognition:', stopError);
          }
        } else {
          toast({
            title: "Voice Error",
            description: `Could not start voice input (${e?.name || 'error'}). Please try again.`,
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('glee-assistant', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          userId: user?.id,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        actions: data.actions || [],
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-execute actions and close assistant
      if (data.actions?.length > 0) {
        for (const action of data.actions) {
          if (action.action === 'navigate' && action.route) {
            // Auto-navigate and close
            setTimeout(() => {
              navigate(action.route);
              setIsOpen(false);
            }, 500);
            break;
          } else if (action.action === 'open_score' && action.score_id) {
            setTimeout(() => {
              navigate(`/music-library?view=${action.score_id}`);
              setIsOpen(false);
            }, 500);
            break;
          } else if (action.action === 'control_radio') {
            // Execute radio command
            setTimeout(() => {
              if (action.command === 'play') {
                playRadio();
              } else if (action.command === 'pause') {
                pauseRadio();
              } else if (action.command === 'toggle') {
                toggleRadio();
              } else if (action.command === 'volume_up') {
                setVolume(Math.min(1, volume + 0.2));
              } else if (action.command === 'volume_down') {
                setVolume(Math.max(0, volume - 0.2));
              } else if (action.command === 'mute') {
                setVolume(0);
              } else if (action.command === 'unmute') {
                setVolume(0.7);
              }
              setIsOpen(false);
            }, 500);
            break;
          } else if (action.action === 'request_playlist') {
            // Request a song from the specified playlist (simplified - just show channel name)
            setTimeout(async () => {
              if (action.playlist_name) {
                const channel = channels.find(c => 
                  c.name.toLowerCase().includes((action.playlist_name || '').toLowerCase())
                );
                if (channel) {
                  toast({
                    title: 'Channel Found',
                    description: `Found channel: ${channel.name}`,
                  });
                } else {
                  toast({
                    title: 'Channel Not Found',
                    description: `Could not find channel: ${action.playlist_name}`,
                    variant: 'destructive',
                  });
                }
              }
              setIsOpen(false);
            }, 500);
            break;
          } else if (action.action === 'get_radio_playlists') {
            // Client-side fallback - the server should have returned the list
            // but if it didn't, we can provide it from our local channels
            // This action doesn't need to close the assistant
            break;
          } else if (action.action === 'get_now_playing') {
            // Client-side fallback - server should have returned this info
            break;
          } else if (action.action === 'open_attendance_qr') {
            // Open attendance QR modal
            setTimeout(() => {
              openAttendanceQR(action);
            }, 500);
            break;
          } else if (action.action === 'event_created') {
            // Show success toast for event creation
            toast({
              title: "Event Created",
              description: action.message || `Created "${action.event_title}" for ${action.event_date}`,
            });
            // Navigate to calendar to see the event
            setTimeout(() => {
              navigate('/calendar');
              setIsOpen(false);
            }, 1000);
            break;
          }
        }
      }

      // Speak the response using ElevenLabs TTS
      if (data.message) {
        speakWithElevenLabs(data.message);
      }

    } catch (error: any) {
      console.error('Assistant error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: AssistantAction) => {
    if (action.action === 'navigate' && action.route) {
      navigate(action.route);
      setIsOpen(false);
    } else if (action.action === 'open_score' && action.score_id) {
      navigate(`/music-library?view=${action.score_id}`);
      setIsOpen(false);
    } else if (action.action === 'prepare_email') {
      navigate('/compose?type=email');
      setIsOpen(false);
    } else if (action.action === 'prepare_sms') {
      navigate('/compose?type=sms');
      setIsOpen(false);
    } else if (action.action === 'email_sent') {
      toast({
        title: "Email Sent",
        description: action.message || `Report sent to ${action.recipient}`,
      });
    } else if (action.action === 'poll_created') {
      toast({
        title: "Poll Created",
        description: action.message || "Your poll has been created successfully!",
      });
      setIsOpen(false);
    } else if (action.action === 'test_generated') {
      toast({
        title: "Test Generated",
        description: action.message || "Your test has been drafted and is ready for review.",
      });
    } else if (action.action === 'show_schedule_report') {
      toast({
        title: "Schedule Report Generated",
        description: action.message || "Schedule status report is ready.",
      });
    } else if (action.action === 'open_attendance_qr') {
      // Generate QR code and open fullscreen modal
      openAttendanceQR(action);
    } else if (action.action === 'event_created') {
      toast({
        title: "Event Created",
        description: action.message || `Created "${action.event_title}"`,
      });
      navigate('/calendar');
      setIsOpen(false);
    }
  };

  const openAttendanceQR = async (action: AssistantAction) => {
    if (!action.qr_token) {
      toast({
        title: "Error",
        description: "No QR token available for attendance.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate QR code URL
      const baseUrl = window.location.hostname.includes('lovable') 
        ? 'https://gleeworld.lovable.app' 
        : window.location.origin;
      const checkInUrl = `${baseUrl}/qr-scanner?token=${encodeURIComponent(action.qr_token)}`;
      
      const dataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 500,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });

      setAttendanceQrDataUrl(dataUrl);
      setAttendanceSessionData({
        sessionTitle: action.session_title || action.course_title || 'Class Session',
        sessionDate: new Date(action.session_date || new Date()),
        startTime: action.start_time?.slice(0, 5), // HH:MM
        endTime: action.end_time?.slice(0, 5),
        location: action.location,
        enrolledCount: action.enrolled_count || 0,
        checkedInCount: action.checked_in_count || 0,
      });
      setAttendanceModalOpen(true);
      setIsOpen(false); // Close assistant to show fullscreen
    } catch (error) {
      console.error('Error generating attendance QR:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code.",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Wake Word Status Indicator */}
      {isWakeWordActive && !isOpen && (
        <div 
          className="fixed bottom-[100px] right-6 bg-card/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-border flex items-center gap-2 text-xs"
          style={{ zIndex: 9999 }}
        >
          <span className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            wakeWordStatus === 'listening' ? "bg-green-500" : "bg-yellow-500"
          )} />
          <span className="text-muted-foreground">
            {wakeWordStatus === 'listening' ? 'Listening for "Hey Glee"' : 'Activating...'}
          </span>
        </div>
      )}

      {/* Floating Assistant Button - visible on all screen sizes */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex fixed bottom-16 sm:bottom-6 right-4 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white border-2 border-[#C4A962] shadow-xl hover:scale-105 transition-transform overflow-hidden z-[100000] items-center justify-center"
          aria-label="Open Glee Assistant"
        >
          <img 
            src={gleeAssistantAvatar} 
            alt="Glee Assistant" 
            className="w-full h-full object-cover"
          />
          {/* Pulse indicator */}
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />
        </button>
      )}

      {/* Speech Bubble Chat */}
      {isOpen && (
        <div 
          className="fixed bottom-20 sm:bottom-28 right-4 sm:right-6 w-[calc(100%-2rem)] sm:w-[400px] max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{ zIndex: 100001 }}
          onClick={handleAssistantInteraction}
          onTouchStart={handleAssistantInteraction}
        >
          {/* Bubble container */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-[#C4A962]/30 overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10"
              aria-label="Close assistant"
            >
              <X className="h-3 w-3 text-slate-500" />
            </button>

            {/* Messages area */}
            <ScrollArea viewportRef={scrollViewportRef} className="max-h-[50vh] sm:max-h-[400px] p-4 pr-8">
              {messages.length === 0 ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-8 w-8 rounded-full object-cover" />
                    <span className="font-semibold text-slate-900 dark:text-white">Glee Assistant</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      {msg.role === 'assistant' && (
                        <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0">
                          <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className={cn(
                        "rounded-2xl px-3 py-2 max-w-[85%] text-sm",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        
                        {/* Action buttons */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.actions.map((action, actionIdx) => (
                              <Button
                                key={actionIdx}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAction(action)}
                                className="w-full text-xs h-auto py-1.5 px-2 whitespace-normal text-left justify-start"
                              >
                                {action.action === 'open_score' && <Music className="h-3 w-3 mr-1.5 flex-shrink-0" />}
                                {action.action === 'navigate' && <ExternalLink className="h-3 w-3 mr-1.5 flex-shrink-0" />}
                                <span className="break-words">{action.title || action.route?.replace('/', '') || 'Go'}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full overflow-hidden">
                        <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-full w-full object-cover" />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Compact input area */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex gap-2 items-center">
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleListening}
                  className={`h-8 w-8 flex-shrink-0 rounded-full ${
                    !isListening ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600' : ''
                  }`}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening..." : "Ask me anything..."}
                  className="flex-1 h-8 text-sm rounded-full border-slate-200 dark:border-slate-600"
                  disabled={isLoading || isListening}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {/* Voice selector (collapsed) */}
              <div className="mt-2 flex items-center gap-2">
                <Volume2 className="h-3 w-3 text-slate-400" />
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="h-6 text-[10px] flex-1 border-none bg-transparent p-0 shadow-none">
                    <SelectValue placeholder="Voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id} className="text-xs">
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Bubble pointer/tail */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-slate-900 border-r-2 border-b-2 border-[#C4A962]/30 transform rotate-45" />
        </div>
      )}

      {/* Attendance QR Modal */}
      {attendanceSessionData && (
        <AttendanceFullScreenModal
          open={attendanceModalOpen}
          onClose={() => {
            setAttendanceModalOpen(false);
            setAttendanceQrDataUrl(null);
            setAttendanceSessionData(null);
          }}
          qrDataUrl={attendanceQrDataUrl}
          sessionTitle={attendanceSessionData.sessionTitle}
          sessionDate={attendanceSessionData.sessionDate}
          startTime={attendanceSessionData.startTime}
          endTime={attendanceSessionData.endTime}
          location={attendanceSessionData.location}
          enrolledCount={attendanceSessionData.enrolledCount}
          checkedInCount={attendanceSessionData.checkedInCount}
        />
      )}
    </>
  );
};

export default GleeAssistant;
