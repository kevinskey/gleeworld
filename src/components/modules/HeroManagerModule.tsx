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
        <p className="text-muted-foreground mb-4">Manage hero images for the landing page carousel. Upload desktop, tablet, and mobile versions for optimal display.</p>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Upload images for different screen sizes
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Configure text positioning and buttons
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Manage slide order and activation
          </div>
        </div>
      </CardContent>
    </Card>
  );
};