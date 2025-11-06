import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, Type, Image, Video, Link2, Trash2, MoveUp, MoveDown,
  Save, Eye, Sparkles, AlignLeft, FileImage, Upload
} from "lucide-react";

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'link' | 'heading';
  content: string;
  style?: {
    alignment?: 'left' | 'center' | 'right';
    size?: 'small' | 'medium' | 'large';
  };
}

interface EmailTemplateBuilderProps {
  onTemplateCreated?: () => void;
}

export const EmailTemplateBuilder = ({ onTemplateCreated }: EmailTemplateBuilderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("custom");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      style: {
        alignment: 'left',
        size: 'medium'
      }
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, content } : block
    ));
  };

  const updateBlockStyle = (id: string, style: ContentBlock['style']) => {
    setBlocks(blocks.map(block =>
      block.id === id ? { ...block, style: { ...block.style, ...style } } : block
    ));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(block => block.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploadingImage(blockId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload images");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('email-template-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('email-template-images')
        .getPublicUrl(fileName);

      updateBlock(blockId, publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(null);
    }
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    // Convert various YouTube URL formats to embed format
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
      /youtube\.com\/shorts\/([^&\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    return url;
  };

  const saveTemplate = async () => {
    if (!templateName || !subject || blocks.length === 0) {
      toast.error("Please fill in all required fields and add at least one content block");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: templateName,
          subject: subject,
          content: blocks as any,
          category: category,
          is_active: true
        });

      if (error) throw error;

      toast.success("Template saved successfully!");
      resetForm();
      onTemplateCreated?.();
      setIsOpen(false);
    } catch (error: any) {
      toast.error("Failed to save template", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTemplateName("");
    setSubject("");
    setCategory("custom");
    setBlocks([]);
    setShowPreview(false);
  };

  const renderBlockPreview = (block: ContentBlock) => {
    const alignmentClass = 
      block.style?.alignment === 'center' ? 'text-center' :
      block.style?.alignment === 'right' ? 'text-right' : 'text-left';
    
    const sizeClass =
      block.style?.size === 'small' ? 'text-sm' :
      block.style?.size === 'large' ? 'text-lg' : 'text-base';

    switch (block.type) {
      case 'heading':
        return (
          <h2 className={`font-bold text-xl ${alignmentClass}`}>
            {block.content || 'Heading...'}
          </h2>
        );
      case 'text':
        return (
          <p className={`${alignmentClass} ${sizeClass} whitespace-pre-wrap`}>
            {block.content || 'Text content...'}
          </p>
        );
      case 'image':
        return block.content ? (
          <div className={alignmentClass}>
            <img 
              src={block.content} 
              alt="Template preview" 
              className="max-w-full h-auto inline-block"
              style={{ maxHeight: '300px' }}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="14" text-anchor="middle" dy=".3em" fill="%239ca3af"%3EInvalid Image URL%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        ) : (
          <div className={`${alignmentClass} p-8 border-2 border-dashed rounded`}>
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Enter direct image URL (ends in .jpg, .png, etc.)</p>
          </div>
        );
      case 'video':
        const embedUrl = block.content ? getYouTubeEmbedUrl(block.content) : '';
        return embedUrl ? (
          <div className={alignmentClass}>
            <iframe
              width="560"
              height="315"
              src={embedUrl}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="max-w-full h-auto inline-block rounded"
              style={{ maxHeight: '400px' }}
            />
          </div>
        ) : (
          <div className={`${alignmentClass} p-8 border-2 border-dashed rounded`}>
            <Video className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Enter YouTube URL</p>
          </div>
        );
      case 'link':
        return (
          <div className={alignmentClass}>
            <a 
              href={block.content || '#'} 
              className="text-primary underline inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Link2 className="h-4 w-4" />
              {block.content || 'Link URL...'}
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  const renderBlockEditor = (block: ContentBlock, index: number) => {
    return (
      <Card key={block.id} className="mb-3">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {block.type === 'heading' && <Type className="h-4 w-4" />}
              {block.type === 'text' && <AlignLeft className="h-4 w-4" />}
              {block.type === 'image' && <Image className="h-4 w-4" />}
              {block.type === 'video' && <Video className="h-4 w-4" />}
              {block.type === 'link' && <Link2 className="h-4 w-4" />}
              <span className="text-sm font-medium capitalize">{block.type} Block</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'up')}
                disabled={index === 0}
              >
                <MoveUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'down')}
                disabled={index === blocks.length - 1}
              >
                <MoveDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteBlock(block.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {block.type === 'image' ? (
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(block.id, file);
                  }}
                  disabled={uploadingImage === block.id}
                  className="cursor-pointer"
                />
                {uploadingImage === block.id && (
                  <p className="text-sm text-muted-foreground">Uploading image...</p>
                )}
                {block.content && (
                  <div className="relative">
                    <img src={block.content} alt="Preview" className="max-h-32 rounded" />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateBlock(block.id, '')}
                      className="absolute top-1 right-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (block.type === 'text' || block.type === 'heading') ? (
              <Textarea
                placeholder={`Enter ${block.type} content...`}
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="min-h-[80px]"
              />
            ) : (
              <Input
                placeholder={block.type === 'video' ? 'YouTube URL (e.g., youtube.com/watch?v=...)' : `Enter ${block.type} URL...`}
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
              />
            )}

            <div className="flex gap-2">
              <Select
                value={block.style?.alignment}
                onValueChange={(value) => updateBlockStyle(block.id, { alignment: value as any })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Align" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>

              {(block.type === 'text' || block.type === 'heading') && (
                <Select
                  value={block.style?.size}
                  onValueChange={(value) => updateBlockStyle(block.id, { size: value as any })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Create Custom Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Template Builder</DialogTitle>
          <CardDescription>
            Create a custom email template with text, images, videos, and links
          </CardDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., Monthly Newsletter"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div>
              <Label>Email Subject</Label>
              <Input
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="fundraising">Fundraising</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Add Content Blocks</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('heading')}
                  className="gap-1"
                >
                  <Type className="h-4 w-4" />
                  Heading
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('text')}
                  className="gap-1"
                >
                  <AlignLeft className="h-4 w-4" />
                  Text
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('image')}
                  className="gap-1"
                >
                  <Image className="h-4 w-4" />
                  Image
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('video')}
                  className="gap-1"
                >
                  <Video className="h-4 w-4" />
                  Video
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock('link')}
                  className="gap-1"
                >
                  <Link2 className="h-4 w-4" />
                  Link
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content Blocks ({blocks.length})</Label>
              {blocks.length === 0 ? (
                <Card className="p-8 text-center">
                  <Plus className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Add content blocks to build your template
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {blocks.map((block, index) => renderBlockEditor(block, index))}
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="border-l pl-6">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg">Preview</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>

            {showPreview && (
              <Card className="p-6 bg-white">
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <p className="text-xs text-muted-foreground">Subject:</p>
                    <p className="font-semibold">{subject || 'Email Subject...'}</p>
                  </div>
                  {blocks.map((block) => (
                    <div key={block.id} className="py-2">
                      {renderBlockPreview(block)}
                    </div>
                  ))}
                  {blocks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Add content blocks to see preview
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveTemplate} disabled={saving}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
