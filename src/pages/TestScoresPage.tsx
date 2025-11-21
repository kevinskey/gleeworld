import { useParams } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { TestScoresView } from '@/components/test-builder/TestScoresView';

export default function TestScoresPage() {
  const { testId } = useParams<{ testId: string }>();

  if (!testId) {
    return null;
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-6">
        <TestScoresView testId={testId} />
      </div>
    </UniversalLayout>
  );
}
