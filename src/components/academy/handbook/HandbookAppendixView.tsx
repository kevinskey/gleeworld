import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Edit2, 
  Save, 
  X, 
  Eye, 
  FileText, 
  Clock, 
  History, 
  ArrowLeft,
  Users,
  CheckCircle,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { useHandbookAppendix, HandbookAppendix } from '@/hooks/useHandbookAppendix';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface HandbookAppendixViewProps {
  courseId: string;
  slug: string;
  onBack?: () => void;
}

export const HandbookAppendixView: React.FC<HandbookAppendixViewProps> = ({
  courseId,
  slug,
  onBack
}) => {
  const navigate = useNavigate();
  const {
    currentVersion,
    allVersions,
    loading,
    saving,
    canEdit,
    saveDraft,
    publishNewVersion
  } = useHandbookAppendix(courseId, slug);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<HandbookAppendix | null>(null);

  // Start editing
  const handleStartEdit = () => {
    if (currentVersion) {
      setEditContent(currentVersion.markdown_content);
      setEditTitle(currentVersion.title);
      setIsEditing(true);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
    setEditTitle('');
    setPreviewMode(false);
  };

  // Save draft
  const handleSaveDraft = async () => {
    const success = await saveDraft(editContent, editTitle);
    if (success) {
      // Keep editing mode open
    }
  };

  // Publish new version
  const handlePublish = async () => {
    const success = await publishNewVersion(editContent, editTitle);
    if (success) {
      handleCancelEdit();
    }
  };

  // Render markdown to HTML
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        i++;
        continue;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        const id = trimmed.slice(2).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        elements.push(
          <h1 key={i} id={id} className="text-3xl font-bold mt-8 mb-4 text-foreground scroll-mt-20">
            {trimmed.slice(2)}
          </h1>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('## ')) {
        const id = trimmed.slice(3).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        elements.push(
          <h2 key={i} id={id} className="text-2xl font-semibold mt-6 mb-3 text-foreground scroll-mt-20 border-b pb-2">
            {trimmed.slice(3)}
          </h2>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-xl font-medium mt-4 mb-2 text-foreground">
            {trimmed.slice(4)}
          </h3>
        );
        i++;
        continue;
      }

      // List items - collect consecutive list items
      if (trimmed.startsWith('- ')) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          listItems.push(lines[i].trim().slice(2));
          i++;
        }
        elements.push(
          <ul key={`list-${i}`} className="list-disc pl-6 my-4 space-y-2">
            {listItems.map((item, j) => (
              <li key={j} className="text-muted-foreground">{item}</li>
            ))}
          </ul>
        );
        continue;
      }

      // Regular paragraph
      let paragraph = trimmed;
      // Apply bold formatting
      paragraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Apply italic formatting
      paragraph = paragraph.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      elements.push(
        <p 
          key={i} 
          className="text-muted-foreground my-3 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: paragraph }}
        />
      );
      i++;
    }

    return elements;
  };

  // Table of contents from headings
  const tableOfContents = useMemo(() => {
    if (!currentVersion) return [];
    const lines = currentVersion.markdown_content.split('\n');
    const toc: { level: number; text: string; id: string }[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        const text = trimmed.slice(3);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        toc.push({ level: 2, text, id });
      }
    }
    
    return toc;
  }, [currentVersion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentVersion) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Appendix content not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack || (() => navigate(-1))}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Handbook
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Version {currentVersion.version}
          </Badge>
          
          {canEdit && !isEditing && (
            <>
              <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Version History</DialogTitle>
                    <DialogDescription>
                      View previous versions of this appendix
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {allVersions.map((version) => (
                        <div
                          key={version.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedVersion?.id === version.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedVersion(version)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Version {version.version}</span>
                              {version.is_published && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Published
                                </Badge>
                              )}
                              {!version.is_published && (
                                <Badge variant="secondary" className="text-xs">Draft</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(version.updated_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectedVersion && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Preview: Version {selectedVersion.version}</h4>
                      <ScrollArea className="h-48">
                        <div className="prose prose-sm">
                          {renderMarkdown(selectedVersion.markdown_content)}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              
              <Button onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Callout Box - Link to Shadowing System */}
      <Alert className="bg-primary/5 border-primary/20">
        <Users className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>This Appendix governs the Executive Board Shadowing system.</strong>{' '}
            Only candidates certified through this process may appear on election ballots.
          </span>
          <Button 
            variant="link" 
            className="text-primary p-0 h-auto"
            onClick={() => navigate('/academy/mus-070/shadowing')}
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            View Shadowing System
          </Button>
        </AlertDescription>
      </Alert>

      {/* Edit Mode */}
      {isEditing ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Editing Appendix</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={saving}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {saving ? 'Publishing...' : 'Publish New Version'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="appendix-title">Title</Label>
                <Input
                  id="appendix-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              {previewMode ? (
                <div className="border rounded-lg p-6 min-h-[400px] bg-background">
                  {renderMarkdown(editContent)}
                </div>
              ) : (
                <div>
                  <Label htmlFor="appendix-content">Content (Markdown)</Label>
                  <Textarea
                    id="appendix-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="mt-1 min-h-[400px] font-mono text-sm"
                    placeholder="Enter content using markdown..."
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* View Mode */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table of Contents - Sidebar */}
          <Card className="lg:col-span-1 h-fit sticky top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-1">
                {tableOfContents.map((item, i) => (
                  <a
                    key={i}
                    href={`#${item.id}`}
                    className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-2xl">{currentVersion.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Last updated: {format(new Date(currentVersion.updated_at), 'MMMM d, yyyy')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none">
                {renderMarkdown(currentVersion.markdown_content)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
