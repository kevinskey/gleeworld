import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export const AttendanceTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Attendance Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Attendance Management</h3>
          <p className="text-muted-foreground">
            Monitor student attendance and engagement patterns
          </p>
        </div>
      </CardContent>
    </Card>
  );
};