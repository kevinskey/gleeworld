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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedType && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="mr-1 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Camera className="h-5 w-5" />
            {selectedType === 'photo' ? 'Select Photo Category' : selectedType === 'video' ? 'Select Video Category' : 'Quick Capture'}
          </DialogTitle>
          <DialogDescription>
            {selectedType 
              ? `Choose where to save your ${selectedType}` 
              : 'What would you like to capture?'}
          </DialogDescription>
        </DialogHeader>

        {/* First level: Photo or Video selection */}
        {!selectedType && (
          <div className="grid grid-cols-2 gap-6 mt-4">
            <Card
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
              onClick={() => setSelectedType('photo')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                  <Image className="h-10 w-10" />
                </div>
                <h3 className="font-semibold text-xl mb-2">Glee Cam</h3>
                <p className="text-sm text-muted-foreground">Take photos for heroes & galleries</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
              onClick={() => setSelectedType('video')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                  <Film className="h-10 w-10" />
                </div>
                <h3 className="font-semibold text-xl mb-2">Glee Cam Video</h3>
                <p className="text-sm text-muted-foreground">Record videos & voice parts</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Second level: Category selection */}
        {selectedType && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {currentCategories.map((category) => (
              <Card
                key={category.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
                onClick={() => handleSelectCategory(category.id)}
              >
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{category.title}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
