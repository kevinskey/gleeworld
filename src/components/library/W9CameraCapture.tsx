import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Camera, Upload, FileText, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from 'jspdf';

export const W9CameraCapture = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [users, setUsers] = useState<Array<{id: string, full_name: string, email: string}>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [existingW9, setExistingW9] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      console.log('Starting camera...');
      
      // Check if we already have a stream
      if (stream) {
        console.log('Camera already active');
        return;
      }
      
      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      // Set capturing state first to render video element
      setIsCapturing(true);
      
      // Use requestAnimationFrame to ensure DOM is updated
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!videoRef.current) {
        setIsCapturing(false);
        throw new Error('Camera interface failed to load. Please close and reopen the dialog.');
      }
      
      // Portrait constraints for 8.5x11 document capture (8.5:11 ratio ≈ 0.77:1)
      let constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1056, min: 720 },   // 8.5 * 124 ≈ 1056
          height: { ideal: 1364, min: 936 }   // 11 * 124 ≈ 1364 (8.5:11 ratio)
        },
        audio: false
      };
      
      // Fallback to basic constraints if environment camera fails
      let fallbackConstraints = {
        video: true,
        audio: false
      };
      
      console.log('Requesting camera access...');
      let mediaStream;
      
      try {
        // Try with environment camera first
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.log('Environment camera failed, trying fallback:', error);
        // Fallback to any available camera
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (fallbackError) {
          console.error('Both camera attempts failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      const videoTracks = mediaStream.getVideoTracks();
      console.log('Camera stream obtained:', videoTracks.length, 'video tracks');
      
      if (videoTracks.length === 0) {
        mediaStream.getTracks().forEach(track => track.stop());
        throw new Error('No video tracks available from camera');
      }

      const video = videoRef.current;
      console.log('Setting up video element...');
      
      // Set video properties for maximum compatibility
      video.setAttribute('playsinline', 'true');  
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('controls', 'false');
      video.muted = true;
      video.autoplay = true;
      video.defaultMuted = true;
      video.playsInline = true;
      
      // Set up event handlers before assigning stream
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
      };
      
      video.onerror = (e) => {
        console.error('Video element error:', e);
      };
      
      // Assign stream and update state
      video.srcObject = mediaStream;
      setStream(mediaStream);
      setIsCapturing(true);
      
      // Try to play the video
      try {
        console.log('Attempting to play video...');
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Video playing successfully');
        }
      } catch (playError) {
        console.error('Error playing video:', playError);
        // Don't throw here, the video might still work for capturing
        console.log('Video play error, but continuing...');
      }
      
      console.log('Camera initialization complete');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Clean up any partial stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      let errorMessage = 'Unable to access camera. ';
      
      if (error instanceof Error) {
        console.log('Error details:', error.name, error.message);
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera access in your browser settings and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported on this device.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Camera is being used by another application. Please close other apps and try again.';
        } else {
          errorMessage += `${error.message}. Please check camera permissions and ensure you\'re using HTTPS.`;
        }
      }
      
      setCameraError(errorMessage);
      setIsCapturing(false);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [stream, toast]);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
          console.log('Camera track stopped:', track.kind);
        }
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset video element
    }
    setIsCapturing(false);
    setCameraError(null);
  }, [stream]);

  // Clean up camera when dialog closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setShowUserSelection(false);
      setSelectedUserId("");
      setExistingW9(null);
      setShowDuplicateDialog(false);
    }
    
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, stopCamera, stream]);

  // Fetch all users when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const checkExistingW9 = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('w9_forms')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error checking for existing W9:', error);
      return null;
    }
  };

  const handleUserSelection = async (userId: string) => {
    setSelectedUserId(userId);
    
    if (userId) {
      const existing = await checkExistingW9(userId);
      if (existing) {
        setExistingW9(existing);
        setShowDuplicateDialog(true);
      }
    }
  };

  const handleContinueWithDuplicate = (keepBoth: boolean) => {
    setShowDuplicateDialog(false);
    processW9FormForUser(selectedUserId, keepBoth);
  };

  const proceedToUserSelection = () => {
    setShowUserSelection(true);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      toast({
        title: "Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Capturing photo...');
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        console.error('Canvas context not available');
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      // Draw the video frame to canvas with timeout protection
      const drawPromise = new Promise<void>((resolve) => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Use requestAnimationFrame to prevent blocking
        requestAnimationFrame(() => resolve());
      });

      await drawPromise;

      // Reduce image quality to prevent system lockup
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      console.log('Image captured, data URL length:', imageDataUrl.length);
      
      setCapturedImage(imageDataUrl);
      stopCamera();
      
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast({
        title: "Capture Error",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processW9FormForUser = async (userId: string, keepBoth: boolean = true) => {
    if (!capturedImage) return;

    setIsProcessing(true);

    try {
      console.log('Starting W9 processing for user:', userId);
      
      // If not keeping both and there's an existing W9, delete the old one first
      if (!keepBoth && existingW9) {
        const { error: deleteError } = await supabase
          .from('w9_forms')
          .delete()
          .eq('id', existingW9.id);

        if (deleteError) {
          console.warn('Failed to delete existing W9:', deleteError);
        }

        // Also try to delete the old file from storage
        if (existingW9.storage_path) {
          const { error: storageDeleteError } = await supabase.storage
            .from('w9-forms')
            .remove([existingW9.storage_path]);

          if (storageDeleteError) {
            console.warn('Failed to delete existing W9 file:', storageDeleteError);
          }
        }
      }
      
      // Create PDF from captured image
      const fileName = `${userId}/w9-form-${Date.now()}.pdf`;
      const pdfBlob = await createPDFFromImage(capturedImage);
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, pdfBlob);

      if (uploadError) {
        throw uploadError;
      }

      // Create W9 form record with basic data
      const { error: dbError } = await supabase
        .from('w9_forms')
        .insert({
          user_id: userId,
          storage_path: fileName,
          status: 'submitted',
          form_data: {
            capture_method: 'admin_assigned',
            captured_at: new Date().toISOString(),
            pdf_generated: true,
            requires_manual_review: true,
            assigned_by_admin: user?.id
          }
        });

      if (dbError) {
        throw dbError;
      }

      const selectedUser = users.find(u => u.id === userId);
      toast({
        title: "W9 Form Saved",
        description: `W9 form saved for ${selectedUser?.full_name || 'selected user'}. ${!keepBoth && existingW9 ? 'Previous W9 replaced.' : 'Ready for admin review.'}`,
      });

      // Reset state immediately
      setCapturedImage(null);
      setShowUserSelection(false);
      setSelectedUserId("");
      setExistingW9(null);
      setIsOpen(false);
      
    } catch (error) {
      console.error('Error processing W9 form:', error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Failed to save W9 form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processW9Form = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user first.",
        variant: "destructive",
      });
      return;
    }

    // If there's an existing W9, the duplicate dialog should have handled this
    // If no existing W9, proceed directly
    if (!existingW9) {
      processW9FormForUser(selectedUserId, true);
    }
  };

  // Helper function to make PDF generation non-blocking
  const createPDFFromImage = async (imageDataUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const pdf = new jsPDF();
        const img = new Image();
        
        img.onload = () => {
          // Use requestAnimationFrame to prevent blocking
          requestAnimationFrame(() => {
            try {
              // Calculate dimensions to fit the page
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgRatio = img.width / img.height;
              const pdfRatio = pdfWidth / pdfHeight;

              let finalWidth, finalHeight;
              if (imgRatio > pdfRatio) {
                finalWidth = pdfWidth;
                finalHeight = pdfWidth / imgRatio;
              } else {
                finalHeight = pdfHeight;
                finalWidth = pdfHeight * imgRatio;
              }

              pdf.addImage(imageDataUrl, 'JPEG', 0, 0, finalWidth, finalHeight);
              const pdfBlob = pdf.output('blob');
              resolve(pdfBlob);
            } catch (error) {
              reject(error);
            }
          });
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageDataUrl;
        
        // Add timeout for image loading
        setTimeout(() => reject(new Error('Image loading timeout')), 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Camera className="h-4 w-4 mr-2" />
          Capture W9 Form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture W9 Form</DialogTitle>
          <DialogDescription>
            Take a photo of your W9 form or upload an image - it will be saved as a PDF for admin review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isCapturing && !capturedImage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={startCamera} className="h-20">
                  <Camera className="h-6 w-6 mr-2" />
                  Use Camera
                </Button>
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  className="h-20"
                >
                  <Upload className="h-6 w-6 mr-2" />
                  Upload Image
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {cameraError && (
                <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">
                  {cameraError}
                </div>
              )}
            </div>
          )}

          {isCapturing && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '8.5/11', minHeight: '400px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => console.log('Video metadata loaded')}
                  onError={(e) => console.error('Video error:', e)}
                />
                <canvas ref={canvasRef} className="hidden" />
                {(!stream || cameraError) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-white text-center">
                      {!cameraError ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p>Loading camera...</p>
                          <p className="text-sm mt-2">Please allow camera access if prompted</p>
                        </>
                      ) : (
                        <>
                          <Camera className="h-8 w-8 mx-auto mb-2 text-red-400" />
                          <p className="text-red-300">Camera Error</p>
                          <p className="text-sm mt-2">{cameraError}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {cameraError && (
                <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded">
                  {cameraError}
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  onClick={capturePhoto} 
                  className="flex-1" 
                  disabled={!stream || !!cameraError}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {capturedImage && !showUserSelection && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured W9 Form"
                  className="w-full rounded-lg border"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={proceedToUserSelection} 
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Select User
                </Button>
                <Button onClick={retakePhoto} variant="outline">
                  Retake
                </Button>
              </div>
            </div>
          )}

          {capturedImage && showUserSelection && (
            <div className="space-y-4">
              <div className="relative mb-4">
                <img
                  src={capturedImage}
                  alt="Captured W9 Form"
                  className="w-full h-32 object-cover rounded-lg border"
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Assign W9 Form to User
                  </label>
                  {loadingUsers ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading users...
                    </div>
                  ) : (
                    <Select value={selectedUserId} onValueChange={handleUserSelection}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select a user..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.full_name || 'Unnamed User'}</span>
                              <span className="text-xs text-gray-500">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={processW9Form} 
                    disabled={isProcessing || !selectedUserId}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Save W9 Form
                      </>
                    )}
                  </Button>
                  <Button onClick={retakePhoto} variant="outline">
                    Retake
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Duplicate W9 Handling Dialog */}
        <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Existing W9 Form Found</AlertDialogTitle>
              <AlertDialogDescription>
                {users.find(u => u.id === selectedUserId)?.full_name || 'This user'} already has a W9 form on file. 
                What would you like to do?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDuplicateDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <Button 
                variant="outline" 
                onClick={() => handleContinueWithDuplicate(true)}
              >
                Keep Both
              </Button>
              <AlertDialogAction 
                onClick={() => handleContinueWithDuplicate(false)}
                className="bg-red-600 hover:bg-red-700"
              >
                Replace Existing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
