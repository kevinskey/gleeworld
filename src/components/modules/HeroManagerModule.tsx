import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera } from 'lucide-react';

export const HeroManagerModule = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Hero Manager
        </CardTitle>
        <CardDescription>
          Manage hero images and carousel content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Hero image and carousel management system coming soon.</p>
      </CardContent>
    </Card>
  );
};