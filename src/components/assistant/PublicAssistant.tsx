import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Loader2, ArrowRight, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import gleeAssistantAvatar from "@/assets/glee-assistant-avatar.png";
import { requestMicrophonePermission } from "@/utils/microphonePermission";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Message {
  role: "user" | "assistant";
  content: string;
  navigationAction?: {
    route: string;
    label: string;
  };
}

// Simple markdown-like formatting for chat messages
const formatMessage = (text: string): string => {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br />');
};

export const PublicAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedContent, setDisplayedContent] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    // Request mic permission FIRST and wait for it before starting recognition
    const perm = await requestMicrophonePermission();
    if (!perm.ok) {
      if ('reason' in perm && perm.reason === 'denied') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser settings to use voice input.",
          variant: "destructive"
        });
      } else if ('reason' in perm && perm.reason === 'not-supported') {
        toast({
          title: "Not Supported",
          description: "Microphone access is not supported in this browser.",
          variant: "destructive"
        });
      } else {
        console.warn('[PublicAssistant] mic permission check failed:', perm);
      }
      return;
    }

    const recognition = recognitionRef.current;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      setInput(transcript);
      
      // Check if final result
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to use voice input.",
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  }, [toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedContent]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Typewriter effect for assistant messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;
    
    // If we're already showing the full content, skip
    if (displayedContent === lastMessage.content) return;
    
    // Start typewriter effect
    setIsTyping(true);
    let currentIndex = 0;
    const content = lastMessage.content;
    
    const typeInterval = setInterval(() => {
      if (currentIndex <= content.length) {
        setDisplayedContent(content.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 15); // 15ms per character for smooth typing

    return () => clearInterval(typeInterval);
  }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
    // Add greeting if no messages
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! I'm the Glee Club assistant. 🎵 How can I help you today? I can answer questions about upcoming events, how to book us, auditions, and more!"
      }]);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setDisplayedContent("");
    
    // Add user message
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Prepare messages for API (only role and content)
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('public-assistant', {
        body: { messages: apiMessages }
      });

      if (error) {
        console.error("Public assistant error:", error);
        throw new Error(error.message || "Failed to get response");
      }

      // Add assistant response
      setMessages([...newMessages, {
        role: "assistant",
        content: data.content,
        navigationAction: data.navigationAction
      }]);

    } catch (error: any) {
      console.error("Error calling public assistant:", error);
      
      let errorMessage = "I'm having trouble responding right now. Please try again or contact press@riversidechoir.example.";
      
      if (error.message?.includes("429") || error.message?.includes("rate")) {
        errorMessage = "I'm receiving too many requests. Please wait a moment and try again.";
      }
      
      toast({
        title: "Assistant Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Add error message as assistant response
      setMessages([...newMessages, {
        role: "assistant",
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNavigate = (route: string) => {
    navigate(route);
    handleClose();
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={handleOpen}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center",
          "w-16 h-16 rounded-full shadow-2xl",
          "bg-white hover:scale-110",
          "transition-all duration-300",
          "border-2 border-[#C4A962]",
          "overflow-hidden",
          isOpen && "hidden"
        )}
        aria-label="Open Glee Club Assistant"
      >
        <img 
          src={gleeAssistantAvatar} 
          alt="Glee Assistant" 
          className="w-full h-full object-cover"
        />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C4A962] rounded-full animate-pulse border-2 border-white" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[400px] max-h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#150d26] to-[#004d99] text-white">
            <img 
              src={gleeAssistantAvatar} 
              alt="Glee Assistant" 
              className="w-10 h-10 rounded-full border-2 border-white/30 object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Glee Club Assistant</h3>
              <p className="text-xs text-white/70">Here to help!</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px] bg-neutral-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <img 
                    src={gleeAssistantAvatar} 
                    alt="" 
                    className="w-8 h-8 rounded-full border border-neutral-200 object-cover flex-shrink-0"
                  />
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-[#150d26] text-white rounded-br-md"
                      : "bg-white text-neutral-800 border border-neutral-200 rounded-bl-md shadow-sm"
                  )}
                >
                  {message.role === "assistant" ? (
                    <>
                      <div 
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: formatMessage(
                            index === messages.length - 1 && isTyping 
                              ? displayedContent 
                              : message.content
                          )
                        }}
                      />
                      {index === messages.length - 1 && isTyping && (
                        <span className="inline-block w-0.5 h-4 bg-[#150d26] animate-pulse ml-0.5" />
                      )}
                      {message.navigationAction && !isTyping && (
                        <Button
                          size="sm"
                          onClick={() => handleNavigate(message.navigationAction!.route)}
                          className="mt-3 bg-[#C4A962] hover:bg-[#b39952] text-white text-xs"
                        >
                          {message.navigationAction.label}
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      )}
                    </>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <img 
                  src={gleeAssistantAvatar} 
                  alt="" 
                  className="w-8 h-8 rounded-full border border-neutral-200 object-cover flex-shrink-0"
                />
                <div className="bg-white text-neutral-800 border border-neutral-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 pt-1 border-t border-neutral-100 bg-white">
              <p className="text-xs text-neutral-500 mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "When is Christmas Carol?",
                  "How do I book you?",
                  "Audition info",
                  "Contact info"
                ].map((question) => (
                  <button
                    key={question}
                    onClick={() => {
                      setInput(question);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="text-xs px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-full transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-neutral-200 bg-white">
            <div className="flex gap-2">
              {speechSupported && (
                <Button
                  onClick={toggleListening}
                  disabled={isLoading}
                  size="icon"
                  variant="outline"
                  className={cn(
                    "rounded-full flex-shrink-0 transition-all",
                    isListening 
                      ? "bg-red-500 hover:bg-red-600 text-white border-red-500 animate-pulse" 
                      : "text-neutral-700 border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900"
                  )}
                  aria-label={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              )}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening..." : "Type or speak your question..."}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2.5 text-sm bg-neutral-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#150d26]/30 disabled:opacity-50",
                  isListening && "ring-2 ring-red-300"
                )}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="rounded-full bg-[#150d26] hover:bg-[#002244] disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {isListening && (
              <p className="text-xs text-red-500 text-center mt-2 animate-pulse">
                🎤 Listening... Speak now
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
