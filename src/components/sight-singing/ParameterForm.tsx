import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
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
  const {
    handleSubmit,
    watch,
    setValue,
    formState: {
      errors
    }
  } = useForm<ExerciseParameters>({
    defaultValues: {
      key: {
        tonic: "C",
        mode: "major"
      },
      time: {
        num: 4,
        den: 4
      },
      numMeasures: 8,
      parts: [{
        role: "S",
        range: {
          min: "C4",
          max: "C5"
        }
      }],
      allowedDur: ["quarter"],
      allowDots: false,
      allowAccidentals: false,
      intervalMotion: ["step", "skip"],
      cadenceEvery: 4,
      bpm: 120,
      title: "Sight-Singing Exercise",
      cadenceType: "authentic",
      enforceVoiceLeading: true,
      requireResolution: true,
      strongBeatCadence: true,
      maxInterval: 7,
      stepwiseMotionPercentage: 70
    }
  });

  // Watch form values
  const watchedKey = watch('key');
  const watchedTime = watch('time');
  const watchedNumMeasures = watch('numMeasures');
  const watchedParts = watch('parts');
  const watchedAllowedDur = watch('allowedDur');
  const watchedAllowDots = watch('allowDots');
  const watchedIntervalMotion = watch('intervalMotion');
  const watchedCadenceEvery = watch('cadenceEvery');
  const watchedBpm = watch('bpm');
  const tonics = ["C", "D", "E", "F", "G", "A", "B", "Db", "Eb", "Gb", "Ab", "Bb"];
  const modes = ["major", "minor", "natural minor", "harmonic minor", "melodic minor", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
  const timeSignatures = [{
    num: 2,
    den: 4
  }, {
    num: 3,
    den: 4
  }, {
    num: 4,
    den: 4
  }, {
    num: 6,
    den: 8
  }, {
    num: 9,
    den: 8
  }];
  const durations = ["whole", "half", "quarter", "eighth", "16th"];
  const motions = ["step", "skip", "leap", "repeat"];
  const measureOptions = [4, 8, 16, 32];
  const cadenceOptions = [2, 4, 8];
  const cadenceTypes = ["authentic", "half", "plagal", "deceptive"];
  const bpmOptions = [60, 72, 84, 96, 108, 120, 132, 144, 160, 180];
  const handleDurationToggle = (duration: string) => {
    const current = watchedAllowedDur || [];
    if (current.includes(duration as any)) {
      const newDurations = current.filter(d => d !== duration);
      if (newDurations.length > 0) {
        setValue('allowedDur', newDurations);
      }
    } else {
      setValue('allowedDur', [...current, duration as any]);
    }
  };
  const handleMotionToggle = (motion: string) => {
    const current = watchedIntervalMotion || [];
    if (current.includes(motion as any)) {
      const newMotions = current.filter(m => m !== motion);
      if (newMotions.length > 0) {
        setValue('intervalMotion', newMotions);
      }
    } else {
      setValue('intervalMotion', [...current, motion as any]);
    }
  };
  const onSubmit = (data: ExerciseParameters) => {
    if (!data.allowedDur || data.allowedDur.length === 0) {
      return;
    }
    console.log('🎵 PARAMETER FORM SUBMISSION:', {
      key: data.key,
      timeSignature: data.time,
      measures: data.numMeasures,
      durations: data.allowedDur,
      bpm: data.bpm,
      allowDots: data.allowDots,
      cadenceEvery: data.cadenceEvery,
      cadenceType: data.cadenceType,
      intervalMotion: data.intervalMotion,
      enforceVoiceLeading: data.enforceVoiceLeading,
      requireResolution: data.requireResolution,
      strongBeatCadence: data.strongBeatCadence,
      maxInterval: data.maxInterval,
      stepwiseMotionPercentage: data.stepwiseMotionPercentage
    });
    onGenerate(data);
  };
  return <Card className="w-full">
      <CardContent className="p-3 space-y-3">
        <form className="space-y-3">
          {/* Row 1: Key, Mode, Time, and Measures */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Key</Label>
              <Select value={watchedKey.tonic} onValueChange={value => setValue('key.tonic', value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  {tonics.map(tonic => <SelectItem key={tonic} value={tonic}>{tonic}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Mode</Label>
              <Select value={watchedKey.mode} onValueChange={value => setValue('key.mode', value as "major" | "minor")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {modes.map(mode => <SelectItem key={mode} value={mode}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Time</Label>
              <Select value={`${watchedTime.num}/${watchedTime.den}`} onValueChange={value => {
              const [num, den] = value.split('/').map(Number);
              setValue('time', {
                num,
                den: den as 1 | 2 | 4 | 8 | 16
              });
            }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {timeSignatures.map(time => <SelectItem key={`${time.num}/${time.den}`} value={`${time.num}/${time.den}`}>
                      {time.num}/{time.den}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Measures</Label>
              <Select value={watchedNumMeasures.toString()} onValueChange={value => setValue('numMeasures', parseInt(value))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {measureOptions.map(measure => <SelectItem key={measure} value={measure.toString()}>{measure}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Parts and BPM */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Parts</Label>
              <Select value={watchedParts?.length === 1 ? "soprano" : "soprano-alto"} onValueChange={value => {
              if (value === "soprano") {
                setValue('parts', [{
                  role: "S",
                  range: {
                    min: "C4",
                    max: "C5"
                  }
                }]);
              } else {
                setValue('parts', [{
                  role: "S",
                  range: {
                    min: "C4",
                    max: "C5"
                  }
                }, {
                  role: "A",
                  range: {
                    min: "F3",
                    max: "F4"
                  }
                }]);
              }
            }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="soprano">Soprano Only</SelectItem>
                  <SelectItem value="soprano-alto">Soprano + Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">BPM</Label>
              <Select value={watchedBpm.toString()} onValueChange={value => setValue('bpm', parseInt(value))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {bpmOptions.map(bpm => <SelectItem key={bpm} value={bpm.toString()}>{bpm}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Cadence Every and Type */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Cadence Every</Label>
              <Select value={watchedCadenceEvery.toString()} onValueChange={value => setValue('cadenceEvery', parseInt(value))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {cadenceOptions.map(cadence => <SelectItem key={cadence} value={cadence.toString()}>
                      {cadence} bars
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Cadence Type</Label>
              <Select value={watch('cadenceType') || 'authentic'} onValueChange={value => setValue('cadenceType', value as 'authentic' | 'half' | 'plagal' | 'deceptive')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {cadenceTypes.map(type => <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checkbox Options */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-1">
              <Checkbox id="allowDots" checked={watchedAllowDots} onCheckedChange={checked => setValue('allowDots', !!checked)} />
              <Label htmlFor="allowDots" className="text-xs">Dotted Notes</Label>
            </div>
            <div className="flex items-center space-x-1">
              <Checkbox id="enforceVoiceLeading" checked={watch('enforceVoiceLeading') ?? true} onCheckedChange={checked => setValue('enforceVoiceLeading', !!checked)} />
              <Label htmlFor="enforceVoiceLeading" className="text-xs">Voice Leading</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-1">
              <Checkbox id="requireResolution" checked={watch('requireResolution') ?? true} onCheckedChange={checked => setValue('requireResolution', !!checked)} />
              <Label htmlFor="requireResolution" className="text-xs">Resolve Tendencies</Label>
            </div>
            <div className="flex items-center space-x-1">
              <Checkbox id="strongBeatCadence" checked={watch('strongBeatCadence') ?? true} onCheckedChange={checked => setValue('strongBeatCadence', !!checked)} />
              <Label htmlFor="strongBeatCadence" className="text-xs">Strong Beat Cadence</Label>
            </div>
          </div>

          {/* Note Values Selection */}
          <div className="space-y-1">
            
            <div className="flex flex-wrap gap-1">
              {durations.map(duration => <Badge key={duration} variant={watchedAllowedDur?.includes(duration as any) ? "default" : "outline"} className="cursor-pointer text-xs px-2 py-1 h-6" onClick={() => handleDurationToggle(duration)}>
                  {duration === '16th' ? '16th' : duration.charAt(0).toUpperCase()}
                </Badge>)}
            </div>
          </div>

          {/* Motion Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Motion Types</Label>
            <div className="flex flex-wrap gap-1">
              {motions.map(motion => <Badge key={motion} variant={watchedIntervalMotion?.includes(motion as any) ? "default" : "outline"} className="cursor-pointer text-xs px-2 py-1 h-6" onClick={() => handleMotionToggle(motion)}>
                  {motion.charAt(0).toUpperCase() + motion.slice(1)}
                </Badge>)}
            </div>
          </div>
        </form>
        
        {/* Action Buttons */}
        <div className="pt-2 border-t space-y-2">
          <Button onClick={handleSubmit(onSubmit)} size="sm" className="w-full h-10 text-sm font-medium" disabled={isGenerating || !watchedAllowedDur || watchedAllowedDur.length === 0 || !watchedIntervalMotion || watchedIntervalMotion.length === 0}>
            {isGenerating ? 'Generating...' : '🎵 Generate Exercise'}
          </Button>
          
          {hasExercise && onReset && <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs" onClick={onReset} disabled={isGenerating}>
              🔄 Reset
            </Button>}
        </div>
      </CardContent>
    </Card>;
};