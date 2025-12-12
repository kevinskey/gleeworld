import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, Volume2 } from 'lucide-react';
import { useMetronome } from './hooks/useMetronome';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { forceUnlockAudio } from '@/utils/mobileAudioUnlock';

export const Metronome: React.FC = () => {
  const {
    isPlaying,
    startMetronome,
    stopMetronome,
    volume,
    setVolume,
    tempo,
    setTempo,
    updateTempo,
    soundType,
    setSoundType,
  } = useMetronome();

  const handleTempoChange = (value: string) => {
    const newTempo = parseInt(value);
    if (newTempo >= 40 && newTempo <= 200) {
      updateTempo(newTempo);
    }
  };

  const handleTempoSliderChange = (value: number[]) => {
    updateTempo(value[0]);
  };

  const handlePlayStop = () => {
    // CRITICAL: Force unlock audio on the button click (user gesture) for iOS
    forceUnlockAudio();
    
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-4 w-4 bg-primary rounded-full" />
          Metronome
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tempo Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tempo-input" className="text-sm font-medium">Tempo (BPM)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="tempo-input"
                type="number"
                min="40"
                max="200"
                value={tempo}
                onChange={(e) => handleTempoChange(e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">BPM</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Slider
              value={[tempo]}
              onValueChange={handleTempoSliderChange}
              min={40}
              max={200}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>40</span>
              <span>120</span>
              <span>200</span>
          </div>
        </div>

        {/* Sound Type Toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sound Type</Label>
          <ToggleGroup 
            type="single" 
            value={soundType} 
            onValueChange={(value) => value && setSoundType(value as 'pitch' | 'click')}
            className="justify-start"
          >
            <ToggleGroupItem value="pitch" aria-label="Pitched sound" className="flex-1">
              Pitch
            </ToggleGroupItem>
            <ToggleGroupItem value="click" aria-label="Click sound" className="flex-1">
              Click
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Volume
          </Label>
          <Slider
            value={[volume]}
            onValueChange={(value) => setVolume(value[0])}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Play/Stop Button */}
        <Button
          variant={isPlaying ? "destructive" : "default"}
          size="lg"
          onClick={handlePlayStop}
          onPointerDown={() => forceUnlockAudio()}
          onTouchStart={() => forceUnlockAudio()}
          className="w-full touch-manipulation"
        >
          {isPlaying ? (
            <>
              <Square className="h-5 w-5 mr-2" />
              Stop Metronome
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Start Metronome
            </>
          )}
        </Button>

        {/* Tempo Indicators */}
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-primary">{tempo}</div>
          <div className="text-sm text-muted-foreground">
            {tempo < 60 ? 'Largo' : 
             tempo < 80 ? 'Adagio' : 
             tempo < 100 ? 'Andante' : 
             tempo < 120 ? 'Moderato' : 
             tempo < 140 ? 'Allegro' : 
             tempo < 160 ? 'Vivace' : 'Presto'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};