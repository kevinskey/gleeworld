import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookMarked, ExternalLink, Music, BookOpen, FileText, Users, Volume2 } from 'lucide-react';

interface TextbookSection {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

const TEXTBOOK_SECTIONS: TextbookSection[] = [
  { 
    id: 'home', 
    label: 'Home', 
    icon: BookMarked, 
    path: '/',
    description: 'Main textbook overview and navigation'
  },
  { 
    id: 'fundamentals', 
    label: 'Fundamentals', 
    icon: Music, 
    path: '/fundamentals',
    description: 'Conducting fundamentals, posture, and basic patterns'
  },
  { 
    id: 'patterns', 
    label: 'Beat Patterns', 
    icon: FileText, 
    path: '/patterns',
    description: '2-, 3-, 4-beat patterns and subdivisions'
  },
  { 
    id: 'terminology', 
    label: 'Terminology', 
    icon: BookOpen, 
    path: '/terminology',
    description: 'Italian tempo, dynamics, and expression terms'
  },
  { 
    id: 'choral-lit', 
    label: 'Choral Literature', 
    icon: Users, 
    path: '/literature',
    description: 'Survey of choral music from Renaissance to Contemporary'
  },
  { 
    id: 'diction', 
    label: 'Diction', 
    icon: Volume2, 
    path: '/diction',
    description: 'Pronunciation guides for Latin, Italian, German, French'
  },
];

export const ConductingTextbook: React.FC = () => {
  const [activeSection, setActiveSection] = useState('home');
  const baseUrl = 'https://conducting.gleeworld.org';

  const currentSection = TEXTBOOK_SECTIONS.find(s => s.id === activeSection) || TEXTBOOK_SECTIONS[0];
  const iframeSrc = `${baseUrl}${currentSection.path}`;

  return (
    <div className="space-y-4">
      {/* Quick Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-primary" />
              Conductor's Reference Guide
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(baseUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Full Site
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your comprehensive digital textbook for MUS 210 Choral Conducting and Literature
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto gap-1">
              {TEXTBOOK_SECTIONS.map(section => (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id}
                  className="flex flex-col items-center gap-1 py-2 px-2 text-xs"
                >
                  <section.icon className="h-4 w-4" />
                  <span className="truncate">{section.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                {currentSection.description}
              </p>
              
              <div className="rounded-lg border overflow-hidden bg-background">
                <iframe 
                  src={iframeSrc}
                  style={{ width: '100%', height: '70vh', minHeight: '500px' }}
                  allow="fullscreen"
                  title={`Textbook - ${currentSection.label}`}
                  className="bg-white"
                />
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
