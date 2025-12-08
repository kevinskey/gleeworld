import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Mic, Video, UserCheck, Sparkles } from 'lucide-react';

export type QuickCaptureCategory = 'christmas_carol_selfie' | 'glee_cam_pic' | 'glee_cam_video' | 'voice_part_recording' | 'exec_board_video' | 'member_audition_video';

interface CategoryOption {
  id: QuickCaptureCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const categories: CategoryOption[] = [
  {
    id: 'christmas_carol_selfie',
    title: 'Christmas Carol Selfie',
    description: 'Festive selfie for the holiday hero carousel',
    icon: <Sparkles className="h-8 w-8" />,
    color: 'from-red-500 to-green-500'
  },
  {
    id: 'glee_cam_pic',
    title: 'Glee Cam Pic',
    description: 'Capture moments for the landing page heroes',
    icon: <Camera className="h-8 w-8" />,
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'glee_cam_video',
    title: 'Glee Cam Video',
    description: 'Record or upload videos for heroes & media library',
    icon: <Video className="h-8 w-8" />,
    color: 'from-rose-500 to-amber-500'
  },
  {
    id: 'voice_part_recording',
    title: 'Voice Part Recording',
    description: 'Record your voice part for practice',
    icon: <Mic className="h-8 w-8" />,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'exec_board_video',
    title: 'ExecBoard Training Video',
    description: 'Record leadership training videos for the team',
    icon: <Video className="h-8 w-8" />,
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'member_audition_video',
    title: 'Member Audition Video',
    description: 'Submit your audition recording',
    icon: <UserCheck className="h-8 w-8" />,
    color: 'from-emerald-500 to-teal-500'
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
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Quick Capture
          </DialogTitle>
          <DialogDescription>
            Select the type of media you want to capture
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
              onClick={() => onSelectCategory(category.id)}
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
      </DialogContent>
    </Dialog>
  );
};
