import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useRoleTransitions } from "@/hooks/useRoleTransitions";
import { useAuditionerManagement } from "@/hooks/useAuditionerManagement";
import { USER_ROLES } from "@/constants/permissions";
import { format } from "date-fns";
import { ArrowRightIcon, UserCheckIcon, UsersIcon } from "lucide-react";

export function RoleTransitionManager() {
  const { transitions, loading, transitionUserRole, promoteAuditionerToMember } = useRoleTransitions();
  const { auditioners } = useAuditionerManagement();
  const [targetUserId, setTargetUserId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleRoleTransition = async () => {
    if (!targetUserId || !newRole) return;

    setIsTransitioning(true);
    const success = await transitionUserRole(targetUserId, newRole, reason, notes);
    if (success) {
      setTargetUserId("");
      setNewRole("");
      setReason("");
      setNotes("");
    }
    setIsTransitioning(false);
  };

  const handlePromoteAuditioner = async (auditionerId: string, applicationId: string) => {
    setIsTransitioning(true);
    await promoteAuditionerToMember(auditionerId, applicationId);
    setIsTransitioning(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'visitor': return 'bg-gray-100 text-gray-800';
      case 'fan': return 'bg-blue-100 text-blue-800';
      case 'auditioner': return 'bg-yellow-100 text-yellow-800';
      case 'alumna': return 'bg-purple-100 text-purple-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'super-admin': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Role Transition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheckIcon className="h-5 w-5" />
            Manual Role Transition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user UUID"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(USER_ROLES).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g., manual_promotion, admin_override"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this role change"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleRoleTransition}
            disabled={!targetUserId || !newRole || isTransitioning}
            className="w-full"
          >
            {isTransitioning ? "Transitioning..." : "Change Role"}
          </Button>
        </CardContent>
      </Card>

      {/* Auditioner Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Auditioner Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditioners.length === 0 ? (
            <p className="text-gray-500">No auditioners found.</p>
          ) : (
            <div className="space-y-3">
              {auditioners.map((auditioner) => (
                <div key={auditioner.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{auditioner.full_name || auditioner.email}</p>
                    <p className="text-sm text-gray-600">{auditioner.email}</p>
                    {auditioner.audition_application && (
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {auditioner.audition_application.voice_part_preference}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {auditioner.audition_application.academic_year}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor(auditioner.role)}>
                      {auditioner.role}
                    </Badge>
                    {auditioner.audition_application && (
                      <Button
                        size="sm"
                        onClick={() => handlePromoteAuditioner(
                          auditioner.user_id, 
                          auditioner.audition_application!.id
                        )}
                        disabled={isTransitioning}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Promote to Member
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Transition History */}
      <Card>
        <CardHeader>
          <CardTitle>Role Transition History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading transitions...</p>
          ) : transitions.length === 0 ? (
            <p className="text-gray-500">No role transitions found.</p>
          ) : (
            <div className="space-y-3">
              {transitions.slice(0, 10).map((transition) => (
                <div key={transition.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {transition.from_role && (
                      <Badge className={getRoleColor(transition.from_role)}>
                        {transition.from_role}
                      </Badge>
                    )}
                    <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    <Badge className={getRoleColor(transition.to_role)}>
                      {transition.to_role}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {transition.transition_reason || 'Manual change'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transition.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}