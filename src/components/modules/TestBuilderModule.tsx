import { TestBuilder } from '@/components/test-builder/TestBuilder';
import { ModuleProps } from '@/types/unified-modules';

export const TestBuilderModule = ({ user, isFullPage }: ModuleProps) => {
  return <TestBuilder courseId="all" courseName="All Courses" />;
};
