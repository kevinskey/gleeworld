import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Upload, Youtube } from 'lucide-react';
import { useFileUpload } from '@/integrations/supabase/hooks/useFileUpload';

interface MediaUploadSectionProps {
  onMediaChange: (mediaType: string | null, mediaUrl: string | null, youtubeId: string | null) => void;
  initialMediaType?: string | null;
  initialMediaUrl?: string | null;
  initialYoutubeId?: string | null;
}

export const MediaUploadSection = ({ onMediaChange, initialMediaType = null, initialMediaUrl = null, initialYoutubeId = '' }: MediaUploadSectionProps) => {
  const [mediaType, setMediaType] = useState<string | null>(initialMediaType);
  const [youtubeId, setYoutubeId] = useState(initialYoutubeId || '');
  const { uploadFile, uploading } = useFileUpload();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await uploadFile(file, 'course-materials');
    if (url) {
      onMediaChange(mediaType, url, null);
    }
  };

  const handleYoutubeChange = (value: string) => {
    setYoutubeId(value);
    // Extract video ID from YouTube URL
    const videoIdMatch = value.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const extractedId = videoIdMatch ? videoIdMatch[1] : value;
    onMediaChange('youtube', null, extractedId);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Attach Media (Optional)</Label>
        <Select
          value={mediaType || (initialMediaType ? initialMediaType : 'none')}
          onValueChange={(value) => {
            const newType = value === 'none' ? null : value;
            setMediaType(newType);
            if (newType === null) {
              onMediaChange(null, null, null);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select media type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Media</SelectItem>
            <SelectItem value="audio">Audio File</SelectItem>
            <SelectItem value="video">Video File</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="youtube">YouTube Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mediaType && mediaType !== 'youtube' && (
        <div>
          <Label htmlFor="media_file">Upload {mediaType}</Label>
          <Input
            id="media_file"
            type="file"
            onChange={handleFileUpload}
            accept={
              mediaType === 'audio' ? 'audio/*' :
              mediaType === 'video' ? 'video/*' :
              mediaType === 'image' ? 'image/*' :
              mediaType === 'pdf' ? '.pdf' : '*'
            }
            disabled={uploading}
          />
          {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
        </div>
      )}

      {mediaType === 'youtube' && (
        <div>
          <Label htmlFor="youtube_id">
            <Youtube className="inline h-4 w-4 mr-2" />
            YouTube Video URL or ID
          </Label>
          <Input
            id="youtube_id"
            value={youtubeId}
            onChange={(e) => handleYoutubeChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or video ID"
          />
        </div>
      )}
    </div>
  );
};