import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { TestBuilder } from '@/components/test-builder/TestBuilder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestBuilderPage() {
  return (
    <UniversalLayout>
      <div className="container mx-auto py-2 md:py-6 space-y-2 md:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Builder - All Courses</CardTitle>
            <CardDescription>
              Select a course below to create and manage tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TestBuilder courseId="mus240" courseName="MUS 240 - African American Music" />
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversalLayout>
  );
}