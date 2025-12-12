import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationSoundManager } from '@/components/admin/NotificationSoundManager';
import { Music } from 'lucide-react';

export const NotificationSoundsModule = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Notification Sounds
          </CardTitle>
          <CardDescription>
            Generate and manage custom notification sounds using ElevenLabs AI Sound Effects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Create unique, branded notification sounds for GleeWorld. Each sound type can have its own 
            distinctive audio that plays when notifications are triggered. Sounds are generated once 
            and stored for all users to hear.
          </p>
        </CardContent>
      </Card>
      
      <NotificationSoundManager />
    </div>
  );
};
