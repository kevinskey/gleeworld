import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Printer, ChevronRight, Book, MessageSquare, History, User, Users, 
  Briefcase, ClipboardCheck, Vote, Calendar, Shirt, MapPin, Shield, 
  ShoppingBag, FileText, GraduationCap, FileSignature, ChevronLeft, Menu
} from 'lucide-react';
import { HANDBOOK_SECTIONS, getVisibleHandbookSections, HandbookSection } from '@/config/handbookSections';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, History, User, Users, Briefcase, ClipboardCheck, Vote,
  Calendar, Shirt, MapPin, Shield, ShoppingBag, FileText, GraduationCap, FileSignature
};

// Simple markdown renderer that doesn't require external dependencies
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const renderContent = (text: string) => {
    const blocks = text.split(/\n\n+/);
    
    return blocks.map((block, index) => {
      const trimmed = block.trim();
      if (!trimmed) return null;
      
      // Headers
      if (trimmed.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold mt-6 mb-3">{trimmed.slice(4)}</h3>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold mt-8 mb-4">{trimmed.slice(3)}</h2>;
      }
      if (trimmed.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mt-8 mb-4">{trimmed.slice(2)}</h1>;
      }
      
      // Bullet lists
      if (trimmed.includes('\n- ') || trimmed.startsWith('- ')) {
        const items = trimmed.split('\n').filter(line => line.startsWith('- '));
        return (
          <ul key={index} className="list-disc list-inside space-y-1 my-4 ml-4">
            {items.map((item, i) => (
              <li key={i} className="text-muted-foreground">{item.slice(2)}</li>
            ))}
          </ul>
        );
      }
      
      // Numbered lists
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split('\n').filter(line => /^\d+\.\s/.test(line));
        return (
          <ol key={index} className="list-decimal list-inside space-y-1 my-4 ml-4">
            {items.map((item, i) => (
              <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s/, '')}</li>
            ))}
          </ol>
        );
      }
      
      // Bold text handling
      const formattedText = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      return (
        <p 
          key={index} 
          className="text-muted-foreground leading-relaxed my-3"
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      );
    });
  };

  return <div>{renderContent(content)}</div>;
};

interface CourseHandbookProps {
  courseCode: string;
}

export const CourseHandbook: React.FC<CourseHandbookProps> = ({ courseCode }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  const sections = getVisibleHandbookSections();
  
  // Extract section slug from URL if present
  const getInitialSection = () => {
    const match = location.pathname.match(/\/handbook\/([^/]+)/);
    if (match) {
      const found = sections.find(s => s.slug === match[1]);
      if (found) return found.slug;
    }
    return sections[0]?.slug || null;
  };
  
  const [currentSectionSlug, setCurrentSectionSlug] = useState<string | null>(getInitialSection);
  
  // Sync with URL changes
  useEffect(() => {
    const match = location.pathname.match(/\/handbook\/([^/]+)/);
    if (match) {
      const found = sections.find(s => s.slug === match[1]);
      if (found) setCurrentSectionSlug(found.slug);
    }
  }, [location.pathname, sections]);
  
  const currentSection = sections.find(s => s.slug === currentSectionSlug) || sections[0];
  const currentIndex = sections.findIndex(s => s.id === currentSection?.id);

  // Search filtering
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    return sections.filter(s => 
      s.title.toLowerCase().includes(term) || 
      s.content.toLowerCase().includes(term)
    );
  }, [searchTerm, sections]);

  const handlePrint = () => {
    window.print();
  };

  const navigateToSection = (slug: string) => {
    setCurrentSectionSlug(slug);
    setMobileNavOpen(false);
  };

  const SideNav = () => (
    <nav className="space-y-1">
      {sections.map((section) => {
        const IconComponent = iconMap[section.icon] || Book;
        const isActive = section.id === currentSection?.id;
        return (
          <button
            key={section.id}
            onClick={() => navigateToSection(section.slug)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
              isActive 
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <IconComponent className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{section.shortTitle}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Card className="sticky top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Book className="h-4 w-4" />
              SCGC Handbook
            </CardTitle>
            <Badge variant="outline" className="w-fit text-xs">2023-2024</Badge>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[500px]">
              <SideNav />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* Breadcrumbs & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-muted-foreground">MUS 070</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Handbook</span>
            {currentSection && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">{currentSection.shortTitle}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile Nav Toggle */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4 mr-2" />
                  Sections
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="py-4">
                  <h3 className="font-semibold mb-4">Handbook Sections</h3>
                  <SideNav />
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search handbook..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        {searchResults && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">No sections found.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(section => (
                    <button
                      key={section.id}
                      onClick={() => { navigateToSection(section.slug); setSearchTerm(''); }}
                      className="w-full text-left p-2 rounded hover:bg-muted"
                    >
                      <p className="font-medium text-sm">{section.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section Content */}
        {currentSection && !searchResults && (
          <Card className="print:shadow-none print:border-0">
            <CardContent className="pt-6">
              <SimpleMarkdown content={currentSection.content} />
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        {currentSection && !searchResults && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              disabled={currentIndex <= 0}
              onClick={() => navigateToSection(sections[currentIndex - 1]?.slug)}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentIndex >= sections.length - 1}
              onClick={() => navigateToSection(sections[currentIndex + 1]?.slug)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
