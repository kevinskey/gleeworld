import { useState, useRef } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Camera, Upload, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuditionForm } from "../AuditionFormProvider";
import { useCameraImport } from "@/hooks/useCameraImport";
import { useAvailableAuditionSlots } from "@/hooks/useAvailableAuditionSlots";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/utils/logger";

export function SchedulingAndSelfiePage() {
  const { form, capturedImage, setCapturedImage } = useAuditionForm();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the currently selected date for fetching available slots
  const selectedDate = form.watch('auditionDate');
  const { timeSlots, loading: slotsLoading, availableDates } = useAvailableAuditionSlots(selectedDate);

  const {
    isCapturing,
    isCameraReady,
    facingMode,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    handleFileSelect,
    switchCamera
  } = useCameraImport({
    onSuccess: (file) => {
      uploadSelfie(file);
    },
    onError: (error) => {
      toast.error("Camera error: " + error);
    }
  });

  const uploadSelfie = async (file: File) => {
    if (!user) {
      toast.error("Please log in to upload a photo");
      return;
    }

    try {
      // Convert HEIC to JPEG for iOS devices, but avoid CSP/worker issues
      let uploadFile: File = file;
      const isHeic = (file.type && file.type.toLowerCase().includes('heic')) || file.name?.toLowerCase().endsWith('.heic');
      if (isHeic) {
        // Detect whether blob workers are allowed (CSP may block them in preview)
        const canUseBlobWorker = () => {
          try {
            const blob = new Blob(["self.onmessage=function(e){}"], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const w = new Worker(url);
            w.terminate();
            URL.revokeObjectURL(url);
            return true;
          } catch {
            return false;
          }
        };

        if (canUseBlobWorker()) {
          try {
            const mod = await import('heic2any');
            const heic2any = (mod as any).default || (mod as any);
            const jpegBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
            uploadFile = new File([jpegBlob as Blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
          } catch (convErr) {
            console.warn('HEIC conversion failed or blocked, proceeding with original file:', convErr);
          }
        } else {
          console.warn('HEIC conversion skipped due to CSP worker restrictions; uploading original HEIC file.');
        }
      }

      const safeType = uploadFile.type || 'image/jpeg';
      const fileName = `audition-selfie-${user.id}-${Date.now()}.jpg`;
      const objectPath = `${user.id}/audition/${fileName}`;

      logger.info('Uploading selfie', {
        userId: user.id,
        objectPath,
        type: safeType,
        size: uploadFile.size
      });

      const { data: upData, error: upErr } = await supabase.storage
        .from('user-files')
        .upload(objectPath, uploadFile, { cacheControl: '3600', upsert: true, contentType: safeType });

      if (upErr) throw upErr;

      // Prefer signed URL (works even if bucket is private); fallback to public URL
      const { data: signed } = await supabase.storage
        .from('user-files')
        .createSignedUrl(upData.path, 60 * 60); // 1 hour

      let finalUrl: string | undefined = signed?.signedUrl;
      if (!finalUrl) {
        const { data: pub } = supabase.storage.from('user-files').getPublicUrl(upData.path);
        finalUrl = pub.publicUrl;
      }

      if (!finalUrl) {
        logger.error('Failed to generate selfie URL', { path: upData.path, signed });
        throw new Error('Could not generate file URL');
      }

      logger.info('Selfie uploaded successfully', { path: upData.path, urlPreview: finalUrl?.slice(0, 60) + '...' });

      setCapturedImage(finalUrl);
      toast.success("Selfie captured successfully!");
    } catch (error: any) {
      const status = error?.statusCode || error?.status;
      const code = error?.code;
      const msg = error?.message || (typeof error === 'string' ? error : 'Unknown error');
      logger.error('Selfie upload failed', { status, code, msg, error });
      console.error('Error uploading selfie:', { status, code, msg, error });
      if (msg?.toLowerCase?.().includes('row-level security') || status === 401 || status === 403) {
        toast.error('Permission denied while uploading. Please sign in again and try.');
      } else if (msg?.toLowerCase?.().includes('bucket') && msg?.toLowerCase?.().includes('not found')) {
        toast.error('Storage bucket not found. Please contact an administrator.');
      } else {
        toast.error(`Failed to upload selfie: ${msg}`);
      }
    }
  };

  const handleTakePhoto = async () => {
    console.log('handleTakePhoto called', { isCameraReady, isCapturing });
    
    if (!isCameraReady && !isCapturing) {
      console.log('Starting camera...');
      await startCamera();
    } else if (isCameraReady) {
      console.log('Taking photo...');
      await capturePhoto();
      stopCamera(); // Stop camera after taking photo
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) { toast.error("Please log in to upload a photo"); return; }
    handleFileSelect(event);
  };

  // Function to check if a date is available for auditions
  const isDateAvailable = (date: Date) => {
    return availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Audition Scheduling & Photo</h2>
        <p className="text-base md:text-lg lg:text-xl text-gray-600 mt-2">Choose your audition time and take a selfie</p>
      </div>

      {/* Audition Scheduling */}
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 border-b pb-2">Audition Scheduling</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="auditionDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Preferred Audition Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date() || !isDateAvailable(date)
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="auditionTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Time</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate || slotsLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !selectedDate 
                          ? "Select date first" 
                          : slotsLoading 
                            ? "Loading times..." 
                            : timeSlots.length === 0 
                              ? "No times available" 
                              : "Select time"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Selfie Section */}
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 border-b pb-2">Selfie Photo</h3>
        
        <div className="flex flex-col items-center space-y-4">
          {capturedImage ? (
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Captured selfie" 
                className="w-64 h-64 object-cover rounded-full border-4 border-purple-200"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setCapturedImage(null)}
              >
                Retake
              </Button>
            </div>
          ) : (
            <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
              {isCapturing ? (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No photo taken</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTakePhoto}
                disabled={isCapturing && !isCameraReady}
                className="px-4 py-3 text-sm md:text-base"
              >
                <Camera className="w-4 h-4 mr-2" />
                {!isCameraReady && !isCapturing ? "Start Camera" : isCameraReady ? "Take Photo" : "Starting..."}
              </Button>
              
              {isCapturing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={switchCamera}
                  disabled={!isCameraReady}
                  className="px-3 py-3"
                  title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3 text-sm md:text-base"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {!capturedImage && (
          <p className="text-base md:text-lg text-gray-600 text-center">
            Please take a selfie or upload a photo to complete your application
          </p>
        )}
      </div>
    </div>
  );
}