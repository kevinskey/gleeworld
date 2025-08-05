import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SightReadingUploader } from '@/components/SightReadingUploader';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { useNavigate } from 'react-router-dom';

const SightReadingSubmission = () => {
  const navigate = useNavigate();

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bebas tracking-wide">
              Sight Reading Submission
            </h1>
            <p className="text-muted-foreground">
              Upload your sight reading audio recordings for analysis and feedback.
            </p>
          </div>
        </div>

        <SightReadingUploader />
      </div>
    </UniversalLayout>
  );
};

export default SightReadingSubmission;