import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookMarked, ExternalLink, Music, BookOpen, FileText, Users, History, Scroll, Library, NotebookPen } from 'lucide-react';

interface TextbookSection {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

const TEXTBOOK_SECTIONS: TextbookSection[] = [
  { id: 'patterns', label: 'Conducting Fundamentals', icon: Music, path: '/patterns', description: 'Interactive animated beat patterns with adjustable tempo' },
  { id: 'terms', label: 'Score Terminology', icon: BookOpen, path: '/terms', description: 'Glossary of Italian, German, and French musical terms' },
  { id: 'history', label: 'Choral Music History', icon: History, path: '/history', description: 'Medieval chant to Gospel—history, style, and 50 essential works' },
  { id: 'conducting-history', label: 'History of Conducting', icon: Users, path: '/conducting-history', description: 'Evolution from ancient cheironomy to the modern podium' },
  { id: 'conventions', label: 'Choral Conventions', icon: Scroll, path: '/conventions', description: 'Notation, performance practice, rehearsal techniques' },
  { id: 'works', label: 'Major Choral Works', icon: FileText, path: '/works', description: 'Greatest choral masterpieces from Handel to contemporary' },
  { id: 'repertoire', label: 'Repertoire List', icon: Library, path: '/repertoire', description: 'Searchable database of choral works 1500–present' },
  { id: 'workbook', label: 'Course Workbook', icon: NotebookPen, path: '/workbook', description: '15-week course companion with assignments' },
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
          <p className="text-xs text-muted-foreground/70 mt-2">
            Opens in a new tab — external site cannot be embedded due to security restrictions
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TEXTBOOK_SECTIONS.map(section => (
              <Button
                key={section.id}
                variant="outline"
                className="h-auto flex flex-col items-center gap-2 p-4 hover:bg-accent"
                onClick={() => openSection(section.path)}
              >
                <section.icon className="h-6 w-6 text-primary" />
                <span className="font-medium text-sm">{section.label}</span>
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
