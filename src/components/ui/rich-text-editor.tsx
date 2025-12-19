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
      // Reset search each time you open
      setMediaSearch('');
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
      const rows = (data ?? []) as MediaItem[];
      console.log('Media library images loaded:', rows.length);
      setMediaItems(rows);
    } catch (err) {
      console.error('Error fetching media:', err);
      setMediaItems([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const filteredMedia = (() => {
    const needle = mediaSearch.trim().toLowerCase();
    if (!needle) return mediaItems;
    return mediaItems.filter((item) => {
      const title = (item.title ?? '').toLowerCase();
      const url = (item.file_url ?? '').toLowerCase();
      return title.includes(needle) || url.includes(needle);
    });
  })();

  // Store selection range to restore after dialog closes
  const savedSelection = useRef<Range | null>(null);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelection.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection.current);
      }
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const insertImage = useCallback((imageUrl: string) => {
    console.log('Inserting image:', imageUrl);
    
    // Restore focus and selection
    if (editorRef.current) {
      editorRef.current.focus();
      
      // If we have a saved selection, restore it
      if (savedSelection.current) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelection.current);
        }
      }
    }
    
    const imgHtml = `<img src="${imageUrl}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block;" />&nbsp;`;
    const success = document.execCommand('insertHTML', false, imgHtml);
    console.log('Image insert success:', success);
    
    // Manually update state
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
    
    setShowMediaLibrary(false);
  }, [onChange]);

  const insertVideo = useCallback(() => {
    if (!videoUrl) {
      console.log('No video URL provided');
      return;
    }
    
    console.log('Attempting to insert video:', videoUrl);
    
    let videoId = '';
    let platform = '';
    let thumbnailUrl = '';
    
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    
    if (youtubeMatch) {
      videoId = youtubeMatch[1];
      platform = 'YouTube';
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      console.log('YouTube video detected:', videoId);
    } else if (vimeoMatch) {
      videoId = vimeoMatch[1];
      platform = 'Vimeo';
      console.log('Vimeo video detected:', videoId);
    } else {
      console.log('Unknown video format, using generic embed');
      platform = 'Video';
    }

    const embedUrl = platform === 'YouTube' 
      ? `https://www.youtube.com/embed/${videoId}`
      : platform === 'Vimeo'
      ? `https://player.vimeo.com/video/${videoId}`
      : videoUrl;
    
    const htmlToInsert = `<div contenteditable="false" style="position: relative; max-width: 560px; margin: 16px 0; border-radius: 8px; overflow: hidden; background: #1a1a1a; border: 2px solid #333;">
      ${thumbnailUrl 
        ? `<img src="${thumbnailUrl}" alt="${platform} video" style="width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover;" onerror="this.style.display='none'" />` 
        : ''
      }
      <div style="aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e3a5f 0%, #0056a6 100%); ${thumbnailUrl ? 'position: absolute; inset: 0;' : ''}">
        <div style="width: 80px; height: 56px; background: rgba(255,0,0,0.9); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          <div style="width: 0; height: 0; border-left: 24px solid white; border-top: 14px solid transparent; border-bottom: 14px solid transparent; margin-left: 6px;"></div>
        </div>
      </div>
      <div style="position: absolute; bottom: 12px; left: 12px; background: rgba(0,0,0,0.8); color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">
        ▶ ${platform} Video
      </div>
    </div>&nbsp;`;
    
    console.log('Inserting HTML');
    
    // Focus the editor first
    editorRef.current?.focus();
    
    // Use insertHTML command
    const success = document.execCommand('insertHTML', false, htmlToInsert);
    console.log('insertHTML success:', success);
    
    // Manually trigger input handler
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
    
    setVideoUrl('');
    setShowVideoPopover(false);
  }, [videoUrl, onChange]);

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
            onClick={() => {
              saveSelection();
              setShowMediaLibrary(true);
            }} 
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
            ) : mediaItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Image className="h-12 w-12 mb-2 opacity-50" />
                <p>No images found in the media library</p>
                <p className="text-xs text-muted-foreground mt-1">(Nothing returned from gw_media_library)</p>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Search className="h-10 w-10 mb-2 opacity-50" />
                <p>No matches</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 p-1">
                {filteredMedia.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => insertImage(item.file_url)}
                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-muted/20"
                  >
                    <img
                      src={item.file_url}
                      alt={item.title || 'Media library image'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        console.log('Media image failed to load:', item.file_url);
                        e.currentTarget.src = '/placeholder.svg';
                      }}
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
