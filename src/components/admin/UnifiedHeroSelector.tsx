import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Image, Layout, Newspaper, Users, Monitor } from "lucide-react";

export interface HeroContext {
  id: string;
  label: string;
  description: string;
  table: 'gw_hero_slides' | 'dashboard_hero_slides' | 'alumnae_newsletter_hero_slides' | 'advertising_hero';
  usageContext?: string;
  icon: React.ReactNode;
  slideCount?: number;
}

const HERO_CONTEXTS: HeroContext[] = [
  {
    id: 'public-landing-top',
    label: 'Public Landing Hero Top',
    description: 'Main hero carousel on the public homepage',
    table: 'gw_hero_slides',
    usageContext: 'homepage',
    icon: <Layout className="h-4 w-4" />
  },
  {
    id: 'press-kit',
    label: 'Press Kit Hero',
    description: 'Hero section for the press kit page',
    table: 'gw_hero_slides',
    usageContext: 'press_kit',
    icon: <Newspaper className="h-4 w-4" />
  },
  {
    id: 'member-dashboard',
    label: 'Member Dashboard Hero',
    description: 'Hero carousel for logged-in member dashboard',
    table: 'dashboard_hero_slides',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'advertising',
    label: 'Advertising Hero',
    description: 'Promotional banners and advertisements',
    table: 'advertising_hero',
    icon: <Monitor className="h-4 w-4" />
  }
];

interface UnifiedHeroSelectorProps {
  selectedContext: string;
  onContextChange: (context: HeroContext) => void;
  slideCounts?: Record<string, number>;
}

export const UnifiedHeroSelector = ({ 
  selectedContext, 
  onContextChange,
  slideCounts = {}
}: UnifiedHeroSelectorProps) => {
  const selectedHero = HERO_CONTEXTS.find(h => h.id === selectedContext) || HERO_CONTEXTS[0];

  return (
    <div className="w-full">
      <Select 
        value={selectedContext} 
        onValueChange={(value) => {
          const context = HERO_CONTEXTS.find(h => h.id === value);
          if (context) onContextChange(context);
        }}
      >
        <SelectTrigger className="w-full h-14 bg-background border-2 border-border hover:border-primary/50 transition-colors">
          <SelectValue>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {selectedHero.icon}
              </div>
              <div className="text-left">
                <div className="font-medium">{selectedHero.label}</div>
                <div className="text-xs text-muted-foreground">{selectedHero.description}</div>
              </div>
              {slideCounts[selectedContext] !== undefined && (
                <Badge variant="secondary" className="ml-auto">
                  {slideCounts[selectedContext]} slides
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border-2 border-border shadow-xl z-50">
          {HERO_CONTEXTS.map((context) => (
            <SelectItem 
              key={context.id} 
              value={context.id}
              className="cursor-pointer hover:bg-accent/50 focus:bg-accent/50 py-3"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  {context.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{context.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{context.description}</div>
                </div>
                {slideCounts[context.id] !== undefined && (
                  <Badge variant="outline" className="shrink-0">
                    {slideCounts[context.id]}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export { HERO_CONTEXTS };
