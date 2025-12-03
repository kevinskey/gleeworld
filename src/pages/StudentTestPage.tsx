import { useParams } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { StudentTestTaking } from '@/components/test-builder/StudentTestTaking';
import { BackNavigation } from '@/components/shared/BackNavigation';

export default function StudentTestPage() {
  const { testId } = useParams<{ testId: string }>();

  if (!testId) {
    return null;
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-6">
        <BackNavigation fallbackPath="/mus-240/student/dashboard" />
        <StudentTestTaking testId={testId} />
      </div>
    </UniversalLayout>
  );
}
