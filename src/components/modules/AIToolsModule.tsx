import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';

export const AIToolsModule = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Tools
        </CardTitle>
        <CardDescription>
          Artificial intelligence powered tools and assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">AI-powered tools and assistance features coming soon.</p>
      </CardContent>
    </Card>
  );
};