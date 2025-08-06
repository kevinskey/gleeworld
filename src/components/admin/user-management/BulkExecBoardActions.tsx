
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserCheck, CheckCircle2, Loader2 } from "lucide-react";

interface BulkExecBoardActionsProps {
  onActionComplete: () => void;
}

export const BulkExecBoardActions = ({ onActionComplete }: BulkExecBoardActionsProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleBulkVerifyExecBoard = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to perform this action",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      console.log('Starting bulk executive board verification...');
      
      const { data, error } = await supabase.functions.invoke('bulk-verify-exec-board', {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      console.log('Bulk verification result:', data);

      toast({
        title: "Success",
        description: `${data.verified_count} executive board members have been verified`,
      });

      onActionComplete();
    } catch (error) {
      console.error('Bulk verification error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify executive board members",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Executive Board Actions
          <Badge variant="secondary" className="text-xs">
            Admin Only
          </Badge>
        </CardTitle>
        <CardDescription>
          Bulk operations for executive board member management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Verify All Executive Board Members</p>
            <p className="text-xs text-muted-foreground">
              Mark all active executive board members as verified in the system
            </p>
          </div>
          
          <Button
            onClick={handleBulkVerifyExecBoard}
            disabled={isVerifying}
            className="flex items-center gap-2"
            variant="default"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Verify All
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
