import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Search, Printer, Book, MessageSquare, History, User, Users, 
  Briefcase, ClipboardCheck, Vote, Calendar, Shirt, MapPin, Shield, 
  ShoppingBag, FileText, GraduationCap, FileSignature, ChevronLeft, 
  ChevronRight, Menu, X, Edit2, Clock
} from 'lucide-react';
import { getVisibleHandbookSections, HandbookSection } from '@/config/handbookSections';
import { useHandbookEdit } from '@/hooks/useHandbookEdit';
import { HandbookEditHistory } from './HandbookEditHistory';
import { HandbookEditor } from './HandbookEditor';
import { HandbookAppendixNav } from './HandbookAppendixNav';
import { HandbookAppendixView } from './HandbookAppendixView';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, History, User, Users, Briefcase, ClipboardCheck, Vote,
  Calendar, Shirt, MapPin, Shield, ShoppingBag, FileText, GraduationCap, FileSignature, Book, Clock
};

// Simple markdown renderer
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const blocks = content.split(/\n\n+/);
  
  return (
    <div className="space-y-4 text-sm">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return <h3 key={index} className="text-base font-semibold mt-6 mb-2 text-foreground">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={index} className="text-lg font-bold mt-8 mb-3 text-foreground">{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith('# ')) {
          return <h1 key={index} className="text-xl font-bold mt-6 mb-4 text-foreground">{trimmed.slice(2)}</h1>;
        }
        
        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.includes('\n- ')) {
          const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
          return (
            <ul key={index} className="list-disc pl-6 space-y-1 text-sm">
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
            <ol key={index} className="list-decimal pl-6 space-y-1 text-sm">
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
            className="text-sm text-muted-foreground leading-relaxed"
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

type SidebarView = 'sections' | 'history';

export const CourseHandbook: React.FC<CourseHandbookProps> = ({ courseCode }) => {
  const location = useLocation();
  const sections = getVisibleHandbookSections();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('sections');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAppendixSlug, setSelectedAppendixSlug] = useState<string | null>(null);
  const { toast } = useToast();

  // Check URL for appendix slug on mount
  useEffect(() => {
    if (location.pathname.includes('/handbook/appendix-')) {
      const match = location.pathname.match(/\/handbook\/(appendix-[^/]+)/);
      if (match) {
        setSelectedAppendixSlug(match[1]);
      }
    }
  }, [location.pathname]);

  // Get course ID for appendix queries (MUS070 format)
  const courseId = courseCode.replace(' ', '').toUpperCase();
  
  // Use custom sections state that can be updated
  const [customSections, setCustomSections] = useState<HandbookSection[]>(sections);
  
  const { 
    canEdit, 
    loading: permissionLoading, 
    editLogs, 
    logsLoading, 
    fetchEditLogs,
    logEdit 
  } = useHandbookEdit();

  // Fetch edit logs when switching to history view
  useEffect(() => {
    if (sidebarView === 'history' && canEdit) {
      fetchEditLogs();
    }
  }, [sidebarView, canEdit, fetchEditLogs]);

  const currentSection = customSections[selectedIndex] || customSections[0];

  // Filter sections by search
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return customSections;
    const term = searchTerm.toLowerCase();
    return customSections.filter(s => 
      s.title.toLowerCase().includes(term) || 
      s.content.toLowerCase().includes(term)
    );
  }, [searchTerm, customSections]);

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
    setSidebarView('sections');
    setIsEditing(false);
  };

  const goToSectionById = (sectionId: string) => {
    const index = customSections.findIndex(s => s.id === sectionId);
    if (index !== -1) {
      goToSection(index);
    }
  };

  const goPrev = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setIsEditing(false);
    }
  };

  const goNext = () => {
    if (selectedIndex < customSections.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setIsEditing(false);
    }
  };

  const handleSaveEdit = async (newContent: string, summary: string): Promise<boolean> => {
    if (!currentSection) return false;
    
    setSaving(true);
    try {
      // Log the edit
      const logged = await logEdit(
        currentSection.id,
        currentSection.title,
        currentSection.content,
        newContent,
        summary
      );

      if (logged) {
        // Update local state
        setCustomSections(prev => 
          prev.map(s => 
            s.id === currentSection.id 
              ? { ...s, content: newContent }
              : s
          )
        );
        
        toast({
          title: "Changes saved",
          description: "Your edits have been saved and logged."
        });
        
        // Refresh edit logs if visible
        if (sidebarView === 'history') {
          fetchEditLogs();
        }
        
        return true;
      } else {
        throw new Error('Failed to log edit');
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const Icon = iconMap[currentSection?.icon] || Book;

  // Create a special "Edit History" entry for sidebar
  const historyEntry = {
    id: 'edit-history',
    slug: 'edit-history',
    title: 'Edit History',
    shortTitle: 'Edit History',
    orderIndex: -1,
    icon: 'Clock',
    isVisible: true,
    content: ''
  };

  return (
    <TooltipProvider>
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
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarView(sidebarView === 'history' ? 'sections' : 'history')}
              >
                <Clock className="h-4 w-4" />
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {selectedIndex + 1} / {customSections.length}
            </Badge>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        {mobileNavOpen && (
          <div className="lg:hidden absolute inset-0 z-50 bg-background">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">
                {sidebarView === 'history' ? 'Edit History' : 'Handbook Sections'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebarView === 'history' ? (
              <HandbookEditHistory 
                editLogs={editLogs} 
                loading={logsLoading}
                onSectionClick={goToSectionById}
                currentSectionId={currentSection?.id}
              />
            ) : (
              <ScrollArea className="h-[calc(100%-60px)]">
                <div className="p-2 space-y-1">
                  {filteredSections.map((section, idx) => {
                    const SectionIcon = iconMap[section.icon] || Book;
                    const actualIndex = customSections.findIndex(s => s.id === section.id);
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          goToSection(actualIndex);
                          setSelectedAppendixSlug(null);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors text-left",
                          actualIndex === selectedIndex && !selectedAppendixSlug
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <SectionIcon className="h-4 w-4 flex-shrink-0" />
                        <span>{section.shortTitle}</span>
                      </button>
                    );
                  })}
                  
                  {/* Mobile Appendices */}
                  <div className="pt-2 mt-2 border-t">
                    <HandbookAppendixNav
                      courseId={courseId}
                      onSelectAppendix={(slug) => {
                        setSelectedAppendixSlug(slug);
                        setMobileNavOpen(false);
                      }}
                      selectedSlug={selectedAppendixSlug || undefined}
                    />
                  </div>
                </div>
              </ScrollArea>
            )}
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
            
            {/* View Toggle */}
            {canEdit && (
              <div className="flex rounded-md border overflow-hidden mb-3">
                <button
                  onClick={() => setSidebarView('sections')}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium transition-colors",
                    sidebarView === 'sections'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  Sections
                </button>
                <button
                  onClick={() => setSidebarView('history')}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                    sidebarView === 'history'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  History
                </button>
              </div>
            )}
            
            {sidebarView === 'sections' && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            )}
          </div>
          
          {sidebarView === 'history' ? (
            <HandbookEditHistory 
              editLogs={editLogs} 
              loading={logsLoading}
              onSectionClick={goToSectionById}
              currentSectionId={currentSection?.id}
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {filteredSections.map((section, idx) => {
                  const SectionIcon = iconMap[section.icon] || Book;
                  const actualIndex = customSections.findIndex(s => s.id === section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        goToSection(actualIndex);
                        setSelectedAppendixSlug(null);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors text-left",
                        actualIndex === selectedIndex && !selectedAppendixSlug
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <SectionIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{section.shortTitle}</span>
                    </button>
                  );
                })}
                
                {/* Appendices Section */}
                <div className="pt-2 mt-2 border-t">
                  <HandbookAppendixNav
                    courseId={courseId}
                    onSelectAppendix={(slug) => {
                      setSelectedAppendixSlug(slug);
                      setMobileNavOpen(false);
                    }}
                    selectedSlug={selectedAppendixSlug || undefined}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Appendix View */}
          {selectedAppendixSlug ? (
            <ScrollArea className="flex-1">
              <div className="p-6">
                <HandbookAppendixView
                  courseId={courseId}
                  slug={selectedAppendixSlug}
                  onBack={() => setSelectedAppendixSlug(null)}
                />
              </div>
            </ScrollArea>
          ) : isEditing && currentSection ? (
            <HandbookEditor
              content={currentSection.content}
              sectionTitle={currentSection.title}
              onSave={handleSaveEdit}
              onCancel={() => setIsEditing(false)}
              saving={saving}
            />
          ) : (
            <>
              {/* Content Header */}
              <div className="flex items-center justify-between gap-4 p-4 border-b bg-background">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-semibold text-lg truncate">{currentSection?.title}</h1>
                    <p className="text-xs text-muted-foreground">
                      Section {selectedIndex + 1} of {customSections.length}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEdit && !permissionLoading && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit this section</TooltipContent>
                    </Tooltip>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Print</span>
                  </Button>
                </div>
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
                <div className="p-6 max-w-4xl lg:max-w-5xl">
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
                  {customSections.slice(Math.max(0, selectedIndex - 2), Math.min(customSections.length, selectedIndex + 3)).map((s, i) => {
                    const actualIdx = customSections.findIndex(sec => sec.id === s.id);
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
                  disabled={selectedIndex >= customSections.length - 1}
                  className="gap-2"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CourseHandbook;
