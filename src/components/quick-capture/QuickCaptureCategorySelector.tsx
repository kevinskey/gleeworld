import { useState } from 'react';
import { Camera, Mic, Video, UserCheck, Image, Film, X } from 'lucide-react';

export type QuickCaptureCategory = 'profile_picture' | 'glee_cam_pic' | 'glee_cam_video' | 'voice_part_recording' | 'exec_board_video' | 'member_audition_video';

type MediaType = 'photo' | 'video';

interface CategoryOption {
  id: QuickCaptureCategory;
  title: string;
  icon: React.ReactNode;
  mediaType: MediaType;
}

const photoCategories: CategoryOption[] = [
  { id: 'profile_picture', title: 'Profile', icon: <UserCheck className="h-3.5 w-3.5" />, mediaType: 'photo' },
  { id: 'glee_cam_pic', title: 'Glee Cam', icon: <Camera className="h-3.5 w-3.5" />, mediaType: 'photo' },
];

const videoCategories: CategoryOption[] = [
  { id: 'glee_cam_video', title: 'Glee Cam', icon: <Video className="h-3.5 w-3.5" />, mediaType: 'video' },
  { id: 'voice_part_recording', title: 'Voice Part', icon: <Mic className="h-3.5 w-3.5" />, mediaType: 'video' },
  { id: 'exec_board_video', title: 'ExecBoard', icon: <Video className="h-3.5 w-3.5" />, mediaType: 'video' },
  { id: 'member_audition_video', title: 'Audition', icon: <UserCheck className="h-3.5 w-3.5" />, mediaType: 'video' },
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
        className="fixed inset-0 z-[9998]" 
        onClick={handleClose}
      />
      
      {/* Small dropdown positioned top-right */}
      <div 
        className="fixed z-[9999] bg-white text-gray-900 border border-gray-200 rounded-lg shadow-xl"
        style={{ top: 'calc(var(--gw-header-h, 56px) + 4px)', right: '140px' }}
      >
        <div className="p-2 min-w-[140px]">
          {!selectedType ? (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedType('photo')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors w-full text-left"
              >
                <Image className="h-4 w-4" />
                Photo
              </button>
              <button
                onClick={() => setSelectedType('video')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors w-full text-left"
              >
                <Film className="h-4 w-4" />
                Video
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left border-b border-border mb-1"
              >
                ← Back
              </button>
              {currentCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleSelectCategory(category.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded transition-colors w-full text-left"
                >
                  {category.icon}
                  {category.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
