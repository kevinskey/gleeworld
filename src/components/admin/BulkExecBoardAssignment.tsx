import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";

export const BulkExecBoardAssignment = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const assignments = [
    { email: "ryanbates@spelman.edu", full_name: "Ryan Bates", role: "president" },
    { email: "raynestewart@spelman.edu", full_name: "Rayne Stewart", role: "treasurer" }, // Assigning treasurer for now
    { email: "adriannahighgate@spelman.edu", full_name: "Adrianna Highgate", role: "secretary" },
    { email: "onnestypeele@spelman.edu", full_name: "Onnesty Peele", role: "tour_manager" },
    { email: "avachallenger@spelman.edu", full_name: "Ava Challenger", role: "pr_coordinator" }, // First PR person
    { email: "phoenixking@spelman.edu", full_name: "Phoenix King", role: "historian" },
    { email: "madisynwashington@spelman.edu", full_name: "Madisyn Washington", role: "librarian" }, // First co-librarian
    { email: "drewroberts@spelman.edu", full_name: "Drew Roberts", role: "wardrobe_manager" }, // First co-wardrobe
    { email: "kyerrashields@spelman.edu", full_name: "Kyerra Shields", role: "chaplain" },
    { email: "arianaswindell@spelman.edu", full_name: "Ariana Swindell", role: "student_conductor" },
    { email: "gabriellemagee@spelman.edu", full_name: "Gabrielle MaGee", role: "section_leader_s1" },
    { email: "elissajefferson@spelman.edu", full_name: "Elissa Jefferson", role: "section_leader_s2" },
    { email: "kathryntucker@spelman.edu", full_name: "Kathryn Tucker", role: "section_leader_a1" },
    
    // Users without valid roles - just add as members with exec board access
    { email: "jordynoneal@spelman.edu", full_name: "Jordyn O'Neal", role: "data_analyst" }, // Closest match to Chief of Staff
    { email: "sanaiaharrison@spelman.edu", full_name: "Sanaia Harrison", role: "data_analyst" }, // No merchandise role
    { email: "kennidytroupe@spelman.edu", full_name: "Kennidy Troupe", role: "assistant_chaplain" }, // No alumnae liaison
    { email: "allanawalker@spelman.edu", full_name: "Allana Walker", role: "data_analyst" }, // No setup crew role
    
    // Additional people who need some role
    { email: "tyarapetty@spelman.edu", full_name: "T'yara Petty", role: "assistant_chaplain" }, // Second PR person
    { email: "alexandrawilliams@spelman.edu", full_name: "Alexandra Williams", role: "assistant_chaplain" }, // Second co-librarian
    { email: "soleilvailes@spelman.edu", full_name: "Soleil Vailes", role: "section_leader_a2" }, // Second co-wardrobe
  ];

  const handleBulkAssignment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-assign-exec-board', {
        body: { assignments }
      });

      if (error) {
        console.error('Error in bulk assignment:', error);
        toast({
          title: "Error",
          description: "Failed to assign executive board roles",
          variant: "destructive",
        });
        return;
      }

      setResults(data.results);
      
      toast({
        title: "Bulk Assignment Complete",
        description: `Processed ${data.summary.total} assignments. ${data.summary.successful} successful, ${data.summary.failed} failed.`,
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to process bulk assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Executive Board Assignment
          </CardTitle>
          <CardDescription>
            Assign executive board roles to multiple users at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Assignments to be made:</p>
              <ul className="space-y-1">
                {assignments.map((assignment, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{assignment.full_name}</span>
                    <span className="text-blue-600">{assignment.role}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={handleBulkAssignment}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Assignments...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Assign All Roles
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{result.email}</span>
                    {result.role && <span className="text-sm text-gray-500 ml-2">({result.role})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    {!result.success && result.error && (
                      <span className="text-xs text-red-600">{result.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};