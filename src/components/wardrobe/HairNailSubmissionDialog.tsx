import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Palette } from "lucide-react";
import { QuickCameraCapture } from "@/components/camera/QuickCameraCapture";
import { useHairNailSubmissions } from "@/hooks/useHairNailSubmissions";

interface HairNailSubmissionDialogProps {
  children: React.ReactNode;
}

export const HairNailSubmissionDialog = ({ children }: HairNailSubmissionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissionType, setSubmissionType] = useState<'hair' | 'nails' | 'both'>('hair');
  const [notes, setNotes] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { submitForApproval } = useHairNailSubmissions();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCameraCapture = async (imageUrl: string) => {
    // Convert blob URL to File object
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `hair-nail-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setShowCamera(false);
    } catch (error) {
      console.error('Error converting captured image:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    try {
      await submitForApproval(selectedFile, {
        submission_type: submissionType,
        notes: notes.trim() || undefined,
        event_name: eventName.trim() || undefined,
        event_date: eventDate || undefined
      });

      // Reset form
      setSelectedFile(null);
      setNotes('');
      setEventName('');
      setEventDate('');
      setSubmissionType('hair');
      setOpen(false);
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showCamera) {
    return (
      <QuickCameraCapture
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Submit Hair & Nail Design
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="submission-type">Submission Type</Label>
            <Select value={submissionType} onValueChange={(value: 'hair' | 'nails' | 'both') => setSubmissionType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hair">Hair Design</SelectItem>
                <SelectItem value="nails">Nail Design</SelectItem>
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
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special requests or details about your design..."
              rows={3}
            />
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-3">
            <Label>Upload Photo</Label>
            
            {selectedFile ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Selected"
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  className="h-20 flex-col gap-2"
                >
                  <Camera className="h-6 w-6" />
                  Take Photo
                </Button>
                
                <label className="cursor-pointer">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2 w-full"
                    type="button"
                  >
                    <Upload className="h-6 w-6" />
                    Upload File
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};