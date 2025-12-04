/**
 * ANNOUNCEMENT STYLE SELECTOR
 * 
 * Allows users to choose how announcements are displayed: 
 * scrolling ticker, flip animation, or slide left/right.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Megaphone, ArrowRight, ArrowLeft, RotateCw, MoveHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getAnnouncementStyle, 
  setAnnouncementStyle, 
  AnnouncementDisplayStyle 
} from '@/components/dashboard/AnnouncementsDisplay';

const styles: { id: AnnouncementDisplayStyle; name: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'slide-left',
    name: 'Slide Left',
    description: 'Announcements slide in from the right and exit to the left',
    icon: <ArrowLeft className="h-5 w-5" />
  },
  {
    id: 'slide-right',
    name: 'Slide Right',
    description: 'Announcements slide in from the left and exit to the right',
    icon: <ArrowRight className="h-5 w-5" />
  },
  {
    id: 'flip',
    name: 'Flip Up',
    description: 'Announcements flip up like a slot machine',
    icon: <RotateCw className="h-5 w-5" />
  },
  {
    id: 'ticker',
    name: 'Scrolling Ticker',
    description: 'Announcements scroll continuously across the screen',
    icon: <MoveHorizontal className="h-5 w-5" />
  }
];

export function AnnouncementStyleSelector() {
  const { toast } = useToast();
  const [currentStyle, setCurrentStyle] = useState<AnnouncementDisplayStyle>(getAnnouncementStyle);

  useEffect(() => {
    const handleStyleChange = (e: CustomEvent<AnnouncementDisplayStyle>) => {
      setCurrentStyle(e.detail);
    };

    window.addEventListener('announcement-style-change', handleStyleChange as EventListener);
    return () => {
      window.removeEventListener('announcement-style-change', handleStyleChange as EventListener);
    };
  }, []);

  const handleStyleSelect = (style: AnnouncementDisplayStyle) => {
    setAnnouncementStyle(style);
    setCurrentStyle(style);
    toast({
      title: 'Announcement Style Updated',
      description: `Your announcements will now display with ${styles.find(s => s.id === style)?.name}.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Announcement Display Style
        </CardTitle>
        <CardDescription>
          Choose how announcements appear on your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Style Display */}
        <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Style</p>
              <p className="text-lg font-bold">{styles.find(s => s.id === currentStyle)?.name || 'Slide Left'}</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Active
            </Badge>
          </div>
        </div>

        {/* Style Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {styles.map((style) => {
            const isSelected = style.id === currentStyle;

            return (
              <Card
                key={style.id}
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-primary shadow-md' : ''
                }`}
                onClick={() => handleStyleSelect(style.id)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                )}

                {/* Style Preview */}
                <div className="h-16 rounded-t-lg bg-muted flex items-center justify-center">
                  {style.icon}
                </div>

                {/* Style Info */}
                <CardContent className="pt-3 pb-3">
                  <div className="space-y-1">
                    <h3 className="font-bold">{style.name}</h3>
                    <p className="text-xs text-muted-foreground">{style.description}</p>
                  </div>
                </CardContent>

                {/* Select Button */}
                {!isSelected && (
                  <div className="px-4 pb-3">
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStyleSelect(style.id);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
