import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, CheckCircle, XCircle, Key } from "lucide-react";

export const ExecuteBulkAssignment = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [passwordResults, setPasswordResults] = useState<any[]>([]);

  const assignments = [
    { email: "ryanbates@spelman.edu", full_name: "Ryan Bates", role: "president" },
    { email: "raynestewart@spelman.edu", full_name: "Rayne Stewart", role: "treasurer" },
    { email: "adriannahighgate@spelman.edu", full_name: "Adrianna Highgate", role: "secretary" },
    { email: "onnestypeele@spelman.edu", full_name: "Onnesty Peele", role: "tour_manager" },
    { email: "avachallenger@spelman.edu", full_name: "Ava Challenger", role: "pr_coordinator" },
    { email: "phoenixking@spelman.edu", full_name: "Phoenix King", role: "historian" },
    { email: "madisynwashington@spelman.edu", full_name: "Madisyn Washington", role: "librarian" },
    { email: "drewroberts@spelman.edu", full_name: "Drew Roberts", role: "wardrobe_manager" },
    { email: "kyerrashields@spelman.edu", full_name: "Kyerra Shields", role: "chaplain" },
    { email: "arianaswindell@spelman.edu", full_name: "Ariana Swindell", role: "student_conductor" },
    { email: "sagemae@spelman.edu", full_name: "Sage Mae", role: "section_leader_a1" },
    { email: "gabriellemagee@spelman.edu", full_name: "Gabrielle MaGee", role: "section_leader_a2" },
    { email: "elissajefferson@spelman.edu", full_name: "Elissa Jefferson", role: "section_leader_s2" },
    { email: "jordynoneal@spelman.edu", full_name: "Jordyn O'Neal", role: "data_analyst" },
    { email: "sanaiaharrison@spelman.edu", full_name: "Sanaia Harrison", role: "data_analyst" },
    { email: "kennidytroupe@spelman.edu", full_name: "Kennidy Troupe", role: "assistant_chaplain" },
    { email: "allanawalker@spelman.edu", full_name: "Allana Walker", role: "data_analyst" },
    { email: "soleilvailes@spelman.edu", full_name: "Soleil Vailes", role: "assistant_chaplain" },
    { email: "tyarapetty@spelman.edu", full_name: "T'yara Petty", role: "assistant_chaplain" },
    { email: "alexandrawilliams@spelman.edu", full_name: "Alexandra Williams", role: "assistant_chaplain" },
  ];

  const executeAssignments = async () => {
    setLoading(true);
    try {
      console.log('Starting bulk executive board assignments...');

      // First, execute the bulk assignments
      const { data: assignmentData, error: assignmentError } = await supabase.functions.invoke('bulk-assign-exec-board', {
        body: { assignments }
      });

      if (assignmentError) {
        console.error('Error in bulk assignment:', assignmentError);
        toast({
          title: "Assignment Error",
          description: "Failed to assign executive board roles",
          variant: "destructive",
        });
        return;
      }

      setResults(assignmentData.results || []);
      console.log('Assignment results:', assignmentData);

      // Then, reset passwords for all users
      console.log('Starting password resets...');
      const passwordResetResults = [];

      for (const assignment of assignments) {
        try {
          console.log(`Resetting password for ${assignment.email}...`);
          
          const { data: resetData, error: resetError } = await supabase.functions.invoke('admin-reset-password', {
            body: { 
              email: assignment.email,
              newPassword: 'spelman'
            }
          });

          if (resetError) {
            console.error(`Password reset failed for ${assignment.email}:`, resetError);
            passwordResetResults.push({
              email: assignment.email,
              success: false,
              error: resetError.message || 'Password reset failed'
            });
          } else {
            console.log(`Password reset successful for ${assignment.email}`);
            passwordResetResults.push({
              email: assignment.email,
              success: true
            });
          }
        } catch (error) {
          console.error(`Error resetting password for ${assignment.email}:`, error);
          passwordResetResults.push({
            email: assignment.email,
            success: false,
            error: 'Network error during password reset'
          });
        }
      }

      setPasswordResults(passwordResetResults);

      const successfulAssignments = assignmentData.results?.filter((r: any) => r.success)?.length || 0;
      const successfulPasswordResets = passwordResetResults.filter(r => r.success).length;
      
      toast({
        title: "Bulk Operations Complete",
        description: `Assignments: ${successfulAssignments}/${assignments.length} successful. Passwords: ${successfulPasswordResets}/${assignments.length} reset.`,
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to process bulk operations",
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
            Execute Executive Board Setup
          </CardTitle>
          <CardDescription>
            Assign roles and set passwords for all executive board members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">This will:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Assign executive board roles to {assignments.length} users</li>
                <li>Set all passwords to "spelman"</li>
                <li>Grant appropriate permissions and access levels</li>
                <li>Create user profiles for anyone who doesn't exist</li>
              </ul>
            </div>

            <Button 
              onClick={executeAssignments}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing {assignments.length} Users...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Execute All Assignments & Password Resets
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Role Assignment Results
            </CardTitle>
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
                      <span className="text-xs text-red-600 max-w-xs truncate">{result.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Reset Results */}
      {passwordResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Password Reset Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {passwordResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{result.email}</span>
                    <span className="text-sm text-gray-500 ml-2">(password: spelman)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    {!result.success && result.error && (
                      <span className="text-xs text-red-600 max-w-xs truncate">{result.error}</span>
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