// Simple metronome component

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square } from 'lucide-react';

export const Metronome: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metronome</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant={isPlaying ? "destructive" : "default"}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};