import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { usePracticeRecordings } from '@/hooks/usePracticeRecordings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Loader2 } from 'lucide-react';
import { uploadFileAndGetUrl } from '@/utils/storage';

interface CreatePracticeRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VOICE_PARTS = [
  { value: 'Soprano I', label: 'Soprano I' },
  { value: 'Soprano II', label: 'Soprano II' },
  { value: 'Alto I', label: 'Alto I' },
  { value: 'Alto II', label: 'Alto II' },
];

export const CreatePracticeRecordingDialog: React.FC<CreatePracticeRecordingDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { sheetMusic } = useSheetMusic();
  const { createPracticeRecording, uploading } = usePracticeRecordings();
  
  const [formData, setFormData] = useState({
    title: '',
    musicId: '',
    voicePart: userProfile?.voice_part || '',
    notes: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!audioFile || !formData.musicId || !formData.title) {
      return;
    }

    setUploadingFile(true);
    try {
      // Upload audio file
      const uploadResult = await uploadFileAndGetUrl(audioFile, 'practice-recordings', user?.id || '');
      
      if (!uploadResult) {
        throw new Error('Failed to upload audio file');
      }

      // Create practice recording record
      const success = await createPracticeRecording(
        formData.musicId,
        formData.title,
        uploadResult.url,
        formData.voicePart,
        formData.notes
      );

      if (success) {
        // Reset form
        setFormData({
          title: '',
          musicId: '',
          voicePart: userProfile?.voice_part || '',
          notes: '',
        });
        setAudioFile(null);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating practice recording:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid audio file (MP3, WAV, OGG, or M4A)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      setAudioFile(file);
    }
  };

  const isLoading = uploading || uploadingFile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Practice Recording</DialogTitle>
          <DialogDescription>
            Upload a practice recording for your voice section. This will be visible to members of the selected voice part.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Recording Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Soprano I - Amazing Grace practice"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="musicId">Associated Sheet Music</Label>
            <Select
              value={formData.musicId}
              onValueChange={(value) => setFormData({ ...formData, musicId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sheet music" />
              </SelectTrigger>
              <SelectContent>
                {sheetMusic.map((music) => (
                  <SelectItem key={music.id} value={music.id}>
                    {music.title} {music.composer && `- ${music.composer}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voicePart">Target Voice Part</Label>
            <Select
              value={formData.voicePart}
              onValueChange={(value) => setFormData({ ...formData, voicePart: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice part" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_PARTS.map((part) => (
                  <SelectItem key={part.value} value={part.value}>
                    {part.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audioFile">Audio File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="audioFile"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                required
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {audioFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or instructions for the section..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingFile ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                'Create Recording'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};