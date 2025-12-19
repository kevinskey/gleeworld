import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
  Image,
  Video,
  Quote,
  Minus,
  Type,
  Palette,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3,
  Loader2,
  Search,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

interface MediaItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Palatino, serif', label: 'Palatino' },
  { value: 'Garamond, serif', label: 'Garamond' },
];

const FONT_SIZES = [
  { value: '1', label: '10px' },
  { value: '2', label: '13px' },
  { value: '3', label: '16px' },
  { value: '4', label: '18px' },
  { value: '5', label: '24px' },
  { value: '6', label: '32px' },
  { value: '7', label: '48px' },
];

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your message...',
  className = '',
  minHeight = '200px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showVideoPopover, setShowVideoPopover] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');

  // Fetch media library images when dialog opens
  useEffect(() => {
    if (showMediaLibrary) {
      fetchMediaImages();
    }
  }, [showMediaLibrary]);

  const fetchMediaImages = async () => {
    setLoadingMedia(true);
    try {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, created_at')
        .like('file_type', 'image/%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMediaItems(data || []);
    } catch (err) {
      console.error('Error fetching media:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const filteredMedia = mediaItems.filter(item =>
    item.title?.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertImage = useCallback((imageUrl: string) => {
    exec('insertHTML', `<img src="${imageUrl}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />`);
    setShowMediaLibrary(false);
  }, [exec]);

  const insertVideo = useCallback(() => {
    if (videoUrl) {
      let embedUrl = videoUrl;
      const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
      
      if (youtubeMatch) {
        embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
      } else if (vimeoMatch) {
        embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
      
      exec('insertHTML', `
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 16px 0; border-radius: 8px;">
          <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;" allowfullscreen></iframe>
        </div>
      `);
      setVideoUrl('');
      setShowVideoPopover(false);
    }
  }, [videoUrl, exec]);

  const insertLink = useCallback(() => {
    if (linkUrl) {
      exec('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkPopover(false);
    }
  }, [linkUrl, exec]);

  const ToolbarButton = ({ 
    onClick, 
    icon: Icon, 
    title,
    active = false,
  }: { 
    onClick: () => void; 
    icon: React.ElementType; 
    title: string;
    active?: boolean;
  }) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-border mx-1" />;

  return (
    <>
      <div className={`border rounded-lg overflow-hidden bg-background ${className}`}>
        {/* Toolbar Row 1 - History, Font, Size */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
          <ToolbarButton onClick={() => exec('undo')} icon={Undo} title="Undo" />
          <ToolbarButton onClick={() => exec('redo')} icon={Redo} title="Redo" />
          <ToolbarDivider />
          
          {/* Font Family */}
          <Select onValueChange={(val) => exec('fontName', val)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select onValueChange={(val) => exec('fontSize', val)}>
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToolbarDivider />

          {/* Headings */}
          <ToolbarButton onClick={() => exec('formatBlock', 'h1')} icon={Heading1} title="Heading 1" />
          <ToolbarButton onClick={() => exec('formatBlock', 'h2')} icon={Heading2} title="Heading 2" />
          <ToolbarButton onClick={() => exec('formatBlock', 'h3')} icon={Heading3} title="Heading 3" />
          <ToolbarButton onClick={() => exec('formatBlock', 'p')} icon={Type} title="Paragraph" />
        </div>

        {/* Toolbar Row 2 - Formatting */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
          <ToolbarButton onClick={() => exec('bold')} icon={Bold} title="Bold (Ctrl+B)" />
          <ToolbarButton onClick={() => exec('italic')} icon={Italic} title="Italic (Ctrl+I)" />
          <ToolbarButton onClick={() => exec('underline')} icon={Underline} title="Underline (Ctrl+U)" />
          <ToolbarButton onClick={() => exec('strikeThrough')} icon={Strikethrough} title="Strikethrough" />
          
          <ToolbarDivider />

          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text Color">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-10 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => exec('foreColor', color)}
                    className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <ToolbarDivider />

          <ToolbarButton onClick={() => exec('insertUnorderedList')} icon={List} title="Bullet List" />
          <ToolbarButton onClick={() => exec('insertOrderedList')} icon={ListOrdered} title="Numbered List" />
          <ToolbarButton onClick={() => exec('formatBlock', 'blockquote')} icon={Quote} title="Quote" />
          
          <ToolbarDivider />

          <ToolbarButton onClick={() => exec('justifyLeft')} icon={AlignLeft} title="Align Left" />
          <ToolbarButton onClick={() => exec('justifyCenter')} icon={AlignCenter} title="Align Center" />
          <ToolbarButton onClick={() => exec('justifyRight')} icon={AlignRight} title="Align Right" />
          
          <ToolbarDivider />

          {/* Link */}
          <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Link">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Insert Link</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => e.key === 'Enter' && insertLink()}
                />
                <Button size="sm" onClick={insertLink} className="w-full">Insert Link</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Image - Opens Media Library */}
          <ToolbarButton 
            onClick={() => setShowMediaLibrary(true)} 
            icon={Image} 
            title="Insert Image from Media Library" 
          />

          {/* Video */}
          <Popover open={showVideoPopover} onOpenChange={setShowVideoPopover}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Video">
                <Video className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Insert Video</Label>
                <p className="text-xs text-muted-foreground">Paste YouTube or Vimeo URL</p>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  onKeyDown={(e) => e.key === 'Enter' && insertVideo()}
                />
                <Button size="sm" onClick={insertVideo} className="w-full">Insert Video</Button>
              </div>
            </PopoverContent>
          </Popover>

          <ToolbarDivider />

          <ToolbarButton onClick={() => exec('insertHorizontalRule')} icon={Minus} title="Horizontal Line" />
          <ToolbarButton onClick={() => exec('removeFormat')} icon={RemoveFormatting} title="Clear Formatting" />
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline
          aria-label="Rich text editor"
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          data-placeholder={placeholder}
          className="p-4 focus:outline-none prose prose-sm max-w-none dark:prose-invert overflow-y-auto"
          style={{ 
            minHeight,
            position: 'relative',
          }}
        />

        <style>{`
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: hsl(var(--muted-foreground));
            pointer-events: none;
            position: absolute;
          }
          [contenteditable] blockquote {
            border-left: 4px solid hsl(var(--primary));
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            color: hsl(var(--muted-foreground));
          }
          [contenteditable] img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
          }
          [contenteditable] a {
            color: hsl(var(--primary));
            text-decoration: underline;
          }
        `}</style>
      </div>

      {/* Media Library Dialog */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Image from Media Library</DialogTitle>
          </DialogHeader>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search images..."
              className="pl-10"
            />
          </div>

          {/* Image Grid */}
          <ScrollArea className="h-[500px]">
            {loadingMedia ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Image className="h-12 w-12 mb-2 opacity-50" />
                <p>No images found in media library</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 p-1">
                {filteredMedia.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => insertImage(item.file_url)}
                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                  >
                    <img
                      src={item.file_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-white text-xs font-medium truncate w-full">
                        {item.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
