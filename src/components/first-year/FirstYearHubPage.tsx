import React from "react";
import { FirstYearHeader } from "./sections/FirstYearHeader";
import { AnnouncementsSection } from "./sections/AnnouncementsSection";
import { CheckInCard } from "./sections/CheckInCard";
import { TaskList } from "./sections/TaskList";
import { PracticeQuickLog } from "./sections/PracticeQuickLog";
import { ResourcesGrid } from "./sections/ResourcesGrid";
import { CohortChat } from "./sections/CohortChat";
import { OfficeHours } from "./sections/OfficeHours";

export const FirstYearHubPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <FirstYearHeader />
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <AnnouncementsSection />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CheckInCard />
              <PracticeQuickLog />
            </div>
            <TaskList />
            <ResourcesGrid />
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            <CohortChat />
            <OfficeHours />
          </div>
        </div>
      </div>
    </div>
  );
};