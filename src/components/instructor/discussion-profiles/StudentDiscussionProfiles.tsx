import React, { useState } from 'react';
import { StudentDiscussionList } from './StudentDiscussionList';
import { StudentDiscussionDetail } from './StudentDiscussionDetail';
import { useUserRole } from '@/hooks/useUserRole';

interface StudentDiscussionProfilesProps {
  courseId: string;
}

export const StudentDiscussionProfiles: React.FC<StudentDiscussionProfilesProps> = ({
  courseId,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { isInstructor, isAdmin } = useUserRole();

  // Security: Only render for instructors/admins
  if (!isInstructor() && !isAdmin()) {
    return null; // Return nothing - students see nothing
  }

  if (selectedStudentId) {
    return (
      <StudentDiscussionDetail
        courseId={courseId}
        studentId={selectedStudentId}
        onBack={() => setSelectedStudentId(null)}
      />
    );
  }

  return (
    <StudentDiscussionList
      courseId={courseId}
      onSelectStudent={setSelectedStudentId}
    />
  );
};

export default StudentDiscussionProfiles;
