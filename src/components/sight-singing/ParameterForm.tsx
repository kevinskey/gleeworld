import React from 'react';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ExerciseParameters } from './SightSingingStudio';

interface ParameterFormProps {
  onGenerate: (parameters: ExerciseParameters) => void;
  isGenerating: boolean;
  onReset?: () => void;
  hasExercise?: boolean;
}

export const ParameterForm: React.FC<ParameterFormProps> = ({
  onGenerate,
  isGenerating,
  onReset,
  hasExercise
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ExerciseParameters>({
    defaultValues: {
      key: { tonic: "C", mode: "major" },
      time: { num: 4, den: 4 },
      numMeasures: 4,
      parts: [{ role: "S", range: { min: "C4", max: "C5" } }],
      allowedDur: ["quarter"],
      allowDots: false,
      cadenceEvery: 4,
      bpm: 120,
      title: "Sight-Singing Exercise"
    }
  });

  const watchedParts = watch('parts');
  const watchedAllowedDur = watch('allowedDur');
  const watchedNumMeasures = watch('numMeasures');

  const tonics = ["C", "D", "E", "F", "G", "A", "B", "Db", "Eb", "Gb", "Ab", "Bb", "F#", "C#"];
  const modes = ["major", "minor"];
  const timeSignatures = [
    { num: 2, den: 4 }, { num: 3, den: 4 }, { num: 4, den: 4 }, 
    { num: 6, den: 8 }, { num: 9, den: 8 }, { num: 12, den: 8 }
  ];
  const durations = ["whole", "half", "quarter", "eighth", "16th"];
  const cadenceTypes = ["PAC", "IAC", "HC", "PL", "DC"];

  const handleDurationChange = (duration: string, checked: boolean) => {
    const current = watchedAllowedDur || [];
    if (checked) {
      setValue('allowedDur', [...current, duration as any]);
    } else {
      setValue('allowedDur', current.filter(d => d !== duration));
    }
  };

  const handlePartCountChange = (count: string) => {
    const numParts = parseInt(count);
    if (numParts === 1) {
      setValue('parts', [{ role: "S", range: { min: "C4", max: "C5" } }]);
    } else {
      setValue('parts', [
        { role: "S", range: { min: "C4", max: "C5" } },
        { role: "A", range: { min: "F3", max: "F4" } }
      ]);
    }
  };

  const onSubmit = (data: ExerciseParameters) => {
    // Validate that at least one duration is selected
    if (!data.allowedDur || data.allowedDur.length === 0) {
      return;
    }
    onGenerate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Settings */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Exercise Title</Label>
          <Input
            id="title"
            {...register('title', { required: 'Title is required' })}
            placeholder="Enter exercise title"
          />
          {errors.title && <span className="text-sm text-destructive">{errors.title.message}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Parts</Label>
            <Select onValueChange={handlePartCountChange} defaultValue="1">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Part (Monophonic)</SelectItem>
                <SelectItem value="2">2 Parts (Harmony)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="numMeasures">Number of Measures</Label>
            <Input
              id="numMeasures"
              type="number"
              min="1"
              max="32"
              {...register('numMeasures', { 
                required: 'Number of measures is required',
                min: { value: 1, message: 'Minimum 1 measure' },
                max: { value: 32, message: 'Maximum 32 measures' }
              })}
            />
            {errors.numMeasures && <span className="text-sm text-destructive">{errors.numMeasures.message}</span>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Key and Time Signature */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Musical Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Key Signature</Label>
            <div className="flex gap-2">
              <Select 
                onValueChange={(value) => setValue('key.tonic', value)}
                defaultValue="C"
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tonics.map(tonic => (
                    <SelectItem key={tonic} value={tonic}>{tonic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                onValueChange={(value) => setValue('key.mode', value as "major"|"minor")}
                defaultValue="major"
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modes.map(mode => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Time Signature</Label>
            <Select 
              onValueChange={(value) => {
                const [num, den] = value.split('/').map(Number);
                setValue('time', { num, den: den as 1|2|4|8|16 });
              }}
              defaultValue="4/4"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSignatures.map(ts => (
                  <SelectItem key={`${ts.num}/${ts.den}`} value={`${ts.num}/${ts.den}`}>
                    {ts.num}/{ts.den}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="bpm">Tempo (BPM)</Label>
          <Input
            id="bpm"
            type="number"
            min="60"
            max="200"
            {...register('bpm', { 
              required: 'Tempo is required',
              min: { value: 60, message: 'Minimum 60 BPM' },
              max: { value: 200, message: 'Maximum 200 BPM' }
            })}
          />
          {errors.bpm && <span className="text-sm text-destructive">{errors.bpm.message}</span>}
        </div>
      </div>

      <Separator />

      {/* Duration Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Note Durations</h3>
        
        <div className="space-y-3">
          <Label>Allowed Durations</Label>
          <div className="grid grid-cols-3 gap-2">
            {durations.map((duration) => (
              <div key={duration} className="flex items-center space-x-2">
                <Checkbox
                  id={duration}
                  checked={watchedAllowedDur?.includes(duration as any)}
                  onCheckedChange={(checked) => handleDurationChange(duration, checked as boolean)}
                />
                <Label htmlFor={duration} className="text-sm font-normal">
                  {duration.charAt(0).toUpperCase() + duration.slice(1)}
                </Label>
              </div>
            ))}
          </div>
          {(!watchedAllowedDur || watchedAllowedDur.length === 0) && (
            <span className="text-sm text-destructive">Select at least one duration</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowDots"
            {...register('allowDots')}
          />
          <Label htmlFor="allowDots" className="text-sm font-normal">
            Allow Dotted Notes (up to 2 dots)
          </Label>
        </div>
      </div>

      <Separator />

      {/* Cadence Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Cadence Settings</h3>
        
        <div>
          <Label htmlFor="cadenceEvery">Cadence Every N Bars</Label>
          <Input
            id="cadenceEvery"
            type="number"
            min="2"
            max={watchedNumMeasures}
            {...register('cadenceEvery', { 
              required: 'Cadence frequency is required',
              min: { value: 2, message: 'Minimum every 2 bars' },
              max: { value: watchedNumMeasures, message: 'Cannot exceed number of measures' }
            })}
          />
          {errors.cadenceEvery && <span className="text-sm text-destructive">{errors.cadenceEvery.message}</span>}
        </div>
      </div>

      <div className="space-y-2">
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isGenerating || !watchedAllowedDur || watchedAllowedDur.length === 0}
        >
          {isGenerating ? 'Generating Exercise...' : 'Generate Exercise'}
        </Button>
        
        {hasExercise && onReset && (
          <Button 
            type="button"
            variant="outline" 
            className="w-full" 
            onClick={onReset}
            disabled={isGenerating}
          >
            Reset Exercise
          </Button>
        )}
      </div>
    </form>
  );
};