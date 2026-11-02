import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SendBucketOfLove from "@/components/buckets-of-love/SendBucketOfLove";
import { Heart, Trash2 } from "lucide-react";
import { cleanupDuplicateBuckets } from "@/utils/cleanupDuplicateBuckets";
import { useToast } from "@/hooks/use-toast";

export const BucketsOfLoveWidget = () => {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" /> Buckets of Love
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Community</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clean Dupes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <SendBucketOfLove />
      </CardContent>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete duplicate Buckets of Love?</AlertDialogTitle>
            <AlertDialogDescription>
              Duplicate entries are permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCleanupDuplicates}
            >
              Delete duplicates
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BucketsOfLoveWidget;
