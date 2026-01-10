import { useState } from 'react';
import { Camera, Mic, Video, UserCheck, Image, Film, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuickCaptureCategory = 'profile_picture' | 'glee_cam_pic' | 'glee_cam_video' | 'voice_part_recording' | 'exec_board_video' | 'member_audition_video';

type MediaType = 'photo' | 'video';

interface CategoryOption {
  id: QuickCaptureCategory;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  mediaType: MediaType;
}

// Photo categories
const photoCategories: CategoryOption[] = [
  {
    id: 'profile_picture',
    title: 'Profile Picture',
    shortTitle: 'Profile',
    icon: <UserCheck className="h-4 w-4" />,
    mediaType: 'photo'
  },
  {
    id: 'glee_cam_pic',
    title: 'Glee Cam Pic',
    shortTitle: 'Glee Cam',
    icon: <Camera className="h-4 w-4" />,
    mediaType: 'photo'
  },
];

// Video categories
const videoCategories: CategoryOption[] = [
  {
    id: 'glee_cam_video',
    title: 'Glee Cam Video',
    shortTitle: 'Glee Cam',
    icon: <Video className="h-4 w-4" />,
    mediaType: 'video'
  },
  {
    id: 'voice_part_recording',
    title: 'Voice Part',
    shortTitle: 'Voice Part',
    icon: <Mic className="h-4 w-4" />,
    mediaType: 'video'
  },
  {
    id: 'exec_board_video',
    title: 'ExecBoard',
    shortTitle: 'ExecBoard',
    icon: <Video className="h-4 w-4" />,
    mediaType: 'video'
  },
  {
    id: 'member_audition_video',
    title: 'Audition',
    shortTitle: 'Audition',
    icon: <UserCheck className="h-4 w-4" />,
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

  const handleSelectCategory = (category: QuickCaptureCategory) => {
    setSelectedType(null);
    onSelectCategory(category);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const currentCategories = selectedType === 'photo' ? photoCategories : videoCategories;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[2px]" 
        onClick={handleClose}
      />
      
      {/* Header-integrated dropdown panel */}
      <div 
        className="fixed left-0 right-0 z-[9999] bg-white shadow-2xl border-b border-gray-200"
        style={{ top: 'var(--gw-header-h, 56px)' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Main bar - Photo/Video toggle or category options */}
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
            
            {/* Left side - Title and type selection */}
            <div className="flex items-center gap-4">
              {/* Glee Cam branding */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                  <Camera className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900 text-sm sm:text-base">
                  {selectedType ? (selectedType === 'photo' ? 'Photo' : 'Video') : 'Glee Cam'}
                </span>
              </div>

              {/* Vertical divider */}
              <div className="h-6 w-px bg-gray-300" />

              {/* Type toggle buttons or category buttons */}
              {!selectedType ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedType('photo')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all text-sm font-medium shadow-sm"
                  >
                    <Image className="h-4 w-4" />
                    <span className="hidden sm:inline">Photo</span>
                  </button>
                  <button
                    onClick={() => setSelectedType('video')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all text-sm font-medium border border-gray-300"
                  >
                    <Film className="h-4 w-4" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {/* Back button */}
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs font-medium"
                  >
                    ← Back
                  </button>
                  
                  {/* Category options - horizontal pills */}
                  {currentCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleSelectCategory(category.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full transition-all text-xs sm:text-sm font-medium shadow-sm",
                        "bg-gray-900 text-white hover:bg-gray-700",
                        "border border-gray-800 hover:shadow-md"
                      )}
                    >
                      {category.icon}
                      <span>{category.shortTitle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right side - Close button */}
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Subtle bottom accent line */}
          <div className="h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        </div>
      </div>
    </>
  );
};
