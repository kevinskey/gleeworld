import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Mic2, Speech } from 'lucide-react';
import { TheLabModule } from './TheLabModule';
import { RehearsalTranscriptionModule } from './RehearsalTranscriptionModule';
import { VoiceConversationAgent } from '@/components/assistant/VoiceConversationAgent';

/**
 * AI Hub — unified entry point for AI-powered tools.
 *
 * Tabs:
 *   - The Lab        — ElevenLabs voice & audio tools (TTS, transcription, SFX, music gen)
 *   - Transcription  — AI-powered rehearsal transcription with speaker labels
 *   - Voice Chat     — natural voice conversation with the Glee Assistant
 *
 * Replaces 3 separate module entries: the-lab, rehearsal-transcription, voice-conversation.
 */
export const AIHub = () => {
  const [tab, setTab] = useState('lab');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">AI Tools</h2>
        <p className="text-sm text-muted-foreground">
          Voice synthesis, rehearsal transcription, and conversational assistant.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="lab" className="gap-1.5">
            <Wand2 className="h-4 w-4" />
            The Lab
          </TabsTrigger>
          <TabsTrigger value="transcription" className="gap-1.5">
            <Mic2 className="h-4 w-4" />
            Transcription
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5">
            <Speech className="h-4 w-4" />
            Voice Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab" className="m-0">
          <TheLabModule />
        </TabsContent>
        <TabsContent value="transcription" className="m-0">
          <RehearsalTranscriptionModule />
        </TabsContent>
        <TabsContent value="voice" className="m-0">
          <VoiceConversationAgent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIHub;
