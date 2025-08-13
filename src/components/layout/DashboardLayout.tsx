import { ReactNode } from "react";
import { AppNavigation } from "@/components/navigation/AppNavigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};