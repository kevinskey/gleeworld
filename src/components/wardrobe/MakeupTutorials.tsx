import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Plus, Video } from "lucide-react";

export const MakeupTutorials = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Makeup Tutorials
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Educational content to teach members about makeup techniques
          </p>
          <div className="flex gap-2 justify-center">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tutorial
            </Button>
            <Button variant="outline">
              <Video className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};