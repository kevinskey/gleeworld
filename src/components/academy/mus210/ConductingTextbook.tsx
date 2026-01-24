import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookMarked, ExternalLink, Music, BookOpen, FileText, Users, Volume2 } from 'lucide-react';

interface TextbookSection {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

const TEXTBOOK_SECTIONS: TextbookSection[] = [
  { id: 'home', label: 'Home', icon: BookMarked, path: '/', description: 'Main textbook overview and navigation' },
  { id: 'fundamentals', label: 'Fundamentals', icon: Music, path: '/fundamentals', description: 'Conducting fundamentals, posture, and basic patterns' },
  { id: 'patterns', label: 'Beat Patterns', icon: FileText, path: '/patterns', description: '2-, 3-, 4-beat patterns and subdivisions' },
  { id: 'terminology', label: 'Terminology', icon: BookOpen, path: '/terminology', description: 'Italian tempo, dynamics, and expression terms' },
  { id: 'choral-lit', label: 'Choral Literature', icon: Users, path: '/literature', description: 'Survey of choral music from Renaissance to Contemporary' },
  { id: 'diction', label: 'Diction', icon: Volume2, path: '/diction', description: 'Pronunciation guides for Latin, Italian, German, French' },
];

const baseUrl = 'https://conducting.gleeworld.org';

export const ConductingTextbook: React.FC = () => {
  const openSection = (path: string) => {
    window.open(`${baseUrl}${path}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-primary" />
              Conductor's Reference Guide
            </CardTitle>
            <Button
              variant="default"
              size="sm"
              onClick={() => openSection('/')}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEXTBOOK_SECTIONS.map(section => (
              <Button
                key={section.id}
                variant="outline"
                className="h-auto flex flex-col items-center gap-2 p-4 hover:bg-accent"
                onClick={() => openSection(section.path)}
              >
                <section.icon className="h-6 w-6 text-primary" />
                <span className="font-medium">{section.label}</span>
                <span className="text-xs text-muted-foreground text-center line-clamp-2">
                  {section.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
