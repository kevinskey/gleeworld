import React from 'react';
import { AttendanceDashboard } from '@/components/attendance/AttendanceDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AttendancePage() {
  const navigate = useNavigate();

  return (
    <UniversalLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Navigation */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="hover-scale"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <AttendanceDashboard />
      </div>
    </UniversalLayout>
  );
}