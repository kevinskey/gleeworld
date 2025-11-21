import { useParams } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { StudentTestTaking } from '@/components/test-builder/StudentTestTaking';

export default function StudentTestPage() {
  const { testId } = useParams<{ testId: string }>();

  if (!testId) {
    return null;
  }

  return (
    <UniversalLayout>
      <StudentTestTaking testId={testId} />
    </UniversalLayout>
  );
}
