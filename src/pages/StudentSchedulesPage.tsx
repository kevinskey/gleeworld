import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SecretaryScheduleView } from '@/components/academy/SecretaryScheduleView';

const StudentSchedulesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Student Class Schedules</h1>
          <p className="text-muted-foreground mt-1">
            View all submitted student schedules and identify rehearsal conflicts
          </p>
        </div>

        {/* Secretary View Component */}
        <SecretaryScheduleView semester="Spring 2026" />
      </div>
    </div>
  );
};

export default StudentSchedulesPage;
