import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Package } from "lucide-react";

export const GarmentBagDistribution = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Garment Bag Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Manage garment bag assignments and distribution for tours
          </p>
          <div className="flex gap-2 justify-center">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Assign Bag
            </Button>
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};