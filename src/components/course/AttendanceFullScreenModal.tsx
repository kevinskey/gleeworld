import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceFullScreenModalProps {
  open: boolean;
  onClose: () => void;
  qrDataUrl: string | null;
  sessionTitle: string;
  sessionDate: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  enrolledCount: number;
  checkedInCount: number;
}

export const AttendanceFullScreenModal: React.FC<AttendanceFullScreenModalProps> = ({
  open,
  onClose,
  qrDataUrl,
  sessionTitle,
  sessionDate,
  startTime,
  endTime,
  location,
  enrolledCount,
  checkedInCount,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-background border-none">
        <div className="flex flex-col items-center justify-center h-full p-8 relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 h-12 w-12 rounded-full"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Session info */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              {sessionTitle}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              {format(sessionDate, 'EEEE, MMMM d, yyyy')}
            </p>
            {startTime && endTime && (
              <p className="text-lg text-muted-foreground mt-1">
                {startTime} - {endTime}
                {location && ` • ${location}`}
              </p>
            )}
          </div>

          {/* QR Code */}
          {qrDataUrl ? (
            <div className="bg-white p-8 rounded-2xl shadow-2xl">
              <img
                src={qrDataUrl}
                alt="Attendance QR Code"
                className="w-full max-w-[400px] md:max-w-[500px] aspect-square"
              />
            </div>
          ) : (
            <div className="w-full max-w-[400px] md:max-w-[500px] aspect-square flex items-center justify-center bg-muted rounded-2xl">
              <p className="text-muted-foreground text-xl">No QR code available</p>
            </div>
          )}

          {/* Attendance stats */}
          <div className="flex items-center gap-8 mt-8">
            <div className="flex items-center gap-3 bg-card px-6 py-4 rounded-xl shadow-md">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {checkedInCount} / {enrolledCount}
                </p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card px-6 py-4 rounded-xl shadow-md">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {format(new Date(), 'h:mm a')}
                </p>
                <p className="text-sm text-muted-foreground">Current Time</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-lg text-muted-foreground mt-8 text-center max-w-md">
            Scan the QR code with your phone camera to check in
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
