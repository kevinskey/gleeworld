import { useState, useEffect } from "react";
import { MemberSearchDropdown, Member } from "@/components/shared/MemberSearchDropdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus } from "lucide-react";

export const MemberSearchExample = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch members from the database
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('id, user_id, email, full_name, role, exec_board_role, voice_part, class_year')
          .order('full_name', { ascending: true });

        if (error) throw error;

        setMembers(data || []);
      } catch (err: any) {
        console.error('Error fetching members:', err);
        toast({
          title: "Error",
          description: "Failed to load members",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [toast]);

  const handleMemberSelect = (member: Member | null) => {
    setSelectedMember(member);
    if (member) {
      toast({
        title: "Member Selected",
        description: `Selected: ${member.full_name || member.email}`,
      });
    }
  };

  const handleAssignTask = () => {
    if (!selectedMember) {
      toast({
        title: "No Member Selected",
        description: "Please select a member first",
        variant: "destructive",
      });
      return;
    }

    // This is where you would implement your task assignment logic
    toast({
      title: "Task Assigned",
      description: `Task assigned to ${selectedMember.full_name || selectedMember.email}`,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Search Dropdown Example
          </CardTitle>
          <CardDescription>
            Search and select members from the Glee Club roster
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Member Search Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Member</label>
            <MemberSearchDropdown
              members={members}
              selectedMember={selectedMember}
              onSelect={handleMemberSelect}
              placeholder="Search for a member..."
              emptyStateMessage="No members found"
              showBadges={true}
              allowClear={true}
            />
          </div>

          {/* Selected Member Info */}
          {selectedMember && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Selected Member:</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {selectedMember.full_name || 'Not set'}</p>
                  <p><strong>Email:</strong> {selectedMember.email}</p>
                  {selectedMember.voice_part && (
                    <p><strong>Voice Part:</strong> {selectedMember.voice_part}</p>
                  )}
                  {selectedMember.class_year && (
                    <p><strong>Class Year:</strong> {selectedMember.class_year}</p>
                  )}
                  {selectedMember.exec_board_role && (
                    <p><strong>Executive Role:</strong> {selectedMember.exec_board_role}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleAssignTask}
              disabled={!selectedMember}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Assign Task
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setSelectedMember(null)}
              disabled={!selectedMember}
            >
              Clear Selection
            </Button>
          </div>

          {/* Stats */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Total members: {members.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Multiple Dropdowns Example */}
      <Card>
        <CardHeader>
          <CardTitle>Multiple Member Selection</CardTitle>
          <CardDescription>
            Example with multiple dropdowns for different purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Leader</label>
              <MemberSearchDropdown
                members={members.filter(m => m.exec_board_role)} // Only exec board members
                selectedMember={null}
                onSelect={() => {}} // Add your handler
                placeholder="Select project leader..."
                showBadges={false}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Member</label>
              <MemberSearchDropdown
                members={members}
                selectedMember={null}
                onSelect={() => {}} // Add your handler
                placeholder="Select team member..."
                showBadges={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};