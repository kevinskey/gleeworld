import { Navigate, useParams } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';

// Redirects /course-lounge/:courseId to the appropriate academy route
const CourseLoungeRedirect = () => {
  const { courseId } = useParams<{ courseId: string }>();
  
  // Find the course by ID to get the correct route
  const course = ACADEMY_COURSES.find(c => c.id === courseId);
  
  if (course) {
    return <Navigate to={course.route} replace />;
  }
  
  // Fallback to main glee lounge if course not found
  return <Navigate to="/glee-lounge" replace />;
};

export default CourseLoungeRedirect;
