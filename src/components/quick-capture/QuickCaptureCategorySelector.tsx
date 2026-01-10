import { useState } from 'react';
import { Camera, Mic, Video, UserCheck, Image, Film, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        className="fixed inset-0 z-[9998] bg-black/10" 
        onClick={handleClose}
      />
      
      {/* Slim dropdown bar */}
      <div 
        className="fixed left-0 right-0 z-[9999] bg-white border-b border-gray-200"
        style={{ top: 'var(--gw-header-h, 56px)' }}
      >
        <div className="flex items-center justify-between px-4 h-10">
          
          {/* Left: Options */}
          <div className="flex items-center gap-3">
            {!selectedType ? (
              <>
                <button
                  onClick={() => setSelectedType('photo')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  <Image className="h-3.5 w-3.5" />
                  Photo
                </button>
                <div className="h-4 w-px bg-gray-300" />
                <button
                  onClick={() => setSelectedType('video')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  <Film className="h-3.5 w-3.5" />
                  Video
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleBack}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  ←
                </button>
                <div className="h-4 w-px bg-gray-300" />
                {currentCategories.map((category, idx) => (
                  <div key={category.id} className="flex items-center gap-3">
                    <button
                      onClick={() => handleSelectCategory(category.id)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      {category.icon}
                      {category.title}
                    </button>
                    {idx < currentCategories.length - 1 && (
                      <div className="h-4 w-px bg-gray-300" />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Right: Close */}
          <button
            onClick={handleClose}
            className="p-1 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
};
