import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Music, Sparkles } from 'lucide-react';
import type { ExerciseParameters } from './SightSingingStudio';

interface ParameterFormProps {
  onGenerate: (parameters: ExerciseParameters) => void;
  isGenerating: boolean;
}

export const ParameterForm: React.FC<ParameterFormProps> = ({
  onGenerate,
  isGenerating
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ExerciseParameters>({
    defaultValues: {
      keySignature: 'C major',
      timeSignature: '4/4',
      tempo: 120,
      measures: 4,
      register: 'soprano',
      pitchRangeMin: 'C4',
      pitchRangeMax: 'C5',
      motionTypes: ['stepwise'],
      noteLengths: ['quarter', 'half'],
      difficultyLevel: 2,
      title: 'Sight-Singing Exercise'
    }
  });

  const watchedValues = watch();

  const keySignatures = [
    'C major', 'G major', 'D major', 'A major', 'E major', 'B major', 'F# major',
    'C# major', 'F major', 'Bb major', 'Eb major', 'Ab major', 'Db major', 'Gb major',
    'Cb major', 'A minor', 'E minor', 'B minor', 'F# minor', 'C# minor', 'G# minor',
    'D# minor', 'A# minor', 'D minor', 'G minor', 'C minor', 'F minor', 'Bb minor',
    'Eb minor', 'Ab minor'
  ];

  const timeSignatures = ['4/4', '3/4', '2/4', '6/8', '9/8', '12/8'];

  const registers = [
    { value: 'soprano', label: 'Soprano (C4-C6)' },
    { value: 'alto', label: 'Alto (G3-G5)' },
    { value: 'tenor', label: 'Tenor (C3-C5)' },
    { value: 'bass', label: 'Bass (E2-E4)' }
  ];

  const motionOptions = [
    { value: 'stepwise', label: 'Stepwise motion' },
    { value: 'thirds', label: 'Thirds' },
    { value: 'fourths', label: 'Fourths' },
    { value: 'fifths', label: 'Fifths' },
    { value: 'sevenths', label: 'Sevenths' },
    { value: 'octaves', label: 'Octaves' }
  ];

  const noteLengthOptions = [
    { value: 'whole', label: 'Whole notes' },
    { value: 'half', label: 'Half notes' },
    { value: 'quarter', label: 'Quarter notes' },
    { value: 'eighth', label: 'Eighth notes' },
    { value: 'sixteenth', label: 'Sixteenth notes' }
  ];

  const handleMotionTypeChange = (motionType: string, checked: boolean) => {
    const current = watchedValues.motionTypes || [];
    if (checked) {
      setValue('motionTypes', [...current, motionType]);
    } else {
      setValue('motionTypes', current.filter(t => t !== motionType));
    }
  };

  const handleNoteLengthChange = (noteLength: string, checked: boolean) => {
    const current = watchedValues.noteLengths || [];
    if (checked) {
      const newLengths = [...current, noteLength];
      setValue('noteLengths', newLengths);
      console.log('Added note length:', noteLength, 'Current selections:', newLengths);
    } else {
      const newLengths = current.filter(l => l !== noteLength);
      setValue('noteLengths', newLengths);
      console.log('Removed note length:', noteLength, 'Current selections:', newLengths);
    }
  };

  const onSubmit = (data: ExerciseParameters) => {
    console.log('Form submission - Note lengths selected:', data.noteLengths);
    onGenerate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Exercise Parameters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Exercise Title</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="My Sight-Singing Exercise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keySignature">Key Signature</Label>
              <Select 
                value={watchedValues.keySignature} 
                onValueChange={(value) => setValue('keySignature', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {keySignatures.map(key => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeSignature">Time Signature</Label>
              <Select 
                value={watchedValues.timeSignature} 
                onValueChange={(value) => setValue('timeSignature', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSignatures.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempo">Tempo (BPM)</Label>
              <Input
                id="tempo"
                type="number"
                min="60"
                max="200"
                {...register('tempo', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="measures">Number of Measures</Label>
              <Input
                id="measures"
                type="number"
                min="2"
                max="16"
                {...register('measures', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register">Voice Register</Label>
              <Select 
                value={watchedValues.register} 
                onValueChange={(value) => setValue('register', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {registers.map(register => (
                    <SelectItem key={register.value} value={register.value}>
                      {register.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pitch Range */}
          <div className="space-y-4">
            <Label>Pitch Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pitchRangeMin">Lowest Note</Label>
                <Input
                  id="pitchRangeMin"
                  {...register('pitchRangeMin')}
                  placeholder="C4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pitchRangeMax">Highest Note</Label>
                <Input
                  id="pitchRangeMax"
                  {...register('pitchRangeMax')}
                  placeholder="C5"
                />
              </div>
            </div>
          </div>

          {/* Motion Types */}
          <div className="space-y-4">
            <Label>Motion Types</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {motionOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`motion-${option.value}`}
                    checked={watchedValues.motionTypes?.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleMotionTypeChange(option.value, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`motion-${option.value}`}
                    className="text-sm font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Note Lengths */}
          <div className="space-y-4">
            <Label>Note Lengths (Current: {watchedValues.noteLengths?.join(', ') || 'None'})</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {noteLengthOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`length-${option.value}`}
                    checked={watchedValues.noteLengths?.includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleNoteLengthChange(option.value, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`length-${option.value}`}
                    className="text-sm font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-4">
            <Label>Difficulty Level: {watchedValues.difficultyLevel}/5</Label>
            <Slider
              value={[watchedValues.difficultyLevel]}
              onValueChange={([value]) => setValue('difficultyLevel', value)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Advanced</span>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isGenerating || !watchedValues.motionTypes?.length || !watchedValues.noteLengths?.length}
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating Exercise...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Exercise
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};