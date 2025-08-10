import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SendBucketOfLove from "@/components/buckets-of-love/SendBucketOfLove";
import { Heart } from "lucide-react";

export const BucketsOfLoveWidget = () => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" /> Buckets of Love
        </CardTitle>
        <Badge variant="outline">Community</Badge>
      </CardHeader>
      <CardContent>
        <SendBucketOfLove />
      </CardContent>
    </Card>
  );
};

export default BucketsOfLoveWidget;
