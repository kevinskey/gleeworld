import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { ImagePlus, MapPin, Send, Loader2, X, Users, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MobileCreatePostProps {
  userProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  onPostCreated?: () => void;
  onClose?: () => void;
}

export function MobileCreatePost({ userProfile, onPostCreated, onClose }: MobileCreatePostProps) {
  const [content, setContent] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audienceType, setAudienceType] = useState<'members' | 'exec-board' | 'selected-group'>('members');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch groups when "Selected Group" is chosen
  const fetchGroups = async () => {
    if (groups.length > 0) return;
    setLoadingGroups(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberGroups } = await supabase
        .from('gw_group_members')
        .select('group_id, gw_messaging_groups(id, name)')
        .eq('user_id', user.id);

      if (memberGroups) {
        const groupList = memberGroups
          .filter(m => m.gw_messaging_groups)
          .map(m => ({
            id: (m.gw_messaging_groups as any).id,
            name: (m.gw_messaging_groups as any).name
          }));
        setGroups(groupList);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: 'Please write something',
        description: 'Your post cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('gw_social_posts').insert({
        user_id: user.id,
        content: content.trim(),
        location_tag: locationTag.trim() || null,
        media_urls: mediaUrls,
      });

      if (error) throw error;

      setContent('');
      setLocationTag('');
      setShowLocation(false);
      setMediaUrls([]);

      toast({
        title: 'Posted!',
        description: 'Your post is now live in the lounge',
      });

      onPostCreated?.();
      onClose?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Failed to post',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('social-posts')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from('social-posts').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      setMediaUrls(prev => [...prev, ...uploadedUrls]);
      toast({ title: 'Media uploaded', description: `${files.length} file(s) added` });
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const isVideo = (url: string) => url.match(/\.(mp4|mov|webm|ogg)$/i);

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getAvatarUrl(userProfile?.avatar_url) || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(userProfile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-foreground">{userProfile?.full_name || 'Member'}</p>
            {/* Audience selector */}
            <Select 
              value={audienceType} 
              onValueChange={(value: 'members' | 'exec-board' | 'selected-group') => {
                setAudienceType(value);
                if (value === 'selected-group') fetchGroups();
              }}
            >
              <SelectTrigger className="h-6 w-auto border-0 p-0 text-xs text-muted-foreground hover:text-foreground">
                <Users className="h-3 w-3 mr-1" />
                <SelectValue />
                <ChevronDown className="h-3 w-3 ml-1" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="members">Members</SelectItem>
                <SelectItem value="exec-board">Exec-Board</SelectItem>
                <SelectItem value="selected-group">Selected Group</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="rounded-full px-4"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
        </Button>
      </div>

      {/* Group selector (shows when "Selected Group" is chosen) */}
      {audienceType === 'selected-group' && (
        <div className="py-2 border-b border-border">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder={loadingGroups ? "Loading groups..." : "Choose a group"} />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
              {groups.length === 0 && !loadingGroups && (
                <p className="text-xs text-muted-foreground p-2">No groups found</p>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto py-3">
        <Textarea
          placeholder={`What's on your mind, ${userProfile?.full_name?.split(' ')[0] || 'friend'}?`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] border-0 resize-none text-base focus-visible:ring-0 p-0 placeholder:text-muted-foreground"
          autoFocus
        />

        {/* Location input */}
        {showLocation && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Add location..."
              value={locationTag}
              onChange={(e) => setLocationTag(e.target.value)}
              className="flex-1 bg-transparent border-0 text-sm focus:outline-none"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setShowLocation(false);
                setLocationTag('');
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Media previews */}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {mediaUrls.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                {isVideo(url) ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : (
                  <img src={url} alt="" className="w-full h-full object-cover" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full"
                  onClick={() => removeMedia(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar - fixed at bottom */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleMediaUpload}
        />
        
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start gap-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span className="text-sm">Photo/Video</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 justify-start gap-2 ${showLocation ? 'text-primary bg-primary/10' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
          onClick={() => setShowLocation(!showLocation)}
        >
          <MapPin className="h-4 w-4" />
          <span className="text-sm">Location</span>
        </Button>
      </div>
    </div>
  );
}
