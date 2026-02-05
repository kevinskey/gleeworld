import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Image, Layout, Newspaper, Users, Monitor, Church, GraduationCap, BookOpen, Mic, Music, Award, Eye, Heart } from "lucide-react";

export interface HeroContext {
  id: string;
  label: string;
  description: string;
  table: 'gw_hero_slides' | 'dashboard_hero_slides' | 'alumnae_newsletter_hero_slides' | 'advertising_hero' | 'lyke_house_hero' | 'academy_course_badges' | 'gw_universal_sliders' | 'alumnae_page_hero';
  usageContext?: string;
  icon: React.ReactNode;
  slideCount?: number;
  // For course sliders
  courseCode?: string;
  courseTitle?: string;
  coursePath?: string;
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
  },
  {
    id: 'alumnae-landing',
    label: 'Alumnae Landing Hero',
    description: 'Hero images for the alumnae portal landing page',
    table: 'alumnae_page_hero',
    icon: <Heart className="h-4 w-4" />
  },
  {
    id: 'lyke-house',
    label: 'Lyke House Hero',
    description: 'YouTube videos for LH100 Bowman Scholars course',
    table: 'lyke_house_hero',
    icon: <Church className="h-4 w-4" />
  },
  {
    id: 'academy-slider',
    label: 'Academy Slider',
    description: 'Course badge images for the Glee Academy dashboard slider',
    table: 'academy_course_badges',
    icon: <GraduationCap className="h-4 w-4" />
  },
  // Course-specific sliders
  {
    id: 'mus070-slider',
    label: 'MUS 070 Slider',
    description: 'Topic photos for Glee Club course',
    table: 'gw_universal_sliders',
    icon: <Users className="h-4 w-4" />,
    courseCode: 'MUS 070',
    courseTitle: 'Glee Club',
    coursePath: '/academy/mus-070'
  },
  {
    id: 'mus240-slider',
    label: 'MUS 240 Slider',
    description: 'Topic photos for Survey of African American Music',
    table: 'gw_universal_sliders',
    icon: <BookOpen className="h-4 w-4" />,
    courseCode: 'MUS 240',
    courseTitle: 'Survey of African American Music',
    coursePath: '/academy/mus-240'
  },
  {
    id: 'mus210-slider',
    label: 'MUS 210 Slider',
    description: 'Topic photos for Choral Conducting and Literature',
    table: 'gw_universal_sliders',
    icon: <Music className="h-4 w-4" />,
    courseCode: 'MUS 210',
    courseTitle: 'Choral Conducting and Literature',
    coursePath: '/academy/mus-210'
  },
  {
    id: 'mus001-slider',
    label: 'MUS 001 Slider',
    description: 'Topic photos for Private Applied Lessons',
    table: 'gw_universal_sliders',
    icon: <Mic className="h-4 w-4" />,
    courseCode: 'MUS 001',
    courseTitle: 'Private Applied Lessons',
    coursePath: '/academy/mus-001'
  },
  {
    id: 'glee101-slider',
    label: 'GLEE 101 Slider',
    description: 'Topic photos for Leadership Development',
    table: 'gw_universal_sliders',
    icon: <Award className="h-4 w-4" />,
    courseCode: 'GLEE 101',
    courseTitle: 'Leadership Development',
    coursePath: '/academy/glee-101'
  },
  {
    id: 'glee000-slider',
    label: 'GLEE 000 Slider',
    description: 'Topic photos for Sight Singing Institute',
    table: 'gw_universal_sliders',
    icon: <Eye className="h-4 w-4" />,
    courseCode: 'GLEE 000',
    courseTitle: 'Sight Singing Institute',
    coursePath: '/academy/glee-000'
  },
  {
    id: 'mus101-slider',
    label: 'MUS 101 Slider',
    description: 'Topic photos for Music Fundamentals Theory',
    table: 'gw_universal_sliders',
    icon: <BookOpen className="h-4 w-4" />,
    courseCode: 'MUS 101',
    courseTitle: 'Music Fundamentals Theory',
    coursePath: '/academy/mus-101'
  },
  {
    id: 'lh100-slider',
    label: 'LH 100 Slider',
    description: 'Topic photos for Bowman Scholars',
    table: 'gw_universal_sliders',
    icon: <Church className="h-4 w-4" />,
    courseCode: 'LH 100',
    courseTitle: 'Bowman Scholars',
    coursePath: '/academy/lh-100'
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
