import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from 'lucide-react';

export const CheckInCheckOutModule = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <CardTitle>Check In/Check Out</CardTitle>
        </div>
        <CardDescription>
          Track arrival and departure times for events and rehearsals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Check In/Check Out features coming soon...</p>
        </div>
      </CardContent>
    </Card>
  );
};