import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MusicalNotation, getNoteSymbol, getRestSymbol } from '@/components/ui/musical-notation';
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
      level: 1,
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
          max: "G5"
        }
      }],
      allowedDur: ["quarter"],
      allowedRests: ["quarter"],
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
  const watchedLevel = watch('level') ?? 1;
  const watchedKey = watch('key');
  const watchedTime = watch('time');
  const watchedNumMeasures = watch('numMeasures');
  const watchedParts = watch('parts');
  const watchedAllowedDur = watch('allowedDur');
  const watchedAllowedRests = watch('allowedRests');
  const watchedAllowDots = watch('allowDots');
  const watchedIntervalMotion = watch('intervalMotion');
  const watchedCadenceEvery = watch('cadenceEvery');
  const watchedBpm = watch('bpm');
  const tonics = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
  // Restricted to major + minor: the edge function only knows how to
  // compute fifths for these two. The previously-listed church modes
  // (dorian, phrygian, etc.) silently fell back to C major, so the
  // generator emitted exercises with no key signature regardless of
  // what the user picked.
  const modes = ["major", "minor"];
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
  const durations = ["whole", "half", "quarter", "eighth", "16th", "32nd"];
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
  
  const handleRestToggle = (restType: string) => {
    const current = watchedAllowedRests || [];
    if (current.includes(restType as any)) {
      const newRests = current.filter(r => r !== restType);
      setValue('allowedRests', newRests);
    } else {
      setValue('allowedRests', [...current, restType as any]);
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
      rests: data.allowedRests,
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
      <CardContent className="p-2 sm:p-3 space-y-2 sm:space-y-3">
        <form className="space-y-2 sm:space-y-3">
          {/* Difficulty level — drives the rule-based generator. Each
              level is a fixed set of constraints (range, max melodic
              step, allowed durations), so the result is deterministic
              and pedagogically calibrated. */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Difficulty level</Label>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const labels: Record<number, string> = {
                  1: 'Beginner', 2: 'Easy', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert',
                };
                const descriptions: Record<number, string> = {
                  1: 'Octave range · stepwise only · ¼ + ½',
                  2: 'Octave range · up to 3rd · adds ♪',
                  3: '10th range · up to 5th · adds 𝅝',
                  4: '12th range · up to 7th · adds ♬',
                  5: 'Full range · any leap · all rhythms',
                };
                const active = watchedLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setValue('level', lvl as 1 | 2 | 3 | 4 | 5)}
                    title={descriptions[lvl]}
                    className={`h-12 rounded-md text-xs font-semibold flex flex-col items-center justify-center transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-foreground hover:bg-primary/15'
                    }`}
                  >
                    <span className="text-base leading-tight">{lvl}</span>
                    <span className={`text-[9px] uppercase tracking-wider leading-tight ${active ? '' : 'text-muted-foreground'}`}>
                      {labels[lvl]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground italic leading-tight">
              {watchedLevel === 1 && 'Beginner: octave range, stepwise motion only, quarter + half notes. Always starts and ends on tonic.'}
              {watchedLevel === 2 && 'Easy: octave range, steps + occasional 3rds, adds eighth notes.'}
              {watchedLevel === 3 && 'Intermediate: 10th range, leaps up to a 5th, adds whole notes.'}
              {watchedLevel === 4 && 'Advanced: 12th range, leaps up to a 7th, adds sixteenth notes.'}
              {watchedLevel === 5 && 'Expert: full range, any leap, all rhythm subdivisions.'}
            </p>
          </div>

          {/* Row 1: Key, Mode, Time, and Measures */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Key</Label>
              <Select value={watchedKey.tonic} onValueChange={value => setValue('key.tonic', value)}>
                <SelectTrigger className="h-11 !text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  {tonics.map(tonic => <SelectItem key={tonic} value={tonic}>{tonic}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Mode</Label>
              <Select value={watchedKey.mode} onValueChange={value => setValue('key.mode', value as "major" | "minor")}>
                <SelectTrigger className="h-11 !text-base">
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
              <Label className="text-sm font-medium">Time</Label>
              <Select value={`${watchedTime.num}/${watchedTime.den}`} onValueChange={value => {
              const [num, den] = value.split('/').map(Number);
              setValue('time', {
                num,
                den: den as 1 | 2 | 4 | 8 | 16
              });
            }}>
                <SelectTrigger className="h-11 !text-base">
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
              <Label className="text-sm font-medium">Measures</Label>
              <Select value={watchedNumMeasures.toString()} onValueChange={value => setValue('numMeasures', parseInt(value))}>
                <SelectTrigger className="h-11 !text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {measureOptions.map(measure => <SelectItem key={measure} value={measure.toString()}>{measure}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Parts and BPM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Parts</Label>
              <Select value={
                watchedParts?.length === 1 && watchedParts[0].role === "S" ? "S" :
                watchedParts?.length === 1 && watchedParts[0].role === "A" ? "A" :
                watchedParts?.length === 2 ? "SA" : "S"
              } onValueChange={value => {
                if (value === "S") {
                  setValue('parts', [{
                    role: "S",
                    range: {
                      min: "C4",
                      max: "G5"
                    }
                  }]);
                } else if (value === "A") {
                  setValue('parts', [{
                    role: "A",
                    range: {
                      min: "G3",
                      max: "C5"
                    }
                  }]);
                } else if (value === "SA") {
                  setValue('parts', [{
                    role: "S",
                    range: {
                      min: "C4",
                      max: "G5"
                    }
                  }, {
                    role: "A",
                    range: {
                      min: "G3",
                      max: "C5"
                    }
                  }]);
                }
              }}>
                <SelectTrigger className="h-11 !text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="S">Soprano (S)</SelectItem>
                  <SelectItem value="A">Alto (A)</SelectItem>
                  <SelectItem value="SA">Soprano + Alto (SA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">BPM</Label>
              <Select value={watchedBpm.toString()} onValueChange={value => setValue('bpm', parseInt(value))}>
                <SelectTrigger className="h-11 !text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {bpmOptions.map(bpm => <SelectItem key={bpm} value={bpm.toString()}>{bpm}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Cadence Every and Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Cadence Every</Label>
              <Select value={watchedCadenceEvery.toString()} onValueChange={value => setValue('cadenceEvery', parseInt(value))}>
                <SelectTrigger className="h-11 !text-base">
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
              <Label className="text-sm font-medium">Cadence Type</Label>
              <Select value={watch('cadenceType') || 'authentic'} onValueChange={value => setValue('cadenceType', value as 'authentic' | 'half' | 'plagal' | 'deceptive')}>
                <SelectTrigger className="h-11 !text-base">
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

          {/* Single user-controlled option left in this band.
              `enforceVoiceLeading`, `requireResolution`, and
              `strongBeatCadence` were removed 2026-06-19 — the new
              rule-based generator always enforces them, so the toggles
              were vestigial and crowded the form. They remain in
              defaultValues so any stored exercises keep working. */}
          <div className="flex items-center space-x-1">
            <Checkbox id="allowDots" checked={watchedAllowDots} onCheckedChange={checked => setValue('allowDots', !!checked)} />
            <Label htmlFor="allowDots" className="text-xs">Dotted Notes</Label>
          </div>

          {/* Note Values / Rest Values / Motion Types — three groups
              on one row at any width above phone portrait. The form
              lives in a sidebar on tablet/desktop, so the previous
              `lg:` breakpoint (1024px) never actually triggered. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Note Values</Label>
              <div className="flex flex-wrap gap-1">
                {durations.map((duration) => (
                  <Badge
                    key={duration}
                    variant={watchedAllowedDur?.includes(duration as any) ? "default" : "outline"}
                    className="cursor-pointer px-1.5 py-1 h-11 w-11 flex items-center justify-center overflow-hidden"
                    onClick={() => handleDurationToggle(duration)}
                  >
                    <MusicalNotation symbol={getNoteSymbol(duration)} className="text-base leading-none" />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">Rest Values</Label>
              <div className="flex flex-wrap gap-1">
                {durations.map((restType) => (
                  <Badge
                    key={`rest-${restType}`}
                    variant={watchedAllowedRests?.includes(restType as any) ? "default" : "outline"}
                    className="cursor-pointer px-1.5 py-1 h-11 w-11 flex items-center justify-center overflow-hidden"
                    onClick={() => handleRestToggle(restType)}
                  >
                    <MusicalNotation symbol={getRestSymbol(restType)} className="text-base leading-none" />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">Motion Types</Label>
              <div className="flex flex-wrap gap-1">
                {motions.map((motion) => (
                  <Badge
                    key={motion}
                    variant={watchedIntervalMotion?.includes(motion as any) ? "default" : "outline"}
                    className="cursor-pointer text-xs px-2 py-1 h-9 flex items-center"
                    onClick={() => handleMotionToggle(motion)}
                  >
                    {motion.charAt(0).toUpperCase() + motion.slice(1)}
                  </Badge>
                ))}
              </div>
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