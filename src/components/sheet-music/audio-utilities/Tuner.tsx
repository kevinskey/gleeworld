import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TunerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Tuner = ({ isOpen, onClose }: TunerProps) => {
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [note, setNote] = useState('');
  const [cents, setCents] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const noteFrequencies = [
    { name: 'C', frequency: 261.63 },
    { name: 'C#', frequency: 277.18 },
    { name: 'D', frequency: 293.66 },
    { name: 'D#', frequency: 311.13 },
    { name: 'E', frequency: 329.63 },
    { name: 'F', frequency: 349.23 },
    { name: 'F#', frequency: 369.99 },
    { name: 'G', frequency: 392.00 },
    { name: 'G#', frequency: 415.30 },
    { name: 'A', frequency: 440.00 },
    { name: 'A#', frequency: 466.16 },
    { name: 'B', frequency: 493.88 },
  ];

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 2048;
      setIsListening(true);
      detectPitch();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopListening = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setFrequency(0);
    setNote('');
    setCents(0);
  };

  const detectPitch = () => {
    if (!analyserRef.current || !isListening) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Simple pitch detection (this is a basic implementation)
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    if (maxValue > 100) { // Threshold for noise
      const detectedFreq = maxIndex * (audioContextRef.current!.sampleRate / 2) / bufferLength;
      setFrequency(detectedFreq);
      
      // Find closest note
      let closestNote = noteFrequencies[0];
      let minDiff = Math.abs(detectedFreq - closestNote.frequency);
      
      for (const noteFreq of noteFrequencies) {
        const diff = Math.abs(detectedFreq - noteFreq.frequency);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = noteFreq;
        }
      }
      
      setNote(closestNote.name);
      
      // Calculate cents (difference from perfect pitch)
      const centsDiff = Math.round(1200 * Math.log2(detectedFreq / closestNote.frequency));
      setCents(centsDiff);
    }

    if (isListening) {
      requestAnimationFrame(detectPitch);
    }
  };

  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <Card className="w-80 mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Tuner
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Frequency Display */}
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {note || '--'}
          </div>
          <div className="text-sm text-muted-foreground">
            {frequency > 0 ? `${frequency.toFixed(1)} Hz` : 'No signal'}
          </div>
        </div>

        {/* Cents Indicator */}
        <div className="flex justify-center">
          <div className="relative w-64 h-8 bg-muted rounded-full">
            <div className="absolute top-1/2 left-1/2 w-1 h-full bg-primary transform -translate-x-1/2 -translate-y-1/2" />
            {cents !== 0 && (
              <div
                className={`absolute top-1/2 w-2 h-2 rounded-full transform -translate-y-1/2 ${
                  Math.abs(cents) <= 10 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  left: `${50 + (cents / 100) * 40}%`,
                  transform: 'translateY(-50%)',
                }}
              />
            )}
          </div>
        </div>

        {/* Cents Value */}
        <div className="text-center">
          <div className={`text-lg font-semibold ${
            Math.abs(cents) <= 10 ? 'text-green-500' : 'text-red-500'
          }`}>
            {cents > 0 ? '+' : ''}{cents} cents
          </div>
        </div>

        {/* Control Button */}
        <div className="flex justify-center">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            className="gap-2"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? 'Stop' : 'Start'} Listening
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};