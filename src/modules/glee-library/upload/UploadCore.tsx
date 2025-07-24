import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateSheetMusicFilename } from '@/lib/music-library/file-naming';
import { logSheetMusicAction, getDeviceType } from '@/lib/music-library/analytics';

export interface UploadFormData {
  title: string;
  composer?: string;
  arranger?: string;
  keySignature?: string;
  timeSignature?: string;
  tempoMarking?: string;
  difficultyLevel?: string;
  voiceParts?: string[];
  language?: string;
  tags?: string[];
  isPublic: boolean;
  voicePart?: string;
}

export interface UploadProgress {
  stage: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export const useSheetMusicUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: ''
  });

  const uploadSheetMusic = async (file: File, formData: UploadFormData): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload sheet music.",
        variant: "destructive",
      });
      return null;
    }

    try {
      setUploadProgress({
        stage: 'uploading',
        progress: 10,
        message: 'Generating filename...'
      });

      // Generate standardized filename
      const filename = await generateSheetMusicFilename({
        title: formData.title,
        composer: formData.composer,
        voicePart: formData.voicePart,
      });

      setUploadProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading file...'
      });

      // Upload file to storage
      const filePath = `${user.id}/${filename}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sheet-music')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress({
        stage: 'processing',
        progress: 60,
        message: 'Creating database record...'
      });

      // Create database record
      const { data: sheetMusicData, error: dbError } = await supabase
        .from('gw_sheet_music')
        .insert({
          title: formData.title,
          composer: formData.composer || null,
          arranger: formData.arranger || null,
          key_signature: formData.keySignature || null,
          time_signature: formData.timeSignature || null,
          tempo_marking: formData.tempoMarking || null,
          difficulty_level: formData.difficultyLevel || null,
          voice_parts: formData.voiceParts || null,
          language: formData.language || null,
          tags: formData.tags || null,
          pdf_url: uploadData.path,
          is_public: formData.isPublic,
          created_by: user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress({
        stage: 'processing',
        progress: 80,
        message: 'Logging analytics...'
      });

      // Log analytics
      await logSheetMusicAction({
        sheetMusicId: sheetMusicData.id,
        userId: user.id,
        actionType: 'view',
        deviceType: getDeviceType()
      });

      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      });

      toast({
        title: "Upload Successful",
        description: `"${formData.title}" has been uploaded to the library.`,
      });

      return sheetMusicData.id;

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: 'Upload failed'
      });
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
      
      return null;
    }
  };

  const resetUpload = () => {
    setUploadProgress({
      stage: 'idle',
      progress: 0,
      message: ''
    });
  };

  return {
    uploadSheetMusic,
    uploadProgress,
    resetUpload,
    isUploading: uploadProgress.stage !== 'idle' && uploadProgress.stage !== 'complete' && uploadProgress.stage !== 'error'
  };
};