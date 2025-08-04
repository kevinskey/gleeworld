import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Crown, Calendar, FileText } from "lucide-react";

const ExecutiveBoard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Board</h1>
          <p className="text-muted-foreground">Board-specific tools and oversight</p>
        </div>
        <Button>
          <UserCheck className="mr-2 h-4 w-4" />
          Board Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Board Members
            </CardTitle>
            <CardDescription>Current executive positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">President: Sarah Johnson</div>
              <div className="text-sm">Vice President: Maya Patel</div>
              <div className="text-sm">Treasurer: Alex Chen</div>
              <div className="text-sm">Secretary: Emma Davis</div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Positions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Board Meetings
            </CardTitle>
            <CardDescription>Meeting schedule and minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">Next meeting: Jan 15, 2024</div>
              <div className="text-sm">Last meeting: Dec 18, 2023</div>
              <div className="text-sm">Meetings this year: 12</div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Schedule Meeting
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Board Documents
            </CardTitle>
            <CardDescription>Bylaws, policies, and records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Constitution & Bylaws
              </Button>
              <Button variant="outline" className="w-full">
                Meeting Minutes
              </Button>
              <Button variant="outline" className="w-full">
                Board Policies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveBoard;