import React from 'react';
import { QRAttendanceScanner } from '@/components/attendance/QRAttendanceScanner';

const QRScannerPage = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Scan for Attendance</h1>
          <p className="text-muted-foreground">
            Use your device camera to scan QR codes and mark your attendance at events.
          </p>
        </div>
        
        <QRAttendanceScanner />
      </div>
    </div>
  );
};

export default QRScannerPage;