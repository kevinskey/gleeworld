import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface MetronomeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Metronome = ({ isOpen, onClose }: MetronomeProps) => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const interval = 60000 / bpm;
      intervalRef.current = setInterval(() => {
        setBeat((prev) => (prev + 1) % 4);
        playClick();
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, bpm]);

  const playClick = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = beat === 0 ? 800 : 400; // Higher pitch on beat 1
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    setIsPlaying(false);
    setBeat(0);
  };

  if (!isOpen) return null;

  return (
    <Card className="w-80 mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Metronome
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* BPM Display */}
        <div className="text-center">
          <div className="text-4xl font-bold text-primary">{bpm}</div>
          <div className="text-sm text-muted-foreground">BPM</div>
        </div>

        {/* BPM Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tempo</label>
          <Slider
            value={[bpm]}
            onValueChange={(value) => setBpm(value[0])}
            min={40}
            max={200}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>40</span>
            <span>200</span>
          </div>
        </div>

        {/* Beat Indicator */}
        <div className="flex justify-center space-x-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                beat === i && isPlaying
                  ? 'bg-primary border-primary'
                  : 'border-muted-foreground'
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          <Button onClick={togglePlay} variant={isPlaying ? "destructive" : "default"}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button onClick={reset} variant="outline">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};