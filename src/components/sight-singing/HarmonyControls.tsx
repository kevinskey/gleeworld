import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface HarmonySettings {
  // Melodic and harmonic controls
  maxInterval: number;
  avoidedIntervals: number[];
  stepwiseMotionPercentage: number;
  
  // Phrase and cadence controls
  cadenceEvery: number;
  cadenceTypes: string[];
  phraseStructure: string;
  
  // Voice leading and melodic rules
  enforceVoiceLeading: boolean;
  allowDirectMotion: boolean;
  requireResolution: boolean;
  melodicRange: { min: number; max: number };
  
  // Advanced controls
  harmonicRhythm?: number;
  sequencePattern: boolean;
}

interface HarmonyControlsProps {
  settings: HarmonySettings;
  onChange: (settings: HarmonySettings) => void;
  isAdvancedMode: boolean;
  onToggleAdvanced: () => void;
}

const intervalNames = {
  1: 'Unison',
  2: 'Minor 2nd',
  3: 'Major 2nd',
  4: 'Minor 3rd',
  5: 'Major 3rd',
  6: 'Perfect 4th',
  7: 'Tritone',
  8: 'Perfect 5th',
  9: 'Minor 6th',
  10: 'Major 6th',
  11: 'Minor 7th',
  12: 'Major 7th'
};

const scaleDegreeNames = {
  1: 'Tonic (1)',
  2: 'Supertonic (2)',
  3: 'Mediant (3)',
  4: 'Subdominant (4)',
  5: 'Dominant (5)',
  6: 'Submediant (6)',
  7: 'Leading tone (7)',
  8: 'Octave (8)'
};

export const HarmonyControls: React.FC<HarmonyControlsProps> = ({
  settings,
  onChange,
  isAdvancedMode,
  onToggleAdvanced
}) => {
  const updateSettings = (updates: Partial<HarmonySettings>) => {
    onChange({ ...settings, ...updates });
  };

  const toggleAvoidedInterval = (interval: number) => {
    const newAvoidedIntervals = settings.avoidedIntervals.includes(interval)
      ? settings.avoidedIntervals.filter(i => i !== interval)
      : [...settings.avoidedIntervals, interval];
    updateSettings({ avoidedIntervals: newAvoidedIntervals });
  };

  const addCadenceType = (type: string) => {
    if (!settings.cadenceTypes.includes(type)) {
      updateSettings({ cadenceTypes: [...settings.cadenceTypes, type] });
    }
  };

  const removeCadenceType = (type: string) => {
    updateSettings({ 
      cadenceTypes: settings.cadenceTypes.filter(t => t !== type)
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tonal Harmony Controls</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAdvanced}
        >
          {isAdvancedMode ? 'Simple' : 'Advanced'} Mode
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Basic Melodic Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Melodic Structure</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Max Interval Size</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum melodic interval allowed (in semitones)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select 
                value={settings.maxInterval.toString()} 
                onValueChange={(value) => updateSettings({ maxInterval: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(intervalNames).map(([semitones, name]) => (
                    <SelectItem key={semitones} value={semitones}>
                      {name} ({semitones} semitones)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Stepwise Motion</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Percentage of intervals that should be stepwise (1-2 semitones)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="px-2">
                <Slider
                  value={[settings.stepwiseMotionPercentage]}
                  onValueChange={([value]) => updateSettings({ stepwiseMotionPercentage: value })}
                  max={100}
                  min={0}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="font-medium">{settings.stepwiseMotionPercentage}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Melodic Range</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Scale degree range for the melody</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={settings.melodicRange.min.toString()} 
                onValueChange={(value) => updateSettings({ 
                  melodicRange: { ...settings.melodicRange, min: parseInt(value) }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(scaleDegreeNames).map(([degree, name]) => (
                    <SelectItem key={degree} value={degree}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={settings.melodicRange.max.toString()} 
                onValueChange={(value) => updateSettings({ 
                  melodicRange: { ...settings.melodicRange, max: parseInt(value) }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(scaleDegreeNames).map(([degree, name]) => (
                    <SelectItem key={degree} value={degree}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Cadence Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Cadence & Phrase Structure</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Cadence Frequency</Label>
              <Select 
                value={settings.cadenceEvery.toString()} 
                onValueChange={(value) => updateSettings({ cadenceEvery: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Every 2 measures</SelectItem>
                  <SelectItem value="4">Every 4 measures</SelectItem>
                  <SelectItem value="8">Every 8 measures</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Phrase Structure</Label>
              <Select 
                value={settings.phraseStructure} 
                onValueChange={(value) => updateSettings({ phraseStructure: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced phrases</SelectItem>
                  <SelectItem value="aaba">AABA form</SelectItem>
                  <SelectItem value="abac">ABAC form</SelectItem>
                  <SelectItem value="binary">Binary form</SelectItem>
                  <SelectItem value="through">Through-composed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Cadence Types</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {settings.cadenceTypes.map(type => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => removeCadenceType(type)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Select onValueChange={addCadenceType}>
              <SelectTrigger>
                <SelectValue placeholder="Add cadence type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="authentic">Authentic (V-I)</SelectItem>
                <SelectItem value="half">Half cadence (to V)</SelectItem>
                <SelectItem value="plagal">Plagal (IV-I)</SelectItem>
                <SelectItem value="deceptive">Deceptive (V-vi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Controls */}
        {isAdvancedMode && (
          <>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Voice Leading Rules</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enforceVoiceLeading"
                    checked={settings.enforceVoiceLeading}
                    onCheckedChange={(checked) => updateSettings({ enforceVoiceLeading: checked as boolean })}
                  />
                  <Label htmlFor="enforceVoiceLeading" className="text-sm">
                    Enforce voice leading rules
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowDirectMotion"
                    checked={settings.allowDirectMotion}
                    onCheckedChange={(checked) => updateSettings({ allowDirectMotion: checked as boolean })}
                  />
                  <Label htmlFor="allowDirectMotion" className="text-sm">
                    Allow direct motion to perfect intervals
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireResolution"
                    checked={settings.requireResolution}
                    onCheckedChange={(checked) => updateSettings({ requireResolution: checked as boolean })}
                  />
                  <Label htmlFor="requireResolution" className="text-sm">
                    Require tendency tone resolution
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sequencePattern"
                    checked={settings.sequencePattern}
                    onCheckedChange={(checked) => updateSettings({ sequencePattern: checked as boolean })}
                  />
                  <Label htmlFor="sequencePattern" className="text-sm">
                    Use melodic sequences
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Interval Restrictions</h3>
              
              <div className="space-y-2">
                <Label className="text-sm">Avoid These Intervals</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(intervalNames).map(([semitones, name]) => (
                    <div key={semitones} className="flex items-center space-x-2">
                      <Checkbox
                        id={`avoid-${semitones}`}
                        checked={settings.avoidedIntervals.includes(parseInt(semitones))}
                        onCheckedChange={() => toggleAvoidedInterval(parseInt(semitones))}
                      />
                      <Label htmlFor={`avoid-${semitones}`} className="text-xs">
                        {name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {settings.harmonicRhythm !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Harmonic Rhythm</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How often the implied harmony changes (in beats)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select 
                  value={settings.harmonicRhythm.toString()} 
                  onValueChange={(value) => updateSettings({ harmonicRhythm: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every beat</SelectItem>
                    <SelectItem value="2">Every 2 beats</SelectItem>
                    <SelectItem value="4">Every measure</SelectItem>
                    <SelectItem value="8">Every 2 measures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};