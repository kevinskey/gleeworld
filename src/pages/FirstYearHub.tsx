import React from "react";
import { FirstYearHubPage } from "@/components/first-year/FirstYearHubPage";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const FirstYearHub = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <FirstYearHubPage />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default FirstYearHub;
