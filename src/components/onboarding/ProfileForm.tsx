import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingProfile } from '@/hooks/useOnboardingProfile';

interface ProfileFormProps {
  profile: OnboardingProfile;
  onUpdate: (field: keyof OnboardingProfile, value: any) => void;
  saving?: boolean;
}

export const ProfileForm = ({ profile, onUpdate, saving }: ProfileFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Tell us about yourself. All fields are optional, but completing them helps us serve you better.
          {saving && <span className="text-muted-foreground text-sm ml-2">Saving...</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={profile.first_name || ''}
              onChange={(e) => onUpdate('first_name', e.target.value)}
              placeholder="Your first name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={profile.last_name || ''}
              onChange={(e) => onUpdate('last_name', e.target.value)}
              placeholder="Your last name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred_name">Preferred Name</Label>
          <Input
            id="preferred_name"
            value={profile.preferred_name || ''}
            onChange={(e) => onUpdate('preferred_name', e.target.value)}
            placeholder="What should we call you?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pronouns">Pronouns</Label>
            <Select
              value={profile.pronouns || ''}
              onValueChange={(value) => onUpdate('pronouns', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pronouns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="she/her">She/Her</SelectItem>
                <SelectItem value="he/him">He/Him</SelectItem>
                <SelectItem value="they/them">They/Them</SelectItem>
                <SelectItem value="she/they">She/They</SelectItem>
                <SelectItem value="he/they">He/They</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grad_year">Graduation Year</Label>
            <Input
              id="grad_year"
              type="number"
              min="2024"
              max="2030"
              value={profile.grad_year || ''}
              onChange={(e) => onUpdate('grad_year', parseInt(e.target.value) || null)}
              placeholder="2025"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ''}
              onChange={(e) => onUpdate('email', e.target.value)}
              placeholder="your.email@spelman.edu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => onUpdate('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="voice_part">Voice Part</Label>
            <Select
              value={profile.voice_part || ''}
              onValueChange={(value) => onUpdate('voice_part', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S1">Soprano 1</SelectItem>
                <SelectItem value="S2">Soprano 2</SelectItem>
                <SelectItem value="A1">Alto 1</SelectItem>
                <SelectItem value="A2">Alto 2</SelectItem>
                <SelectItem value="T1">Tenor 1</SelectItem>
                <SelectItem value="T2">Tenor 2</SelectItem>
                <SelectItem value="B1">Bass 1</SelectItem>
                <SelectItem value="B2">Bass 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Select
              value={profile.section || ''}
              onValueChange={(value) => onUpdate('section', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soprano">Soprano</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="tenor">Tenor</SelectItem>
                <SelectItem value="bass">Bass</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};