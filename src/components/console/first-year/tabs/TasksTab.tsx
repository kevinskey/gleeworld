import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export const TasksTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Tasks Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Task Management</h3>
          <p className="text-muted-foreground">
            Create, assign, and track student tasks and assignments
          </p>
        </div>
      </CardContent>
    </Card>
  );
};