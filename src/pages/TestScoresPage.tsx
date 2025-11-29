import { useParams } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { TestScoresView } from '@/components/test-builder/TestScoresView';
import { MidtermSubmissionAnalytics } from '@/components/mus240/admin/MidtermSubmissionAnalytics';

// This is the MUS240 Midterm 2 test ID
const MUS240_MIDTERM_TEST_ID = '49ef07f7-0bdf-4a42-80ee-06006e2f5107';

export default function TestScoresPage() {
  const { testId } = useParams<{ testId: string }>();

  if (!testId) {
    return null;
  }

  // Show midterm analytics for MUS240 midterm, otherwise show generic test scores
  const isMus240Midterm = testId === MUS240_MIDTERM_TEST_ID;

  return (
    <UniversalLayout>
      <div className="container mx-auto py-6">
        {isMus240Midterm ? (
          <MidtermSubmissionAnalytics />
        ) : (
          <TestScoresView testId={testId} />
        )}
      </div>
    </UniversalLayout>
  );
}
