// TourCourseContext — pins Tour Manager queries/inserts to a specific
// course when the dashboard is embedded inside a course (via TourAddon).
// Workspace-level usage leaves the context undefined; queries that read
// the context can then show the cross-course view if appropriate.

import { createContext, useContext, type ReactNode } from 'react';

const TourCourseIdContext = createContext<string | null>(null);

export function TourCourseProvider({
  courseId,
  children,
}: {
  courseId: string | null;
  children: ReactNode;
}) {
  return (
    <TourCourseIdContext.Provider value={courseId}>
      {children}
    </TourCourseIdContext.Provider>
  );
}

export function useTourCourseId(): string | null {
  return useContext(TourCourseIdContext);
}
