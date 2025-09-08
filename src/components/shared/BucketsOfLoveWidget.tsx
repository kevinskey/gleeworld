import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SendBucketOfLove from "@/components/buckets-of-love/SendBucketOfLove";
import { Heart, Trash2 } from "lucide-react";
import { cleanupDuplicateBuckets } from "@/utils/cleanupDuplicateBuckets";
import { useToast } from "@/hooks/use-toast";

export const BucketsOfLoveWidget = () => {
  const { toast } = useToast();

  const handleCleanupDuplicates = async () => {
    const result = await cleanupDuplicateBuckets();
    if (result.success) {
      toast({
        title: "Cleanup Complete",
        description: `Deleted ${result.deleted} duplicate entries`,
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to cleanup duplicates",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-lg bg-card border-border" style={{ boxShadow: 'var(--shadow-1)', borderRadius: 'var(--radius)' }}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/50" style={{ background: 'linear-gradient(90deg, hsl(var(--blue-700)), hsl(var(--blue-300)) 60%)', height: '4px', marginBottom: 'var(--space-4)' }}>
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Heart className="h-4 w-4 text-primary" /> Buckets of Love
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="chip-info">Community</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupDuplicates}
            className="gap-1 btn-secondary"
          >
            <Trash2 className="h-3 w-3" />
            Clean Dupes
          </Button>
        </div>
      </CardHeader>
      <CardContent style={{ padding: 'var(--space-4)' }}>
        <SendBucketOfLove />
      </CardContent>
    </Card>
  );
};

export default BucketsOfLoveWidget;
