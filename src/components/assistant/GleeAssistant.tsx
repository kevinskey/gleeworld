import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Loader2,
  User,
  ExternalLink,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';
import gleeAssistantAvatar from '@/assets/glee-assistant-avatar.png';

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
}

export const GleeAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [wakeWordStatus, setWakeWordStatus] = useState<'inactive' | 'listening' | 'activated'>('inactive');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
            if (isWakeWordActive && wakeWordRecognitionRef.current) {
              try {
                wakeWordRecognitionRef.current.start();
              } catch (e) {
                console.log('Could not restart wake word recognition');
              }
            }
          }, 1000);
        }
      };

      wakeWordRecognitionRef.current.onend = () => {
        console.log('Wake word recognition ended');
        // Restart if wake word mode is still active and assistant is closed
        if (isWakeWordActive && !isOpen) {
          setTimeout(() => {
            if (wakeWordRecognitionRef.current && isWakeWordActive) {
              try {
                wakeWordRecognitionRef.current.start();
                setWakeWordStatus('listening');
              } catch (e) {
                console.log('Could not restart wake word recognition');
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      // Request microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsWakeWordActive(true);
        toast({
          title: "Hey Glee Enabled",
          description: "Say \"Hey Glee\" to activate the assistant.",
        });
      } catch (e) {
        toast({
          title: "Microphone Required",
          description: "Please allow microphone access to use wake word.",
          variant: "destructive",
        });
      }
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Stop wake word temporarily while manual listening
      if (wakeWordRecognitionRef.current && isWakeWordActive) {
        try {
          wakeWordRecognitionRef.current.stop();
        } catch (e) {}
      }
      recognitionRef.current.start();
      setIsListening(true);
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

      // Auto-execute navigation actions and close assistant
      if (data.actions?.length > 0) {
        for (const action of data.actions) {
          if (action.action === 'navigate' && action.route) {
            // Auto-navigate and close
            setTimeout(() => {
              navigate(action.route);
              setIsOpen(false);
            }, 500); // Brief delay so user sees the response
            break;
          } else if (action.action === 'open_score' && action.score_id) {
            setTimeout(() => {
              navigate(`/music-library?view=${action.score_id}`);
              setIsOpen(false);
            }, 500);
            break;
          }
        }
      }

      // Speak the response (optional TTS)
      if ('speechSynthesis' in window && data.message) {
        const utterance = new SpeechSynthesisUtterance(data.message);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
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

      {/* Floating Button Group */}
      <div className={cn("fixed bottom-6 right-6 flex flex-col items-center gap-2", isOpen && "hidden")} style={{ zIndex: 9999 }}>
        {/* Wake Word Toggle */}
        <Button
          onClick={toggleWakeWord}
          size="sm"
          variant={isWakeWordActive ? "default" : "outline"}
          className={cn(
            "rounded-full h-8 px-3 text-xs shadow-md",
            isWakeWordActive && "bg-green-600 hover:bg-green-700"
          )}
        >
          <Mic className={cn("h-3 w-3 mr-1", isWakeWordActive && "animate-pulse")} />
          {isWakeWordActive ? "Hey Glee On" : "Hey Glee"}
        </Button>
        
        {/* Main Assistant Button */}
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "rounded-full shadow-lg",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "transition-all duration-300 hover:scale-110"
          )}
          style={{ padding: 0, overflow: 'hidden', width: '72px', height: '72px' }}
        >
          <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-full w-full object-cover" />
        </Button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] h-[70vh] sm:h-[520px] max-h-[600px] shadow-2xl flex flex-col overflow-hidden border-2 border-primary/20" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-2">
              <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-6 w-6 rounded-full object-cover" />
              <span className="font-semibold">Glee Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-16 w-16 mx-auto mb-3 rounded-full opacity-80" />
                <p className="font-medium">Hi! I'm your Glee Assistant.</p>
                <p className="mt-1">Ask me to open a score, check assignments, or navigate anywhere!</p>
                <div className="mt-4 space-y-2 text-xs">
                  <p className="text-muted-foreground/70">Try saying:</p>
                  <p>"Is there an assignment due today?"</p>
                  <p>"Open the Stabat Mater score"</p>
                  <p>"What events are coming up?"</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-full overflow-hidden flex-shrink-0">
                        <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Action buttons */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {msg.actions.map((action, actionIdx) => (
                            <Button
                              key={actionIdx}
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAction(action)}
                              className="w-full text-xs h-auto py-2 px-2 whitespace-normal text-left justify-start"
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
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full overflow-hidden">
                      <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-full w-full object-cover" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-background">
            <div className="flex gap-2">
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleListening}
                className="h-10 w-10 flex-shrink-0"
                disabled={isLoading}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                className="flex-1"
                disabled={isLoading || isListening}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default GleeAssistant;
