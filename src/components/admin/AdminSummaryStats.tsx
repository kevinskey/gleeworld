
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@/hooks/useUsers";
import { ActivityLog } from "@/hooks/useActivityLogs";

interface AdminSummaryStatsProps {
  users: User[];
  loading: boolean;
  activityLogs: ActivityLog[];
}

export const AdminSummaryStats = ({ users, loading, activityLogs }: AdminSummaryStatsProps) => {
  // Component now renders nothing - all stats cards have been removed
  return null;
};
