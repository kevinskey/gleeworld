import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Mic, Video, UserCheck, Sparkles, ArrowLeft, Image, Film } from 'lucide-react';

export type QuickCaptureCategory = 'christmas_carol_selfie' | 'glee_cam_pic' | 'glee_cam_video' | 'voice_part_recording' | 'exec_board_video' | 'member_audition_video';

type MediaType = 'photo' | 'video';

interface CategoryOption {
  id: QuickCaptureCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  mediaType: MediaType;
}

// Photo categories
const photoCategories: CategoryOption[] = [
  {
    id: 'christmas_carol_selfie',
    title: 'Christmas Carol Selfie',
    description: 'Festive selfie for the holiday hero carousel',
    icon: <Sparkles className="h-8 w-8" />,
    color: 'from-red-500 to-green-500',
    mediaType: 'photo'
  },
  {
    id: 'glee_cam_pic',
    title: 'Glee Cam Pic',
    description: 'Capture moments for the landing page heroes',
    icon: <Camera className="h-8 w-8" />,
    color: 'from-amber-500 to-orange-500',
    mediaType: 'photo'
  },
];

// Video categories
const videoCategories: CategoryOption[] = [
  {
    id: 'glee_cam_video',
    title: 'Glee Cam Video',
    description: 'Record or upload videos for heroes & media library',
    icon: <Video className="h-8 w-8" />,
    color: 'from-rose-500 to-amber-500',
    mediaType: 'video'
  },
  {
    id: 'voice_part_recording',
    title: 'Voice Part Recording',
    description: 'Record your voice part for practice',
    icon: <Mic className="h-8 w-8" />,
    color: 'from-blue-500 to-cyan-500',
    mediaType: 'video'
  },
  {
    id: 'exec_board_video',
    title: 'ExecBoard Training Video',
    description: 'Record leadership training videos for the team',
    icon: <Video className="h-8 w-8" />,
    color: 'from-purple-500 to-pink-500',
    mediaType: 'video'
  },
  {
    id: 'member_audition_video',
    title: 'Member Audition Video',
    description: 'Submit your audition recording',
    icon: <UserCheck className="h-8 w-8" />,
    color: 'from-emerald-500 to-teal-500',
    mediaType: 'video'
  }
];

interface QuickCaptureCategorySelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectCategory: (category: QuickCaptureCategory) => void;
}

export const QuickCaptureCategorySelector = ({ 
  open, 
  onClose, 
  onSelectCategory 
}: QuickCaptureCategorySelectorProps) => {
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleSelectCategory = (category: QuickCaptureCategory) => {
    setSelectedType(null);
    onSelectCategory(category);
  };

  const currentCategories = selectedType === 'photo' ? photoCategories : videoCategories;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {selectedType && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="mr-1 h-7 w-7 sm:h-8 sm:w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            {selectedType === 'photo' ? 'Select Photo Category' : selectedType === 'video' ? 'Select Video Category' : 'Quick Capture'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {selectedType 
              ? `Choose where to save your ${selectedType}` 
              : 'What would you like to capture?'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 sm:p-4">
          {/* First level: Photo or Video selection */}
          {!selectedType && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group border-2"
                onClick={() => setSelectedType('photo')}
              >
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                    <Image className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Glee Cam</h3>
                  <p className="text-xs text-muted-foreground leading-tight">Take photos for heroes & galleries</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group border-2"
                onClick={() => setSelectedType('video')}
              >
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center text-white mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                    <Film className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Glee Cam Video</h3>
                  <p className="text-xs text-muted-foreground leading-tight">Record videos & voice parts</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Second level: Category selection */}
          {selectedType && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {currentCategories.map((category) => (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group border"
                  onClick={() => handleSelectCategory(category.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform`}>
                      <div className="scale-75 sm:scale-100">{category.icon}</div>
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-0.5 leading-tight">{category.title}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight line-clamp-2">{category.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
