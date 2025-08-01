import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { ItemDetailModal } from "../modals/ItemDetailModal";

export const TasksSection = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  return (
    <div className="w-full">
      {/* Tasks Section - Currently Empty */}
      <Card className="bg-gradient-to-r from-accent/5 via-secondary/5 to-primary/5 border-accent/20 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
            <Package className="h-4 w-4" />
            Tasks
            <Badge variant="secondary" className="text-xs">
              0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks at this time</p>
          </div>
        </CardContent>
      </Card>

      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem || { id: '', title: '', type: 'notification' as const }}
      />
    </div>
  );
};