import { useState, useEffect } from "react";
import { AdminOnlyRoute } from "@/components/auth/AdminOnlyRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, CheckCircle, XCircle, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

interface Audition {
  id: string;
  student_name: string;
  email: string;
  video_url: string;
  video_path: string;
  submitted_at: string;
  approved: boolean;
  notes: string | null;
}

export default function ChildrenGoAuditionsAdmin() {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAuditions = async () => {
    try {
      const { data, error } = await supabase
        .from('children_go_auditions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setAuditions(data || []);
    } catch (error) {
      console.error('Error fetching auditions:', error);
      toast({
        title: "Error",
        description: "Failed to load auditions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditions();
  }, []);

  const handleApprove = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('children_go_auditions')
        .update({ approved: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Audition ${!currentStatus ? 'approved' : 'unapproved'}`,
      });

      fetchAuditions();
    } catch (error) {
      console.error('Error updating audition:', error);
      toast({
        title: "Error",
        description: "Failed to update audition status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, videoPath: string) => {
    try {
      // Delete video from storage
      const { error: storageError } = await supabase.storage
        .from('children-go-auditions')
        .remove([videoPath]);

      if (storageError) throw storageError;

      // Delete database record
      const { error: dbError } = await supabase
        .from('children_go_auditions')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Audition deleted successfully",
      });

      fetchAuditions();
    } catch (error) {
      console.error('Error deleting audition:', error);
      toast({
        title: "Error",
        description: "Failed to delete audition",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminOnlyRoute>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </AdminOnlyRoute>
    );
  }

  return (
    <AdminOnlyRoute>
      <DashboardPageShell
        title="Children Go Auditions"
        subtitle='Review and manage "Children, Go Where I Send Thee" rap auditions'
      >
        <div className="grid gap-4">
          {auditions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No auditions submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            auditions.map((audition) => (
              <Card key={audition.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {audition.student_name}
                      </CardTitle>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{audition.email}</p>
                        <p>
                          Submitted: {format(new Date(audition.submitted_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={audition.approved ? "default" : "secondary"}>
                      {audition.approved ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(audition.video_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Video
                    </Button>
                    <Button
                      variant={audition.approved ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleApprove(audition.id, audition.approved)}
                    >
                      {audition.approved ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Unapprove
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <ConfirmDeleteButton
                      confirmKey="delete-audition"
                      title="Delete this audition?"
                      description="The video and submission record will be removed."
                      onConfirm={() => handleDelete(audition.id, audition.video_path)}
                      ariaLabel="Delete audition"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </ConfirmDeleteButton>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DashboardPageShell>
    </AdminOnlyRoute>
  );
}
