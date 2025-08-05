import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shirt, Upload, Plus } from "lucide-react";

export const DressCodeMedia = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shirt className="h-5 w-5" />
          Dress Code Media & Rules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Manage dress code guidelines, media, and educational content
          </p>
          <div className="flex gap-2 justify-center">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Guidelines
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};