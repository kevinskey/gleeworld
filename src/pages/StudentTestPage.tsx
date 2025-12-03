import { useParams, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { StudentTestTaking } from '@/components/test-builder/StudentTestTaking';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function StudentTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  if (!testId) {
    return null;
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/mus-240/student/dashboard')}
          className="flex items-center gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <StudentTestTaking testId={testId} />
      </div>
    </UniversalLayout>
  );
}
