import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, History, User, Users, Briefcase, ClipboardCheck, Vote,
  Calendar, Shirt, MapPin, Shield, ShoppingBag, FileText, GraduationCap, FileSignature
};

interface CourseHandbookProps {
  courseCode: string;
}

export const CourseHandbook: React.FC<CourseHandbookProps> = ({ courseCode }) => {
  const navigate = useNavigate();
  const { sectionSlug } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sections = getVisibleHandbookSections();
  const currentSection = sections.find(s => s.slug === sectionSlug) || sections[0];
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
    navigate(`/academy/mus-070/handbook/${slug}`);
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
            <button onClick={() => navigate('/academy/mus-070')} className="hover:text-foreground">
              MUS 070
            </button>
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
            <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentSection.content}
              </ReactMarkdown>
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
