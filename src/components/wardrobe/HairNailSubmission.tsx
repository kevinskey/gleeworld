import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { QuickCameraCapture } from '@/components/camera/QuickCameraCapture';

export const HairNailSubmission = () => {
  const { user } = useAuth();
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submissionType, setSubmissionType] = useState<'hair' | 'nails' | 'both'>('hair');
  const [notes, setNotes] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImageToStorage = async (file: File): Promise<{ url: string; path: string } | null> => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `${user?.id}/${submissionType}-${timestamp}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('hair-nail-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('hair-nail-photos')
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage || !user) {
      toast.error('Please select an image and ensure you are logged in');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload image to storage
      const uploadResult = await uploadImageToStorage(selectedImage);
      if (!uploadResult) throw new Error('Failed to upload image');

      // Save submission to database
      const { error } = await supabase
        .from('gw_hair_nail_submissions')
        .insert({
          user_id: user.id,
          submission_type: submissionType,
          image_url: uploadResult.url,
          image_path: uploadResult.path,
          notes: notes || null,
          event_name: eventName || null,
          event_date: eventDate || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Hair/nail submission sent for approval!');
      
      // Reset form
      setSelectedImage(null);
      setImagePreview(null);
      setNotes('');
      setEventName('');
      setEventDate('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Failed to submit for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCameraCapture = (imageUrl: string) => {
    // Convert blob URL to File object for consistency
    fetch(imageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setSelectedImage(file);
        setImagePreview(imageUrl);
      });
    setShowCamera(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Hair & Nail Approval Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="submission-type">Submission Type</Label>
              <Select value={submissionType} onValueChange={(value: 'hair' | 'nails' | 'both') => setSubmissionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hair">Hair Only</SelectItem>
                  <SelectItem value="nails">Nails Only</SelectItem>
                  <SelectItem value="both">Hair & Nails</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event-name">Event Name (Optional)</Label>
              <Input
                id="event-name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Spring Concert"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="event-date">Event Date (Optional)</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requirements or questions..."
              rows={3}
            />
          </div>

          {/* Image Selection */}
          <div className="space-y-3">
            <Label>Photo Submission</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCamera(true)}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-w-md mx-auto rounded-lg border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedImage || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </CardContent>
      </Card>

      {/* Camera Modal */}
      {showCamera && (
        <QuickCameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </>
  );
};