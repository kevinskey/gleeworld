import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Printer, Book, MessageSquare, History, User, Users, 
  Briefcase, ClipboardCheck, Vote, Calendar, Shirt, MapPin, Shield, 
  ShoppingBag, FileText, GraduationCap, FileSignature, ChevronLeft, 
  ChevronRight, Menu, X
} from 'lucide-react';
import { getVisibleHandbookSections, HandbookSection } from '@/config/handbookSections';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, History, User, Users, Briefcase, ClipboardCheck, Vote,
  Calendar, Shirt, MapPin, Shield, ShoppingBag, FileText, GraduationCap, FileSignature, Book
};

// Simple markdown renderer
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const blocks = content.split(/\n\n+/);
  
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-6 mb-2 text-foreground">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-8 mb-3 text-foreground">{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-foreground">{trimmed.slice(2)}</h1>;
        }
        
        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.includes('\n- ')) {
          const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
          return (
            <ul key={index} className="list-disc pl-6 space-y-1">
              {items.map((item, i) => (
                <li key={i} className="text-muted-foreground">{item.slice(2).trim()}</li>
              ))}
            </ul>
          );
        }
        
        // Numbered lists
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter(line => /^\d+\.\s/.test(line.trim()));
          return (
            <ol key={index} className="list-decimal pl-6 space-y-1">
              {items.map((item, i) => (
                <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s/, '').trim()}</li>
              ))}
            </ol>
          );
        }
        
        // Regular paragraph with bold support
        const formattedText = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>');
        
        return (
          <p 
            key={index} 
            className="text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      })}
    </div>
  );
};

interface CourseHandbookProps {
  courseCode: string;
}

export const CourseHandbook: React.FC<CourseHandbookProps> = ({ courseCode }) => {
  const sections = getVisibleHandbookSections();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentSection = sections[selectedIndex] || sections[0];

  // Filter sections by search
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return sections;
    const term = searchTerm.toLowerCase();
    return sections.filter(s => 
      s.title.toLowerCase().includes(term) || 
      s.content.toLowerCase().includes(term)
    );
  }, [searchTerm, sections]);

  // Search matches in current section
  const searchMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    const content = currentSection.content.toLowerCase();
    const matches: number[] = [];
    let idx = content.indexOf(term);
    while (idx !== -1 && matches.length < 10) {
      matches.push(idx);
      idx = content.indexOf(term, idx + 1);
    }
    return matches;
  }, [searchTerm, currentSection]);

  const handlePrint = () => {
    window.print();
  };

  const goToSection = (index: number) => {
    setSelectedIndex(index);
    setMobileNavOpen(false);
  };

  const goPrev = () => {
    if (selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  };

  const goNext = () => {
    if (selectedIndex < sections.length - 1) setSelectedIndex(selectedIndex + 1);
  };

  const Icon = iconMap[currentSection?.icon] || Book;

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-[calc(100vh-200px)] min-h-[500px] border rounded-lg overflow-hidden bg-card">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b bg-muted/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="gap-2"
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Sections
        </Button>
        <Badge variant="outline" className="text-xs">
          {selectedIndex + 1} / {sections.length}
        </Badge>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileNavOpen && (
        <div className="lg:hidden absolute inset-0 z-50 bg-background">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Handbook Sections</h3>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2 space-y-1">
              {filteredSections.map((section, idx) => {
                const SectionIcon = iconMap[section.icon] || Book;
                const actualIndex = sections.findIndex(s => s.id === section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => goToSection(actualIndex)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors text-left",
                      actualIndex === selectedIndex
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <SectionIcon className="h-4 w-4 flex-shrink-0" />
                    <span>{section.shortTitle}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 border-r bg-muted/30 flex-shrink-0">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Book className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">SCGC Handbook</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">2023-24</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredSections.map((section, idx) => {
              const SectionIcon = iconMap[section.icon] || Book;
              const actualIndex = sections.findIndex(s => s.id === section.id);
              return (
                <button
                  key={section.id}
                  onClick={() => goToSection(actualIndex)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors text-left",
                    actualIndex === selectedIndex
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <SectionIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{section.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content Header */}
        <div className="flex items-center justify-between gap-4 p-4 border-b bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-lg truncate">{currentSection?.title}</h1>
              <p className="text-xs text-muted-foreground">
                Section {selectedIndex + 1} of {sections.length}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-shrink-0">
            <Printer className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>

        {/* Search Results Banner */}
        {searchTerm && searchMatches.length > 0 && (
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b text-sm">
            <span className="text-yellow-800 dark:text-yellow-200">
              Found {searchMatches.length} match{searchMatches.length !== 1 ? 'es' : ''} in this section
            </span>
          </div>
        )}

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl">
            {currentSection && <MarkdownContent content={currentSection.content} />}
          </div>
        </ScrollArea>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between gap-4 p-4 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={selectedIndex <= 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          
          <div className="hidden sm:flex items-center gap-1">
            {sections.slice(Math.max(0, selectedIndex - 2), Math.min(sections.length, selectedIndex + 3)).map((s, i) => {
              const actualIdx = sections.findIndex(sec => sec.id === s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => goToSection(actualIdx)}
                  className={cn(
                    "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                    actualIdx === selectedIndex
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {actualIdx + 1}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={selectedIndex >= sections.length - 1}
            className="gap-2"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseHandbook;
