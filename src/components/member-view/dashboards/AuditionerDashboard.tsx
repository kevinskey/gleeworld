import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Auditioner Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! Start or manage your Spelman College Glee Club audition.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Start or Continue Application</CardTitle>
              <CardDescription>Submit details and select a time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Begin a new application or pick up where you left off. You can choose an audition date/time and upload required materials.
              </p>
              <Button asChild>
                <Link to="/auditions">Open Auditions Portal</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What You’ll Need</CardTitle>
              <CardDescription>Prepare before your audition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-1">
                <li>Basic contact and background info</li>
                <li>Preferred audition date/time</li>
                <li>Optional: short vocal sample (if requested)</li>
                <li>Any additional notes for adjudicators</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>After submitting your application</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="font-medium">1. Confirmation</h3>
              <p className="text-sm text-muted-foreground">You’ll receive an email confirming your audition details.</p>
            </div>
            <div>
              <h3 className="font-medium">2. Updates</h3>
              <p className="text-sm text-muted-foreground">Check the Auditions Portal for any updates or changes.</p>
            </div>
            <div>
              <h3 className="font-medium">3. Day Of</h3>
              <p className="text-sm text-muted-foreground">Arrive early, warmed up, and ready to amaze and inspire.</p>
            </div>
            <div>
              <h3 className="font-medium">4. Results</h3>
              <p className="text-sm text-muted-foreground">You’ll be notified via email when decisions are posted.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
