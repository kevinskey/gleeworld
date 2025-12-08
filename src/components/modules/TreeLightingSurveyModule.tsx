import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TreePine, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

interface SurveyResponse {
  id: string;
  user_id: string;
  attended: boolean;
  enjoyed_most: string | null;
  song_order: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

const TreeLightingSurveyModule = () => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, attended: 0, notAttended: 0 });

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    setIsLoading(true);
    try {
      const { data: basicData, error: basicError } = await supabase
        .from("tree_lighting_survey_responses")
        .select("*")
        .order("created_at", { ascending: false });

      if (basicError) throw basicError;

      // Fetch profiles separately
      const userIds = basicData?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from("gw_profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedData = basicData?.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id)
      })) || [];

      setResponses(enrichedData);
      calculateStats(enrichedData);
    } catch (error) {
      console.error("Error fetching survey responses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: SurveyResponse[]) => {
    const total = data.length;
    const attended = data.filter(r => r.attended).length;
    const notAttended = total - attended;
    setStats({ total, attended, notAttended });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading survey responses...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-green-600" />
            <CardTitle>Survey Module</CardTitle>
          </div>
          <CardDescription>
            Manage and view survey responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Responses</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.attended}</p>
                <p className="text-xs text-muted-foreground">Attended</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.notAttended}</p>
                <p className="text-xs text-muted-foreground">Did Not Attend</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          {responses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No responses yet</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Attended</TableHead>
                    <TableHead>What They Enjoyed</TableHead>
                    <TableHead>Song Order</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{response.profile?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{response.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {response.attended ? (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate" title={response.enjoyed_most || ""}>
                          {response.enjoyed_most || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate whitespace-pre-line" title={response.song_order || ""}>
                          {response.song_order || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(response.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TreeLightingSurveyModule;
