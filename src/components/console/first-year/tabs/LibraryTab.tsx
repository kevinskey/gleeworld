import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export const LibraryTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Resource Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Resource Management</h3>
          <p className="text-muted-foreground">
            Manage learning resources, templates, and materials
          </p>
        </div>
      </CardContent>
    </Card>
  );
};