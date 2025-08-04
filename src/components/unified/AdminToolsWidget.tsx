import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export const AdminToolsWidget = () => {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wrench className="h-5 w-5" />
          Admin Tools
        </CardTitle>
        <CardDescription>
          Specialized administrative modules and tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Placeholder for future modules */}
          <div className="text-center py-8 col-span-full">
            <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Admin tools modules will be added here
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};