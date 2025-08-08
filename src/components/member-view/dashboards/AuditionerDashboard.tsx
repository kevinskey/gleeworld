import React from "react";
import { AuditionDocuments } from "@/components/audition/AuditionDocuments";

interface AuditionerDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const AuditionerDashboard = ({ user }: AuditionerDashboardProps) => {
  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <AuditionDocuments />
      </div>
    </div>
  );
};
