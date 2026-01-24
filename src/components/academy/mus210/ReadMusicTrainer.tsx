import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, ExternalLink, Music, BookOpen } from 'lucide-react';

export const ReadMusicTrainer: React.FC = () => {
  const baseUrl = 'https://readmusic.gleeworld.org';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              ReadMusic Sight-Reading Trainer
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(baseUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Full Site
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Practice sight-reading exercises and warm-ups for MUS 210
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card className="border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Warm-up Exercises</h4>
                    <p className="text-sm text-muted-foreground">
                      Daily sight-reading warm-ups to build pitch accuracy and rhythm
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Assignment Practice</h4>
                    <p className="text-sm text-muted-foreground">
                      Practice materials for ReadMusic warm-up assignments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="rounded-lg border overflow-hidden bg-background">
            <iframe 
              src={baseUrl}
              style={{ width: '100%', height: '70vh', minHeight: '500px' }}
              allow="fullscreen; microphone"
              title="ReadMusic Sight-Reading Trainer"
              className="bg-white"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
