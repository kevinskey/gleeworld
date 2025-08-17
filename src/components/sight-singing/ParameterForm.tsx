import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ExerciseParameters } from './SightSingingStudio';

interface ParameterFormProps {
  onGenerate: (parameters: ExerciseParameters) => void;
  isGenerating: boolean;
  onReset?: () => void;
  hasExercise?: boolean;
}

// Note value icons as SVG components
const NoteIcons = {
  whole: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <ellipse cx="12" cy="16" rx="5" ry="3" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  half: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <ellipse cx="8" cy="16" rx="4" ry="3" fill="currentColor"/>
      <line x1="12" y1="16" x2="12" y2="4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  quarter: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <ellipse cx="8" cy="16" rx="4" ry="3" fill="currentColor"/>
      <line x1="12" y1="16" x2="12" y2="4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  eighth: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <ellipse cx="6" cy="18" rx="3" ry="2" fill="currentColor"/>
      <line x1="9" y1="18" x2="9" y2="6" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 6 Q15 4 15 8" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  '16th': () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
      <ellipse cx="6" cy="18" rx="3" ry="2" fill="currentColor"/>
      <line x1="9" y1="18" x2="9" y2="6" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 6 Q15 4 15 8" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 9 Q15 7 15 11" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
};

export const ParameterForm: React.FC<ParameterFormProps> = ({
  onGenerate,
  isGenerating,
  onReset,
  hasExercise
}) => {
  const { handleSubmit, watch, setValue, formState: { errors } } = useForm<ExerciseParameters>({
    defaultValues: {
      key: { tonic: "C", mode: "major" },
      time: { num: 4, den: 4 },
      numMeasures: 4,
      parts: [{ role: "S", range: { min: "C4", max: "C5" } }],
      allowedDur: ["quarter"],
      allowDots: false,
      allowAccidentals: false,
      intervalMotion: ["step", "skip"],
      cadenceEvery: 4,
      bpm: 120,
      title: "Sight-Singing Exercise"
    }
  });

  const watchedKey = watch('key');
  const watchedTime = watch('time');
  const watchedNumMeasures = watch('numMeasures');
  const watchedParts = watch('parts');
  const watchedAllowedDur = watch('allowedDur');
  const watchedIntervalMotion = watch('intervalMotion');
  const watchedAllowDots = watch('allowDots');
  const watchedCadenceEvery = watch('cadenceEvery');
  const watchedBpm = watch('bpm');

  const tonics = ["C", "D", "E", "F", "G", "A", "B", "Db", "Eb", "Gb", "Ab", "Bb"];
  const modes = ["major", "minor"];
  const timeSignatures = [
    { num: 2, den: 4 }, { num: 3, den: 4 }, { num: 4, den: 4 }, 
    { num: 6, den: 8 }, { num: 9, den: 8 }
  ];
  const durations = ["whole", "half", "quarter", "eighth", "16th"];
  const motions = ["step", "skip", "leap", "repeat"];
  const measureOptions = [4, 8, 16, 32];
  const cadenceOptions = [2, 4, 8];

  const handleDurationChange = (duration: string) => {
    const current = watchedAllowedDur || [];
    if (current.includes(duration as any)) {
      setValue('allowedDur', current.filter(d => d !== duration));
    } else {
      setValue('allowedDur', [...current, duration as any]);
    }
  };

  const handleMotionChange = (motion: string) => {
    const current = watchedIntervalMotion || [];
    if (current.includes(motion as any)) {
      setValue('intervalMotion', current.filter(m => m !== motion));
    } else {
      setValue('intervalMotion', [...current, motion as any]);
    }
  };

  const onSubmit = (data: ExerciseParameters) => {
    if (!data.allowedDur || data.allowedDur.length === 0) {
      return;
    }
    console.log('Form submission data:', data);
    onGenerate(data);
  };

  const isSelected = (value: any, currentValue: any) => {
    if (Array.isArray(currentValue)) {
      return currentValue.includes(value);
    }
    return value === currentValue;
  };

  return (
    <div className="flex flex-col p-2">
      <div className="space-y-3">
        <form className="space-y-3">
          {/* Key Selection */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Key</Label>
            <div className="grid grid-cols-6 gap-1">
              {tonics.map(tonic => (
                <Button
                  key={tonic}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${watchedKey.tonic === tonic ? 'bg-blue-500/20 border-blue-500' : ''}`}
                  onClick={() => setValue('key.tonic', tonic)}
                >
                  {tonic}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {modes.map(mode => (
                <Button
                  key={mode}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${watchedKey.mode === mode ? 'bg-blue-500/20 border-blue-500' : ''}`}
                  onClick={() => setValue('key.mode', mode as "major"|"minor")}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Signature */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Time</Label>
            <div className="grid grid-cols-5 gap-1">
              {timeSignatures.map(time => (
                <Button
                  key={`${time.num}/${time.den}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${watchedTime.num === time.num && watchedTime.den === time.den ? 'bg-blue-500/20 border-blue-500' : ''}`}
                  onClick={() => setValue('time', { num: time.num, den: time.den as 1|2|4|8|16 })}
                >
                  {time.num}/{time.den}
                </Button>
              ))}
            </div>
          </div>

          {/* Measures */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Measures</Label>
            <div className="grid grid-cols-4 gap-1">
              {measureOptions.map(measure => (
                <Button
                  key={measure}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${watchedNumMeasures === measure ? 'bg-blue-500/20 border-blue-500' : ''}`}
                  onClick={() => setValue('numMeasures', measure)}
                >
                  {measure}
                </Button>
              ))}
            </div>
          </div>

          {/* Voice Parts */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Parts</Label>
            <div className="grid grid-cols-2 gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 text-xs ${watchedParts?.length === 1 ? 'bg-blue-500/20 border-blue-500' : ''}`}
                onClick={() => setValue('parts', [{ role: "S", range: { min: "C4", max: "C5" } }])}
              >
                Soprano Only
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 text-xs ${watchedParts?.length === 2 ? 'bg-blue-500/20 border-blue-500' : ''}`}
                onClick={() => setValue('parts', [
                  { role: "S", range: { min: "C4", max: "C5" } },
                  { role: "A", range: { min: "F3", max: "F4" } }
                ])}
              >
                Soprano + Alto
              </Button>
            </div>
          </div>

          {/* Note Values */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Note Values</Label>
            <div className="grid grid-cols-5 gap-1">
              {durations.map((duration) => {
                const IconComponent = NoteIcons[duration as keyof typeof NoteIcons];
                return (
                  <Button
                    key={duration}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-10 flex flex-col items-center gap-1 ${
                      isSelected(duration, watchedAllowedDur) ? 'bg-blue-500/20 border-blue-500' : ''
                    }`}
                    onClick={() => handleDurationChange(duration)}
                  >
                    <IconComponent />
                    <span className="text-xs">{duration === '16th' ? '16th' : duration.slice(0, 1)}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Interval Motion */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Motion</Label>
            <div className="grid grid-cols-4 gap-1">
              {motions.map((motion) => (
                <Button
                  key={motion}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${
                    isSelected(motion, watchedIntervalMotion) ? 'bg-blue-500/20 border-blue-500' : ''
                  }`}
                  onClick={() => handleMotionChange(motion)}
                >
                  {motion}
                </Button>
              ))}
            </div>
          </div>

          {/* Dotted Notes */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Options</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`h-8 text-xs ${watchedAllowDots ? 'bg-blue-500/20 border-blue-500' : ''}`}
              onClick={() => setValue('allowDots', !watchedAllowDots)}
            >
              ♪ Dotted Notes
            </Button>
          </div>

          {/* Cadence Frequency */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Cadence Every</Label>
            <div className="grid grid-cols-3 gap-1">
              {cadenceOptions.map(cadence => (
                <Button
                  key={cadence}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs ${watchedCadenceEvery === cadence ? 'bg-blue-500/20 border-blue-500' : ''}`}
                  onClick={() => setValue('cadenceEvery', cadence)}
                >
                  {cadence} bars
                </Button>
              ))}
            </div>
          </div>

        </form>
        
        {/* Action Buttons - Right after parameters */}
        <div className="pt-3 border-t space-y-2">
          <Button 
            onClick={handleSubmit(onSubmit)}
            size="sm"
            className="w-full h-12 text-sm font-medium" 
            disabled={isGenerating || !watchedAllowedDur || watchedAllowedDur.length === 0 || !watchedIntervalMotion || watchedIntervalMotion.length === 0}
          >
            {isGenerating ? 'Generating...' : '🎵 Generate Exercise'}
          </Button>
          
          {hasExercise && onReset && (
            <Button 
              type="button"
              variant="outline"
              size="sm" 
              className="w-full h-10 text-xs" 
              onClick={onReset}
              disabled={isGenerating}
            >
              🔄 Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};