import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingProfile } from '@/hooks/useOnboardingProfile';

interface UniformMediaFormProps {
  profile: OnboardingProfile;
  onUpdate: (field: keyof OnboardingProfile, value: any) => void;
  saving?: boolean;
}

export const UniformMediaForm = ({ profile, onUpdate, saving }: UniformMediaFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uniform & Media Information</CardTitle>
        <CardDescription>
          We need your measurements for uniform fitting and concert attire.
          {saving && <span className="text-muted-foreground text-sm ml-2">Saving...</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Body Measurements</h3>
          <p className="text-sm text-muted-foreground">
            These measurements help us provide properly fitting concert attire.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height_feet">Height (feet)</Label>
              <Input
                id="height_feet"
                type="number"
                min="4"
                max="7"
                value={profile.measurements?.height_feet || ''}
                onChange={(e) => onUpdate('measurements', {
                  ...profile.measurements,
                  height_feet: parseInt(e.target.value) || undefined
                })}
                placeholder="5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height_inches">Height (inches)</Label>
              <Input
                id="height_inches"
                type="number"
                min="0"
                max="11"
                value={profile.measurements?.height_inches || ''}
                onChange={(e) => onUpdate('measurements', {
                  ...profile.measurements,
                  height_inches: parseInt(e.target.value) || undefined
                })}
                placeholder="6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shoe_size">Shoe Size (US)</Label>
              <Input
                id="shoe_size"
                type="number"
                step="0.5"
                min="4"
                max="15"
                value={profile.measurements?.shoe_size || ''}
                onChange={(e) => onUpdate('measurements', {
                  ...profile.measurements,
                  shoe_size: parseFloat(e.target.value) || undefined
                })}
                placeholder="8.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chest">Chest/Bust (inches)</Label>
              <Input
                id="chest"
                type="number"
                min="24"
                max="60"
                step="0.5"
                value={profile.measurements?.chest || ''}
                onChange={(e) => onUpdate('measurements', {
                  ...profile.measurements,
                  chest: parseFloat(e.target.value) || undefined
                })}
                placeholder="36"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waist">Waist (inches)</Label>
              <Input
                id="waist"
                type="number"
                min="20"
                max="60"
                step="0.5"
                value={profile.measurements?.waist || ''}
                onChange={(e) => onUpdate('measurements', {
                  ...profile.measurements,
                  waist: parseFloat(e.target.value) || undefined
                })}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hips">Hips (inches)</Label>
              <Input
                id="hips"
                type="number"
                min="24"
                max="60"
                step="0.5"
                value={profile.measurements?.hips || ''}
                onChange={(e) => onUpdate('measurements', {
                  ...profile.measurements,
                  hips: parseFloat(e.target.value) || undefined
                })}
                placeholder="38"
              />
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Measurement Guidelines</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Measure chest/bust at the fullest part</li>
            <li>• Waist measurement at the narrowest part</li>
            <li>• Hip measurement at the fullest part</li>
            <li>• All measurements in inches for accuracy</li>
            <li>• Height should be entered as separate feet and inches (e.g., 5 feet 6 inches)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};