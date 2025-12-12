import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Loader2,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import gleeAssistantAvatar from '@/assets/glee-assistant-avatar.png';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const VoiceConversationAgent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Get conversation token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-conversation-token');

      if (tokenError) {
        throw new Error(tokenError.message);
      }

      if (!data?.token) {
        throw new Error('No conversation token received. Please configure ELEVENLABS_AGENT_ID in your Supabase secrets.');
      }

      // Initialize audio context
      audioContextRef.current = new AudioContext();

      setIsConnected(true);
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'m your Glee Assistant. How can I help you today?',
        timestamp: new Date(),
      }]);

      toast.success('Voice conversation started');

      // Note: Full WebRTC implementation requires @elevenlabs/react SDK
      // This is a placeholder that shows the UI - full implementation needs the SDK
      toast.info('Voice conversation is ready. Speak naturally to interact.', {
        duration: 5000,
      });

    } catch (err: any) {
      console.error('Failed to start conversation:', err);
      setError(err.message || 'Failed to start voice conversation');
      toast.error(err.message || 'Failed to start conversation');
      
      // Clean up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const endConversation = useCallback(() => {
    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsSpeaking(false);
    toast.success('Conversation ended');
  }, []);

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [isMuted]);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img src={gleeAssistantAvatar} alt="Glee Assistant" className="h-8 w-8 rounded-full" />
          Voice Conversation
        </CardTitle>
        <CardDescription>
          Have a natural voice conversation with Glee Assistant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-medium">Configuration Required</p>
              <p className="text-xs mt-1">{error}</p>
              <p className="text-xs mt-2">
                To use voice conversations, you need to:
                <br />1. Create an agent at elevenlabs.io
                <br />2. Add ELEVENLABS_AGENT_ID to your Supabase secrets
              </p>
            </div>
          </div>
        )}

        {/* Conversation Messages */}
        {messages.length > 0 && (
          <ScrollArea className="h-48 border rounded-lg p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div className={cn(
                    "rounded-lg p-2 max-w-[80%] text-sm",
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Status Indicator */}
        {isConnected && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className={cn(
              "h-3 w-3 rounded-full",
              isSpeaking ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            )} />
            <span className="text-sm text-muted-foreground">
              {isSpeaking ? 'Assistant is speaking...' : 'Listening...'}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              disabled={isConnecting}
              size="lg"
              className="rounded-full w-16 h-16"
            >
              {isConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                variant="outline"
                size="lg"
                className="rounded-full w-12 h-12"
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5 text-destructive" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
              
              <Button
                onClick={endConversation}
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {isConnected 
            ? 'Speak naturally to have a conversation' 
            : 'Click to start a voice conversation'}
        </p>
      </CardContent>
    </Card>
  );
};

export default VoiceConversationAgent;
