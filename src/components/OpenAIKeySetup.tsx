import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Key } from 'lucide-react';

export const OpenAIKeySetup = () => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          OpenAI API Key Required
        </CardTitle>
        <CardDescription>
          You need to configure your OpenAI API key in Supabase secrets for the sight reading generator to work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Follow these steps:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Get your API key from OpenAI</li>
            <li>Go to Supabase Functions settings</li>
            <li>Add OPENAI_API_KEY as a secret</li>
            <li>Redeploy the functions</li>
          </ol>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Get OpenAI API Key
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => window.open('https://supabase.com/dashboard/project/oopmlreysjzuxzylyheb/settings/functions', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Supabase Functions Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};