import { useParams } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { TestEditorInterface } from '@/components/test-builder/TestEditorInterface';

export default function TestBuilderEdit() {
  const { testId } = useParams<{ testId: string }>();

  if (!testId) {
    return null;
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-6">
        <TestEditorInterface testId={testId} />
      </div>
    </UniversalLayout>
  );
}