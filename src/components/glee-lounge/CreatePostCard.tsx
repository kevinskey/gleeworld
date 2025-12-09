import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { ImagePlus, MapPin, Send, Loader2, X, Camera, Check, Video, Users, FileText, Settings, ChevronDown, Home, Mic, Monitor, Smile, MapPinIcon, BarChart3, MessageSquare, Expand, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PollCreator } from '@/components/messaging/PollCreator';
interface CreatePostCardProps {
  userProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  onPostCreated?: () => void;
}
interface GleeCamPhoto {
  name: string;
  url: string;
  created_at: string;
  category?: string;
}
export function CreatePostCard({
  userProfile,
  onPostCreated
}: CreatePostCardProps) {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [gleeCamPhotos, setGleeCamPhotos] = useState<GleeCamPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [liveStep, setLiveStep] = useState<'setup' | 'details' | 'live'>('setup');
  const [videoSource, setVideoSource] = useState<'webcam' | 'streaming'>('webcam');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDescription, setLiveDescription] = useState('');
  const [shareToStory, setShareToStory] = useState(true);
  const [postDestination, setPostDestination] = useState<'profile' | 'timeline'>('profile');
  const [goLiveWhen, setGoLiveWhen] = useState<'now' | 'scheduled'>('now');
  const [audienceType, setAudienceType] = useState<'friends' | 'public' | 'private'>('friends');
  const [activeSection, setActiveSection] = useState<'setup' | 'dashboard' | 'settings' | 'interactivity'>('setup');
  const [showSettings, setShowSettings] = useState(false);
  const [showInteractivity, setShowInteractivity] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  // Interactivity settings (Facebook Live style)
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [reactionsEnabled, setReactionsEnabled] = useState(true);
  const [qnaEnabled, setQnaEnabled] = useState(false);
  const [pollsEnabled, setPollsEnabled] = useState(false);
  const [showLivePollCreator, setShowLivePollCreator] = useState(false);
  const [livePolls, setLivePolls] = useState<{question: string, id: string}[]>([]);
  
  // Video/Audio on/off state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Video element refs to prevent re-render loops
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  
  const {
    toast
  } = useToast();

  // Fetch ALL Glee Cam photos from media library (consolidated view)
  const fetchGleeCamPhotos = async () => {
    setLoadingPhotos(true);
    try {
      // Fetch from gw_media_library where bucket_id is quick-capture-media
      // This gives us a consolidated view of all Glee Cam photos across all users
      const {
        data: mediaItems,
        error: mediaError
      } = await supabase.from('gw_media_library').select(`
          id,
          file_url,
          title,
          created_at,
          glee_cam_category_id,
          glee_cam_categories (
            name,
            slug
          )
        `).eq('bucket_id', 'quick-capture-media').order('created_at', {
        ascending: false
      }).limit(100);
      if (mediaError) {
        console.error('Media library error:', mediaError);
        // Fallback to storage bucket listing for user's own photos
        await fetchUserPhotosFromStorage();
        return;
      }
      if (mediaItems && mediaItems.length > 0) {
        const photos: GleeCamPhoto[] = mediaItems.filter(item => item.file_url).map(item => ({
          name: item.title || 'Glee Cam Photo',
          url: item.file_url,
          created_at: item.created_at || '',
          category: (item.glee_cam_categories as any)?.name || 'Uncategorized'
        }));
        setGleeCamPhotos(photos);
      } else {
        // No items in media library, try storage directly
        await fetchUserPhotosFromStorage();
      }
    } catch (error) {
      console.error('Error fetching Glee Cam photos:', error);
      await fetchUserPhotosFromStorage();
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Fallback: Fetch from storage bucket directly (user's own photos)
  const fetchUserPhotosFromStorage = async () => {
    if (!userProfile?.user_id) {
      setGleeCamPhotos([]);
      return;
    }
    try {
      const {
        data: folders
      } = await supabase.storage.from('quick-capture-media').list(userProfile.user_id, {
        limit: 100
      });
      const allPhotos: GleeCamPhoto[] = [];
      for (const folder of folders || []) {
        if (!folder.name.includes('.')) {
          const {
            data: files
          } = await supabase.storage.from('quick-capture-media').list(`${userProfile.user_id}/${folder.name}`, {
            limit: 50,
            sortBy: {
              column: 'created_at',
              order: 'desc'
            }
          });
          if (files) {
            const mediaFiles = files.filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i)).map(file => {
              const {
                data
              } = supabase.storage.from('quick-capture-media').getPublicUrl(`${userProfile.user_id}/${folder.name}/${file.name}`);
              return {
                name: file.name,
                url: data.publicUrl,
                created_at: file.created_at || '',
                category: folder.name
              };
            });
            allPhotos.push(...mediaFiles);
          }
        }
      }
      allPhotos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setGleeCamPhotos(allPhotos.slice(0, 50));
    } catch (error) {
      console.error('Error fetching from storage:', error);
      setGleeCamPhotos([]);
    }
  };
  // Get available media devices
  const getMediaDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
      
      const cameras = devices.filter(d => d.kind === 'videoinput');
      const mics = devices.filter(d => d.kind === 'audioinput');
      
      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
      if (mics.length > 0 && !selectedMic) {
        setSelectedMic(mics[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  // Request camera access
  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: selectedCamera } : true,
        audio: selectedMic ? { deviceId: selectedMic } : true
      });
      setCameraStream(stream);
      setCameraPermission('granted');
      await getMediaDevices();
    } catch (error) {
      console.error('Camera access denied:', error);
      setCameraPermission('denied');
    }
  };

  // Stop camera stream
  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      setCameraStream(null);
      setCameraPermission('pending');
    }
  };

  // Stop screen share
  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  };

  // Start screen share
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // Listen for when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      toast({
        title: "Screen sharing started",
        description: "Your screen is now being shared"
      });
    } catch (error) {
      console.error('Screen share error:', error);
      toast({
        title: "Screen share failed",
        description: "Could not start screen sharing",
        variant: "destructive"
      });
    }
  };

  // Toggle video track on/off
  const toggleVideo = () => {
    if (cameraStream) {
      const videoTracks = cameraStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
      toast({
        title: videoEnabled ? "Video off" : "Video on",
        description: videoEnabled ? "Your camera is now disabled" : "Your camera is now enabled"
      });
    }
  };

  // Toggle audio track on/off
  const toggleAudio = () => {
    if (cameraStream) {
      const audioTracks = cameraStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
      toast({
        title: audioEnabled ? "Mic off" : "Mic on",
        description: audioEnabled ? "Your microphone is muted" : "Your microphone is unmuted"
      });
    }
  };

  // Handle give feedback
  const handleGiveFeedback = () => {
    toast({
      title: "Feedback",
      description: "Thank you for your interest! Feedback feature coming soon."
    });
  };

  // Handle dialog close
  const handleLiveDialogClose = (open: boolean) => {
    if (!open) {
      // Force stop all tracks
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
      setScreenStream(null);
      setIsScreenSharing(false);
      setLiveStep('setup');
      setCameraPermission('pending');
      setLiveTitle('');
      setLiveDescription('');
      setSelectedCamera('');
      setSelectedMic('');
      setActiveSection('setup');
      setShowSettings(false);
      setShowInteractivity(false);
      // Reset video/audio states
      setVideoEnabled(true);
      setAudioEnabled(true);
    }
    setShowLiveCamera(open);
  };

  // Cleanup on unmount
  // Attach camera stream to video element
  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Attach screen stream to video element
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (showPhotoPicker) {
      fetchGleeCamPhotos();
    }
  }, [showPhotoPicker, userProfile?.user_id]);

  useEffect(() => {
    if (showLiveCamera && liveStep === 'setup') {
      getMediaDevices();
    }
    // Cleanup when dialog closes
    if (!showLiveCamera && cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [showLiveCamera, liveStep]);
  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: 'Please write something',
        description: 'Your post cannot be empty',
        variant: 'destructive'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const {
        error
      } = await supabase.from('gw_social_posts').insert({
        user_id: user.id,
        content: content.trim(),
        location_tag: locationTag.trim() || null,
        media_urls: mediaUrls
      });
      if (error) throw error;
      setContent('');
      setLocationTag('');
      setShowLocation(false);
      setMediaUrls([]);
      toast({
        title: 'Posted!',
        description: 'Your post is now live in the lounge'
      });
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Failed to post',
        description: 'Please try again',
        variant: 'destructive'
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const {
          data,
          error
        } = await supabase.storage.from('social-posts').upload(`${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
        if (error) throw error;
        const {
          data: urlData
        } = supabase.storage.from('social-posts').getPublicUrl(`${fileName}`);
        uploadedUrls.push(urlData.publicUrl);
      }
      setMediaUrls(prev => [...prev, ...uploadedUrls]);
      toast({
        title: 'Media uploaded',
        description: `${files.length} file(s) added`
      });
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  const togglePhotoSelection = (url: string) => {
    setSelectedPhotos(prev => prev.includes(url) ? prev.filter(p => p !== url) : [...prev, url]);
  };
  const addSelectedPhotos = () => {
    setMediaUrls(prev => [...prev, ...selectedPhotos]);
    setSelectedPhotos([]);
    setShowPhotoPicker(false);
    toast({
      title: 'Photos added',
      description: `${selectedPhotos.length} photo(s) from Glee Cam added`
    });
  };
  const isVideo = (url: string) => {
    return url.match(/\.(mp4|mov|webm|ogg)$/i);
  };
  return <Card className="mb-4 border-0 shadow-sm bg-card">
      <CardContent className="p-3">
        {/* Compact horizontal layout */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={getAvatarUrl(userProfile?.avatar_url) || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(userProfile?.full_name)}
            </AvatarFallback>
          </Avatar>
          
          {/* Pill-shaped input area */}
          <div 
            className="flex-1 flex items-center bg-muted/50 hover:bg-muted/70 rounded-full px-4 py-3 cursor-pointer transition-colors"
            onClick={() => document.getElementById('post-textarea')?.focus()}
          >
            <span className="text-muted-foreground text-sm">
              What's on your mind, {userProfile?.full_name?.split(' ')[0] || 'friend'}?
            </span>
          </div>

          {/* Colorful action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Live Camera/Video - Red */}
            <Dialog open={showLiveCamera} onOpenChange={handleLiveDialogClose}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Video className="h-5 w-5 text-red-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl p-0 overflow-hidden">
                <div className="flex min-h-[600px]">
                  {/* Left Sidebar */}
                  <div className="w-72 border-r border-border p-4 bg-card flex flex-col">
                    <h2 className="text-lg font-bold text-foreground mb-4">Create live video</h2>
                    
                    {/* Progress indicator */}
                    <div className="mb-4">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: liveStep === 'setup' ? '33%' : liveStep === 'details' ? '66%' : '100%' }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {liveStep === 'setup' ? '1' : liveStep === 'details' ? '2' : '3'} / 3
                      </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${liveStep === 'setup' ? 'border-primary bg-primary' : cameraPermission === 'granted' ? 'border-green-500 bg-green-500' : 'border-muted-foreground'}`}>
                          {cameraPermission === 'granted' && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-sm ${liveStep === 'setup' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>Connect video source</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${liveStep === 'details' ? 'border-primary bg-primary' : liveStep === 'live' ? 'border-green-500 bg-green-500' : 'border-muted-foreground'}`}>
                          {liveStep === 'live' && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-sm ${liveStep === 'details' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>Complete post details</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${liveStep === 'live' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        </div>
                        <span className={`text-sm ${liveStep === 'live' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>Go live</span>
                      </div>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 p-3 mb-4">
                      <Avatar className="h-10 w-10 border-2 border-primary">
                        <AvatarImage src={getAvatarUrl(userProfile?.avatar_url) || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(userProfile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground text-sm">{userProfile?.full_name || 'Member'}</p>
                        <p className="text-xs text-muted-foreground">Host · Your profile</p>
                      </div>
                    </div>

                    {/* Where to post dropdown */}
                    <Select value={postDestination} onValueChange={(value: 'profile' | 'timeline') => setPostDestination(value)}>
                      <SelectTrigger className="border border-border rounded-lg p-3 mb-3 h-auto">
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground mb-1">Choose where to post</p>
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="profile">Post on profile</SelectItem>
                        <SelectItem value="timeline">Post on timeline</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* When going live */}
                    <Select value={goLiveWhen} onValueChange={(value: 'now' | 'scheduled') => setGoLiveWhen(value)}>
                      <SelectTrigger className="border border-border rounded-lg p-3 mb-4 h-auto">
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground mb-1">When are you going live?</p>
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="now">Now</SelectItem>
                        <SelectItem value="scheduled">Schedule for later</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Audience selector */}
                    <Select value={audienceType} onValueChange={(value: 'friends' | 'public' | 'private') => setAudienceType(value)}>
                      <SelectTrigger className="w-fit mb-4">
                        <Users className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friends">Friends</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Only me</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Navigation Menu */}
                    <div className="flex-1 space-y-1">
                      <Button 
                        variant={activeSection === 'setup' ? 'secondary' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={() => setActiveSection('setup')}
                      >
                        <Video className="h-4 w-4 mr-3 text-red-500" />
                        Stream setup
                      </Button>
                      <Button 
                        variant={activeSection === 'dashboard' ? 'secondary' : 'ghost'} 
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveSection('dashboard');
                          toast({
                            title: "Dashboard",
                            description: "Live streaming analytics will appear here during broadcast"
                          });
                        }}
                      >
                        <BarChart3 className="h-4 w-4 mr-3" />
                        Dashboard
                      </Button>
                      <div>
                        <Button 
                          variant={activeSection === 'settings' ? 'secondary' : 'ghost'} 
                          className="w-full justify-start"
                          onClick={() => setShowSettings(!showSettings)}
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                        </Button>
                        {showSettings && (
                          <div className="ml-4 mt-2 space-y-3 p-3 bg-muted/30 rounded-lg">
                            {/* Video Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Video</span>
                              </div>
                              <button
                                onClick={toggleVideo}
                                disabled={!cameraStream}
                                className={`w-10 h-6 rounded-full transition-colors ${videoEnabled && cameraStream ? 'bg-primary' : 'bg-muted'} ${!cameraStream ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${videoEnabled && cameraStream ? 'translate-x-4' : ''}`} />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              {!cameraStream ? 'Enable camera first' : videoEnabled ? 'Your camera is on' : 'Your camera is off'}
                            </p>

                            {/* Audio Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Mic className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Microphone</span>
                              </div>
                              <button
                                onClick={toggleAudio}
                                disabled={!cameraStream}
                                className={`w-10 h-6 rounded-full transition-colors ${audioEnabled && cameraStream ? 'bg-primary' : 'bg-muted'} ${!cameraStream ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${audioEnabled && cameraStream ? 'translate-x-4' : ''}`} />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              {!cameraStream ? 'Enable camera first' : audioEnabled ? 'Your mic is on' : 'Your mic is muted'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <Button 
                          variant={activeSection === 'interactivity' ? 'secondary' : 'ghost'} 
                          className="w-full justify-start"
                          onClick={() => setShowInteractivity(!showInteractivity)}
                        >
                          <Smile className="h-4 w-4 mr-3" />
                          Interactivity
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showInteractivity ? 'rotate-180' : ''}`} />
                        </Button>
                        {showInteractivity && (
                          <div className="ml-4 mt-2 space-y-3 p-3 bg-muted/30 rounded-lg">
                            {/* Comments Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Comments</span>
                              </div>
                              <button
                                onClick={() => setCommentsEnabled(!commentsEnabled)}
                                className={`w-10 h-6 rounded-full transition-colors ${commentsEnabled ? 'bg-primary' : 'bg-muted'}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${commentsEnabled ? 'translate-x-4' : ''}`} />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              {commentsEnabled ? 'Viewers can comment during your live' : 'Comments are disabled'}
                            </p>

                            {/* Reactions Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Smile className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Reactions</span>
                              </div>
                              <button
                                onClick={() => setReactionsEnabled(!reactionsEnabled)}
                                className={`w-10 h-6 rounded-full transition-colors ${reactionsEnabled ? 'bg-primary' : 'bg-muted'}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${reactionsEnabled ? 'translate-x-4' : ''}`} />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              {reactionsEnabled ? 'Floating emoji reactions appear on screen' : 'Reactions are disabled'}
                            </p>

                            {/* Q&A Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Q&A</span>
                              </div>
                              <button
                                onClick={() => setQnaEnabled(!qnaEnabled)}
                                className={`w-10 h-6 rounded-full transition-colors ${qnaEnabled ? 'bg-primary' : 'bg-muted'}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${qnaEnabled ? 'translate-x-4' : ''}`} />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              {qnaEnabled ? 'Viewers can submit questions for you to answer' : 'Q&A is disabled'}
                            </p>

                            {/* Polls Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">Polls</span>
                              </div>
                              <button
                                onClick={() => setPollsEnabled(!pollsEnabled)}
                                className={`w-10 h-6 rounded-full transition-colors ${pollsEnabled ? 'bg-primary' : 'bg-muted'}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${pollsEnabled ? 'translate-x-4' : ''}`} />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                              {pollsEnabled ? 'Create live polls for viewer voting' : 'Polls are disabled'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 p-6 bg-muted/30 overflow-y-auto">
                    {/* Video Source Selection */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-semibold text-foreground">Select a video source</h3>
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground cursor-help">?</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div 
                          className={`p-6 rounded-xl border-2 cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${videoSource === 'webcam' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                          onClick={() => setVideoSource('webcam')}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${videoSource === 'webcam' ? 'bg-primary' : 'bg-muted'}`}>
                            <Camera className={`h-6 w-6 ${videoSource === 'webcam' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                          </div>
                          <span className="font-medium text-foreground">Webcam</span>
                        </div>
                        <div 
                          className={`p-6 rounded-xl border-2 cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${videoSource === 'streaming' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                          onClick={() => setVideoSource('streaming')}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${videoSource === 'streaming' ? 'bg-primary' : 'bg-muted'}`}>
                            <Monitor className={`h-6 w-6 ${videoSource === 'streaming' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                          </div>
                          <span className="font-medium text-foreground">Streaming software</span>
                        </div>
                      </div>
                    </div>

                    {/* Camera Controls */}
                    <div className="bg-card rounded-xl p-4 mb-6 border border-border">
                      <h4 className="font-semibold text-foreground mb-2">Camera controls</h4>
                      <p className="text-sm text-muted-foreground mb-4">Check that your camera and microphone inputs are properly working before going live.</p>
                      
                      <div className="space-y-3">
                        {/* Camera dropdown */}
                        <div className="flex items-center gap-3">
                          <Camera className="h-5 w-5 text-muted-foreground" />
                          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a media source" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDevices.filter(d => d.kind === 'videoinput').map((device) => (
                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                </SelectItem>
                              ))}
                              {availableDevices.filter(d => d.kind === 'videoinput').length === 0 && (
                                <SelectItem value="none" disabled>No cameras found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Microphone dropdown */}
                        <div className="flex items-center gap-3">
                          <Mic className="h-5 w-5 text-muted-foreground" />
                          <Select value={selectedMic} onValueChange={setSelectedMic}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a media source" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDevices.filter(d => d.kind === 'audioinput').map((device) => (
                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                                </SelectItem>
                              ))}
                              {availableDevices.filter(d => d.kind === 'audioinput').length === 0 && (
                                <SelectItem value="none" disabled>No microphones found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Screen share button */}
                        <div className="flex items-center gap-3">
                          <Monitor className="h-5 w-5 text-muted-foreground" />
                          <Button 
                            variant={isScreenSharing ? "default" : "outline"} 
                            className={`flex-1 ${isScreenSharing ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                          >
                            {isScreenSharing ? 'Stop screen share' : 'Start screen share'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Video Preview */}
                    <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
                      <h4 className="font-semibold text-foreground p-4 pb-2">Video</h4>
                      <div className="aspect-video bg-black relative flex items-center justify-center">
                        {screenStream ? (
                          <video 
                            ref={screenVideoRef}
                            autoPlay 
                            muted 
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        ) : cameraStream ? (
                          <video 
                            ref={cameraVideoRef}
                            autoPlay 
                            muted 
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : cameraPermission === 'denied' ? (
                          <div className="text-center text-white p-6">
                            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium mb-2">Allow access to camera</p>
                            <p className="text-sm text-gray-400 mb-4">Your browser is not allowing Live Producer access to your camera. Go to your browser settings and allow Camera permission.</p>
                            <Button onClick={requestCameraAccess} variant="secondary">
                              Retry
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center text-white p-6">
                            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium mb-2">Allow access to camera</p>
                            <p className="text-sm text-gray-400 mb-4">Click below to enable your camera and microphone</p>
                            <Button onClick={requestCameraAccess} variant="secondary">
                              Enable Camera
                            </Button>
                          </div>
                        )}
                      </div>
                      <button 
                        className="p-3 flex items-center justify-between border-t border-border w-full hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          const videoEl = screenStream ? screenVideoRef.current : cameraVideoRef.current;
                          if (videoEl) {
                            if (videoEl.requestFullscreen) {
                              videoEl.requestFullscreen();
                            } else if ((videoEl as any).webkitRequestFullscreen) {
                              (videoEl as any).webkitRequestFullscreen();
                            }
                          }
                        }}
                        disabled={!cameraStream && !screenStream}
                      >
                        <span className="text-sm text-foreground">Expand video</span>
                        <Expand className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Event logs */}
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MessageSquare className="h-5 w-5" />
                      <span className="text-sm">Event logs</span>
                    </div>
                  </div>

                  {/* Right Sidebar - Post Details */}
                  <div className="w-80 border-l border-border p-4 bg-card overflow-y-auto">
                    <h3 className="font-semibold text-foreground mb-4">Add post details</h3>
                    
                    {/* Share to story checkbox */}
                    <div className="flex items-start gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
                      <Checkbox 
                        id="share-story" 
                        checked={shareToStory}
                        onCheckedChange={(checked) => setShareToStory(checked as boolean)}
                      />
                      <div>
                        <Label htmlFor="share-story" className="font-medium text-foreground cursor-pointer">Share to story</Label>
                        <p className="text-xs text-muted-foreground">Your live video will also be added to your story.</p>
                      </div>
                    </div>

                    {/* Title input */}
                    <Input 
                      placeholder="Title (optional)"
                      value={liveTitle}
                      onChange={(e) => setLiveTitle(e.target.value)}
                      className="mb-4"
                    />

                    {/* Description input */}
                    <div className="relative mb-6">
                      <Textarea 
                        placeholder="Description"
                        value={liveDescription}
                        onChange={(e) => setLiveDescription(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-400 cursor-pointer" />
                        <MapPinIcon className="h-5 w-5 text-red-400 cursor-pointer" />
                        <Smile className="h-5 w-5 text-yellow-400 cursor-pointer" />
                      </div>
                    </div>

                    {/* Live Polls Section - Only shows when polls are enabled */}
                    {pollsEnabled && (
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Live Polls
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowLivePollCreator(!showLivePollCreator)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create Poll
                          </Button>
                        </div>
                        
                        {showLivePollCreator && (
                          <div className="mb-4 p-3 bg-card rounded-lg border border-border">
                            <PollCreator 
                              groupId="live-stream" 
                              inline={true}
                              onPollCreated={() => {
                                setShowLivePollCreator(false);
                                toast({
                                  title: "Poll Created",
                                  description: "Your poll will appear to viewers during the live stream"
                                });
                              }}
                            />
                          </div>
                        )}

                        {livePolls.length === 0 && !showLivePollCreator && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No polls created yet. Create a poll to engage your viewers!
                          </p>
                        )}

                        {livePolls.length > 0 && (
                          <div className="space-y-2">
                            {livePolls.map((poll) => (
                              <div key={poll.id} className="p-2 bg-card rounded border border-border text-sm">
                                {poll.question}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactivity Summary */}
                    <div className="mb-6 p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Enabled features:</p>
                      <div className="flex flex-wrap gap-2">
                        {commentsEnabled && (
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">Comments</span>
                        )}
                        {reactionsEnabled && (
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">Reactions</span>
                        )}
                        {qnaEnabled && (
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">Q&A</span>
                        )}
                        {pollsEnabled && (
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">Polls</span>
                        )}
                        {!commentsEnabled && !reactionsEnabled && !qnaEnabled && !pollsEnabled && (
                          <span className="text-xs text-muted-foreground">No interactivity enabled</span>
                        )}
                      </div>
                    </div>

                    {/* Go Live Button */}
                    <Button 
                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                      disabled={!cameraStream && !screenStream}
                      onClick={() => {
                        toast({
                          title: "Going Live!",
                          description: "Your live video is starting..."
                        });
                        // TODO: Implement actual live streaming
                      }}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Go Live
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Photo Gallery - Green */}
            <Dialog open={showPhotoPicker} onOpenChange={setShowPhotoPicker}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30">
                  <ImagePlus className="h-5 w-5 text-green-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Select from Glee Cam Gallery</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[350px]">
                  {loadingPhotos ? <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div> : gleeCamPhotos.length === 0 ? <div className="text-center text-muted-foreground py-8">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No Glee Cam photos yet</p>
                      <p className="text-sm">Take some photos with Glee Cam first!</p>
                    </div> : <div className="space-y-4 p-1">
                      {Object.entries(gleeCamPhotos.reduce((acc, photo) => {
                    const cat = photo.category || 'Uncategorized';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(photo);
                    return acc;
                  }, {} as Record<string, GleeCamPhoto[]>)).map(([category, photos]) => <div key={category}>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                            {category.replace(/-/g, ' ')}
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((photo, idx) => <div key={`${photo.name}-${idx}`} className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-colors ${selectedPhotos.includes(photo.url) ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}`} onClick={() => togglePhotoSelection(photo.url)}>
                                {isVideo(photo.url) ? <video src={photo.url} className="w-full h-20 object-cover" muted /> : <img src={photo.url} alt={photo.name} className="w-full h-20 object-cover" />}
                                {selectedPhotos.includes(photo.url) && <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                    <Check className="h-5 w-5 text-primary-foreground" />
                                  </div>}
                              </div>)}
                          </div>
                        </div>)}
                    </div>}
                </ScrollArea>
                {selectedPhotos.length > 0 && <Button onClick={addSelectedPhotos} className="w-full">
                    Add {selectedPhotos.length} photo(s)
                  </Button>}
              </DialogContent>
            </Dialog>

            {/* Location/Emoji - Yellow */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
              onClick={() => setShowLocation(!showLocation)}
            >
              <MapPin className="h-5 w-5 text-yellow-600" />
            </Button>
          </div>
        </div>

        {/* Expanded compose area (hidden by default, shown when typing) */}
        {(content || showLocation || mediaUrls.length > 0) && (
          <div className="mt-3 space-y-3 pt-3 border-t border-border">
            <Textarea 
              id="post-textarea"
              value={content} 
              onChange={e => setContent(e.target.value)} 
              className="min-h-[80px] resize-none border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-1" 
              placeholder="Share what's happening..." 
              autoFocus
            />
            
            {showLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Add location (e.g., Miami Beach 🌴)" 
                  value={locationTag} 
                  onChange={e => setLocationTag(e.target.value)} 
                  className="h-8 text-sm bg-background text-foreground" 
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                  setShowLocation(false);
                  setLocationTag('');
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {mediaUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="relative bg-muted rounded-md">
                    {isVideo(url) ? (
                      <video src={url} className="h-16 w-16 object-contain rounded-md" muted />
                    ) : (
                      <img src={url} alt="Upload" className="h-16 w-16 object-contain rounded-md" />
                    )}
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-5 w-5" 
                      onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={isSubmitting || !content.trim()} 
                className="gap-1.5"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post
              </Button>
            </div>
          </div>
        )}

        {/* Click-to-expand trigger when collapsed */}
        {!content && !showLocation && mediaUrls.length === 0 && (
          <Textarea 
            id="post-textarea"
            value={content} 
            onChange={e => setContent(e.target.value)} 
            className="sr-only" 
            placeholder="Share what's happening..." 
          />
        )}
      </CardContent>
    </Card>;
}