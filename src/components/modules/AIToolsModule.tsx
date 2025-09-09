import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Send } from 'lucide-react';
import { callAI } from '@/utils/aiChat';
import { useToast } from '@/hooks/use-toast';

export const AIToolsModule = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const result = await callAI(prompt);
      const aiMessage = result.choices?.[0]?.message?.content || 'No response received';
      setResponse(aiMessage);
      
      toast({
        title: "AI Response Received",
        description: "Check the output below",
      });
    } catch (error) {
      console.error('AI Error:', error);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Tools
        </CardTitle>
        <CardDescription>
          Test the AI chat functionality powered by OpenAI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt (e.g., 'Test from GleeWorld')"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !prompt.trim()}>
              {loading ? 'Sending...' : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
        
        {response && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">AI Response:</h4>
            <p className="text-sm whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};