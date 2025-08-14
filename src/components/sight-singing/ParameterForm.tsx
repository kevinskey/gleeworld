import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
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

  const tonics = ["C", "D", "E", "F", "G", "A", "B", "Db", "Eb", "Gb", "Ab", "Bb"];
  const modes = ["major", "minor"];
  const timeSignatures = [
    { num: 2, den: 4 }, { num: 3, den: 4 }, { num: 4, den: 4 }, 
    { num: 6, den: 8 }, { num: 9, den: 8 }
  ];
  const durations = ["whole", "half", "quarter", "eighth", "16th"];

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
    if (!data.allowedDur || data.allowedDur.length === 0) {
      return;
    }
    onGenerate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      {/* Key */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Key</Label>
        <div className="grid grid-cols-2 gap-1">
          <Select value={watch('key.tonic')} onValueChange={(value) => setValue('key.tonic', value)}>
            <SelectTrigger className="h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tonics.map(tonic => (
                <SelectItem key={tonic} value={tonic}>{tonic}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={watch('key.mode')} onValueChange={(value) => setValue('key.mode', value as "major"|"minor")}>
            <SelectTrigger className="h-6 text-xs">
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

      {/* Time */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Time</Label>
        <Select 
          value={`${watch('time.num')}/${watch('time.den')}`} 
          onValueChange={(value) => {
            const [num, den] = value.split('/').map(Number);
            setValue('time', { num, den: den as 1|2|4|8|16 });
          }}
        >
          <SelectTrigger className="h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeSignatures.map(time => (
              <SelectItem key={`${time.num}/${time.den}`} value={`${time.num}/${time.den}`}>
                {time.num}/{time.den}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Measures */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Measures</Label>
        <Input
          type="number"
          min="2"
          max="8"
          className="h-6 text-xs"
          {...register('numMeasures', { 
            required: true,
            min: { value: 2, message: 'Min 2' },
            max: { value: 8, message: 'Max 8' }
          })}
        />
      </div>

      {/* BPM */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">BPM: {watch('bpm')}</Label>
        <Slider
          value={[watch('bpm')]}
          onValueChange={(value) => setValue('bpm', value[0])}
          min={60}
          max={180}
          step={5}
          className="w-full"
        />
      </div>

      {/* Voice Parts */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Parts</Label>
        <Select 
          value={watchedParts?.length?.toString() || "1"} 
          onValueChange={handlePartCountChange}
        >
          <SelectTrigger className="h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Soprano Only</SelectItem>
            <SelectItem value="2">Soprano + Alto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Durations */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Note Values</Label>
        <div className="grid grid-cols-3 gap-1">
          {durations.map((duration) => (
            <div key={duration} className="flex items-center space-x-1">
              <Checkbox
                id={duration}
                checked={watchedAllowedDur?.includes(duration as any) || false}
                onCheckedChange={(checked) => handleDurationChange(duration, checked as boolean)}
              />
              <Label htmlFor={duration} className="text-sm font-medium flex items-center gap-1">
                <span className="text-lg font-mono">
                  {duration === 'whole' ? '○' : 
                   duration === 'half' ? '♩' : 
                   duration === 'quarter' ? '♪' : 
                   duration === 'eighth' ? '♫' : '♬'}
                </span>
                <span className="text-xs capitalize">{duration}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Allow Dots */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="allowDots"
          checked={watch('allowDots')}
          onCheckedChange={(checked) => setValue('allowDots', checked as boolean)}
        />
        <Label htmlFor="allowDots" className="text-xs font-medium">Allow Dotted Notes</Label>
      </div>

      {/* Cadence Frequency */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Cadence Every</Label>
        <Input
          type="number"
          min="2"
          max={watchedNumMeasures}
          className="h-6 text-xs"
          {...register('cadenceEvery', { 
            required: true,
            min: { value: 2, message: 'Min 2' },
            max: { value: watchedNumMeasures, message: 'Max measures' }
          })}
        />
      </div>

      <div className="space-y-1">
        <Button 
          type="submit" 
          size="sm"
          className="w-full h-7 text-xs" 
          disabled={isGenerating || !watchedAllowedDur || watchedAllowedDur.length === 0}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
        
        {hasExercise && onReset && (
          <Button 
            type="button"
            variant="outline"
            size="sm" 
            className="w-full h-6 text-xs" 
            onClick={onReset}
            disabled={isGenerating}
          >
            Reset
          </Button>
        )}
      </div>
    </form>
  );
};