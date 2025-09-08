import React, { useState } from 'react';
import { PageCard } from './PageShell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Send,
  Image,
  Smile,
  Heart,
  Activity,
  MessageSquare,
  Megaphone,
  X
} from 'lucide-react';

interface CommunityComposerProps {
  onSubmit?: (content: { type: string; title?: string; content: string; tags?: string[] }) => void;
  onCancel?: () => void;
  placeholder?: string;
  compact?: boolean;
  className?: string;
}

export const CommunityComposer: React.FC<CommunityComposerProps> = ({
  onSubmit,
  onCancel,
  placeholder = "Share something with the community...",
  compact = false,
  className = ""
}) => {
  const [entryType, setEntryType] = useState<string>('announcement');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const entryTypes = [
    { value: 'announcement', label: 'Announcement', icon: Megaphone, color: 'blue' },
    { value: 'love_note', label: 'Love Note', icon: Heart, color: 'pink' },
    { value: 'wellness_check', label: 'Wellness Check', icon: Activity, color: 'green' },
    { value: 'message', label: 'Message', icon: MessageSquare, color: 'purple' }
  ];

  const handleSubmit = () => {
    if (!content.trim()) return;
    
    onSubmit?.({
      type: entryType,
      title: title.trim() || undefined,
      content: content.trim(),
      tags: tags.length > 0 ? tags : undefined
    });

    // Reset form
    setTitle('');
    setContent('');
    setTags([]);
    setNewTag('');
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const selectedType = entryTypes.find(type => type.value === entryType);

  return (
    <PageCard 
      className={cn(
        "border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors",
        className
      )}
      title={!compact ? "Share with Community" : undefined}
      actions={
        !compact && onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4 md:space-y-6">
        {/* Entry Type Selector */}
        <Select value={entryType} onValueChange={setEntryType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {entryTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Title Input (optional for most types) */}
        {entryType !== 'love_note' && (
          <Input
            placeholder={`${selectedType?.label} title (optional)`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-0 border-b border-muted rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
        )}

        {/* Content Textarea */}
        <Textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyPress}
          className={cn(
            "min-h-[100px] border-0 p-0 resize-none focus-visible:ring-0",
            compact && "min-h-[80px]"
          )}
        />

        {/* Tags Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add tags..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addTag}
              disabled={!newTag.trim()}
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSubmit}
              disabled={!content.trim()}
              size="sm"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {compact ? 'Post' : 'Share'}
            </Button>
          </div>
        </div>

        {/* Character count for long content */}
        {content.length > 200 && (
          <div className="text-xs text-muted-foreground text-right">
            {content.length} characters
          </div>
        )}
      </div>
    </PageCard>
  );
};