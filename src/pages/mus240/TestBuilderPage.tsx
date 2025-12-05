import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { TestBuilder } from '@/components/test-builder/TestBuilder';

export default function TestBuilderPage() {
  return (
    <UniversalLayout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 lg:py-8 max-w-6xl">
        <TestBuilder courseId="mus240" courseName="All Courses" />
      </div>
    </UniversalLayout>
  );
}