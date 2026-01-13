import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { PinAttendanceEntry } from '@/components/attendance/PinAttendanceEntry';
import { ArrowLeft, QrCode } from 'lucide-react';

const AttendancePinPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Please log in to check in.</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <PinAttendanceEntry
          onSuccess={() => {
            // Stay on page to show success state
          }}
          onCancel={() => navigate(-1)}
        />

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Or scan the QR code instead
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/qr-scanner')}
          >
            <QrCode className="h-4 w-4 mr-2" />
            Open QR Scanner
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AttendancePinPage;
