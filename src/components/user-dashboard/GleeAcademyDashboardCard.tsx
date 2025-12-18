import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_COURSES } from '@/config/academyCourses';

export const GleeAcademyDashboardCard = () => {
  const navigate = useNavigate();
  const activeCourses = ACADEMY_COURSES.filter(course => course.isActive);

  return (
    <Card className="w-full border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-wide">GLEE ACADEMY</CardTitle>
              <p className="text-xs text-muted-foreground">Spring 2026 Courses</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/glee-academy')}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {activeCourses.map((course) => {
            const IconComponent = course.icon;
            return (
              <button
                key={course.id}
                onClick={() => navigate(course.route)}
                className="group flex flex-col items-center p-3 rounded-lg bg-card hover:bg-primary/10 border border-border hover:border-primary/30 transition-all duration-200"
              >
                <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 mb-2 transition-colors">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-center text-foreground">
                  {course.courseCode}
                </span>
                <span className="text-[10px] text-muted-foreground text-center line-clamp-1 mt-0.5">
                  {course.title}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
