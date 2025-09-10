import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useMus240Groups } from '@/hooks/useMus240Groups';
import { Users, Plus, Clock, CheckCircle, XCircle, UserCheck, Trash2, ArrowLeft, Shuffle, AlertTriangle } from 'lucide-react';
import backgroundImage from '@/assets/mus240-background.jpg';
import { Mus240UserAvatar } from '@/components/mus240/Mus240UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
export default function Groups() {
  const {
    user
  } = useAuth();
  const {
    isAdmin,
    isSuperAdmin
  } = useUserRole();
  const {
    groups,
    loading,
    error,
    createGroup,
    applyToGroup,
    reviewApplication,
    deleteGroup,
    getAvailableGroups,
    getUserGroup,
    getUserApplications,
    getGroupApplications,
    refetch
  } = useMus240Groups();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [deletingAllGroups, setDeletingAllGroups] = useState(false);
  const PROJECT_TYPES = [{
    name: "Commodification & Technology Timeline",
    description: "Explore how music becomes commodified through technology and AI. Create timeline visualizations and analysis of the transformation from art to product."
  }, {
    name: "Artist Careers in the Age of AI",
    description: "Investigate how AI is reshaping musical careers, from composition to performance to distribution. Document case studies and career evolution patterns."
  }, {
    name: "Genres & AI",
    description: "Analyze how AI understands, replicates, and transforms musical genres. Explore genre boundaries and AI's impact on musical categorization."
  }, {
    name: "Cultural Identity & Authorship",
    description: "Examine questions of cultural appropriation, authenticity, and creative ownership in AI-generated music. Investigate identity representation in AI models."
  }, {
    name: "Business & Economics of AI Music",
    description: "Study the economic impact of AI on the music industry, including revenue models, job displacement, and new business opportunities."
  }, {
    name: "Ethics, Futures & Innovation",
    description: "Explore ethical considerations and future possibilities of AI in music. Investigate innovation frameworks and responsible AI development."
  }];
  const hasAdminAccess = isAdmin() || isSuperAdmin();
  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createGroup({
        name: formData.get('name') as string,
        description: formData.get('description') as string
      });
      setShowCreateGroup(false);
      toast.success('Group created successfully!');
    } catch (err) {
      toast.error('Failed to create group');
    }
  };
  const handleApplyToGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await applyToGroup({
        group_id: selectedGroupId,
        full_name: formData.get('full_name') as string,
        email: formData.get('email') as string,
        phone_number: formData.get('phone_number') as string,
        main_skill_set: formData.get('main_skill_set') as string,
        other_skills: formData.get('other_skills') as string,
        motivation: formData.get('motivation') as string
      });
      setShowApplyForm(false);
      toast.success('Application submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit application');
    }
  };
  const handleReviewApplication = async (applicationId: string, status: 'accepted' | 'rejected') => {
    try {
      await reviewApplication(applicationId, status);
      toast.success(`Application ${status} successfully!`);
    } catch (err) {
      toast.error(`Failed to ${status} application`);
    }
  };
  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        await deleteGroup(groupId);
        toast.success('Group deleted successfully!');
      } catch (err) {
        toast.error('Failed to delete group');
      }
    }
  };
  const handleCreateProjectGroups = async () => {
    if (!confirm('This will create all 6 project type groups. Are you sure?')) {
      return;
    }
    setAutoAssigning(true);
    try {
      console.log('Starting to create project groups...');
      console.log('User info:', {
        user: user?.id,
        hasAdminAccess
      });

      // Create groups for each project type
      for (let i = 0; i < PROJECT_TYPES.length; i++) {
        const projectType = PROJECT_TYPES[i];
        console.log(`Creating group ${i + 1}/${PROJECT_TYPES.length}:`, projectType.name);
        const groupData = {
          name: projectType.name,
          description: projectType.description,
          leader_id: user?.id,
          // Set current user as initial leader instead of null
          semester: 'Fall 2025',
          max_members: 4,
          member_count: 1,
          // Start with 1 since we're adding the creator
          is_official: false
        };
        console.log('Group data to insert:', groupData);
        const {
          data,
          error: groupError
        } = await supabase.from('mus240_project_groups').insert(groupData).select();
        if (groupError) {
          console.error('Failed to create group:', projectType.name, groupError);
          throw groupError;
        }
        console.log('Successfully created group:', data);

        // Add the current user as the initial leader member
        if (data && data[0]) {
          const {
            error: membershipError
          } = await supabase.from('mus240_group_memberships').insert({
            group_id: data[0].id,
            member_id: user?.id,
            role: 'leader'
          });
          if (membershipError) {
            console.error('Failed to add leader membership:', membershipError);
            // Don't throw here, group was created successfully
          }
        }
      }
      toast.success(`Successfully created ${PROJECT_TYPES.length} project groups!`);
      refetch();
    } catch (err) {
      console.error('Error creating project groups:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      toast.error(`Failed to create project groups: ${err.message || 'Unknown error'}`);
    } finally {
      setAutoAssigning(false);
    }
  };
  const handleAutoAssignGroups = async () => {
    if (!confirm('This will clear all existing groups and create new ones with the project types. Are you sure?')) {
      return;
    }
    setAutoAssigning(true);
    try {
      // 1. Delete all existing groups and memberships
      const {
        error: deleteGroupsError
      } = await supabase.from('mus240_project_groups').delete().eq('semester', 'Fall 2025');
      if (deleteGroupsError) throw deleteGroupsError;

      // 2. Delete all existing applications
      const {
        error: deleteAppsError
      } = await supabase.from('mus240_group_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteAppsError) throw deleteAppsError;

      // 3. Get all enrolled students
      const {
        data: enrollments,
        error: enrollmentError
      } = await supabase.from('mus240_enrollments').select(`
          student_id,
          gw_profiles!student_id(
            user_id,
            full_name,
            email
          )
        `).eq('semester', 'Fall 2025').eq('enrollment_status', 'enrolled');
      if (enrollmentError) throw enrollmentError;
      const students = enrollments?.filter(e => e.gw_profiles).map(e => ({
        user_id: e.student_id,
        full_name: e.gw_profiles.full_name,
        email: e.gw_profiles.email
      })) || [];
      if (students.length === 0) {
        toast.error('No enrolled students found');
        return;
      }

      // 4. Shuffle students for random assignment
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

      // 5. Create groups for each project type
      const createdGroups = [];
      for (const projectType of PROJECT_TYPES) {
        const {
          data: newGroup,
          error: groupError
        } = await supabase.from('mus240_project_groups').insert({
          name: projectType.name,
          description: projectType.description,
          leader_id: null,
          // Will be set when we assign the first student
          semester: 'Fall 2025',
          max_members: 4,
          is_official: false
        }).select().single();
        if (groupError) throw groupError;
        createdGroups.push(newGroup);
      }

      // 6. Assign students to groups (max 4 per group)
      let studentIndex = 0;
      for (let groupIndex = 0; groupIndex < createdGroups.length; groupIndex++) {
        const group = createdGroups[groupIndex];
        const membersForThisGroup = [];

        // Assign up to 4 students to each group
        for (let memberCount = 0; memberCount < 4 && studentIndex < shuffledStudents.length; memberCount++) {
          const student = shuffledStudents[studentIndex];
          const isLeader = memberCount === 0; // First student is the leader

          // Insert group membership
          const {
            error: membershipError
          } = await supabase.from('mus240_group_memberships').insert({
            group_id: group.id,
            member_id: student.user_id,
            role: isLeader ? 'leader' : 'member'
          });
          if (membershipError) throw membershipError;

          // Update group leader_id for the first student
          if (isLeader) {
            const {
              error: updateLeaderError
            } = await supabase.from('mus240_project_groups').update({
              leader_id: student.user_id
            }).eq('id', group.id);
            if (updateLeaderError) throw updateLeaderError;
          }
          membersForThisGroup.push(student);
          studentIndex++;
        }

        // Update member count
        const {
          error: updateCountError
        } = await supabase.from('mus240_project_groups').update({
          member_count: membersForThisGroup.length,
          is_official: membersForThisGroup.length >= 3
        }).eq('id', group.id);
        if (updateCountError) throw updateCountError;
      }
      toast.success(`Successfully created ${PROJECT_TYPES.length} groups and assigned ${studentIndex} students!`);
      refetch();
    } catch (err) {
      console.error('Auto-assignment error:', err);
      toast.error('Failed to auto-assign groups');
    } finally {
      setAutoAssigning(false);
    }
  };
  const handleDeleteAllGroups = async () => {
    if (!window.confirm('Are you sure you want to delete ALL MUS 240 groups? This action cannot be undone and will remove all groups, memberships, and applications.')) {
      return;
    }
    if (!window.confirm('This will permanently delete all groups and cannot be reversed. Are you absolutely sure?')) {
      return;
    }
    setDeletingAllGroups(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('delete-all-mus240-groups', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (error) {
        console.error('Error deleting all groups:', error);
        toast.error('Failed to delete all groups');
        return;
      }
      if (data?.error) {
        console.error('Server error:', data.error);
        toast.error(data.error);
        return;
      }
      toast.success(data.message || 'Successfully deleted all MUS 240 groups');
      refetch();
    } catch (err) {
      console.error('Delete all groups error:', err);
      toast.error('Failed to delete all groups');
    } finally {
      setDeletingAllGroups(false);
    }
  };
  const userGroup = getUserGroup();
  const userApplications = getUserApplications();
  const availableGroups = getAvailableGroups();
  const totalGroupsCount = groups.length;
  const maxGroups = 7;
  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }
  return <UniversalLayout showHeader={true} showFooter={false}>
      <Mus240UserAvatar />
      <div className="min-h-screen bg-cover bg-center bg-no-repeat relative bg-gradient-to-br from-orange-800 to-amber-600" style={{
      backgroundImage: `url(${backgroundImage})`
    }}>
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
          {/* Header with back navigation */}
          <div className="mb-8">
            <Link to="/classes/mus240" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              Back to MUS 240
            </Link>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Users className="h-6 w-6 md:h-7 md:w-7 text-amber-300" />
              <span className="text-white/90 font-medium text-xl md:text-2xl lg:text-xl xl:text-2xl">AI Music Project Groups</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
              Project Groups
            </h1>
            
            <p className="text-lg md:text-xl lg:text-lg xl:text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-loose">
              Form collaborative groups for the AI music project.
            </p>
          </div>

          {/* Instructions */}
          <div className="text-center mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">AI Group Project Teams</h2>
              <p className="text-white/90 text-lg leading-relaxed mb-4">
                Join one of six themed research groups exploring AI's impact on music. Each group has a maximum of 4 members, 
                with the first person to join becoming the group leader. Groups meet for weekly updates on Wednesdays and 
                focus deep dives on Fridays.
              </p>
              <p className="text-white/80 text-base">
                <strong>Final Showcase:</strong> Integrated GleeWorld.org knowledge hub showcasing your research and findings.
              </p>
            </div>
          </div>

          {/* Status badges and Admin Controls */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-lg px-6 py-3">
              <Users className="h-5 w-5 mr-2" />
              {totalGroupsCount} Groups Created
            </Badge>
            {userGroup && (
              <Badge variant="secondary" className="bg-green-500/80 text-white border-green-400/50 text-lg px-6 py-3">
                <CheckCircle className="h-5 w-5 mr-2" />
                You're in a Group
              </Badge>
            )}
            {hasAdminAccess && (
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateProjectGroups}
                  disabled={autoAssigning}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {autoAssigning ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create AI Project Groups
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleAutoAssignGroups}
                  disabled={autoAssigning}
                  variant="outline"
                  className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                >
                  {autoAssigning ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Auto-assigning...
                    </>
                  ) : (
                    <>
                      <Shuffle className="h-4 w-4 mr-2" />
                      Auto-assign Students
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDeleteAllGroups}
                  disabled={deletingAllGroups}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deletingAllGroups ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Groups
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Main content */}
          <Tabs defaultValue="all-groups" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/10 backdrop-blur-md">
              <TabsTrigger value="all-groups" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                All Groups
              </TabsTrigger>
              <TabsTrigger value="my-group" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                My Group
              </TabsTrigger>
              <TabsTrigger value="applications" className="data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Applications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all-groups" className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">All Groups</h2>
                {!userGroup && availableGroups.length > 0 && (
                  <Button
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <Card key={group.id} className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white">{group.name}</CardTitle>
                          <CardDescription className="text-white/70">
                            {group.description}
                          </CardDescription>
                        </div>
                        {hasAdminAccess && (
                          <Button
                            onClick={() => handleDeleteGroup(group.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-amber-400" />
                          <span className="text-sm text-white/80">
                            {group.member_count || 0} / {group.max_members || 4} members
                          </span>
                        </div>
                        
                        {group.is_official && (
                          <Badge className="bg-green-500/80 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Official
                          </Badge>
                        )}

                        {!userGroup && group.member_count < (group.max_members || 4) && (
                          <Button
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setShowApplyForm(true);
                            }}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            Apply to Join
                          </Button>
                        )}

                        {userGroup?.id === group.id && (
                          <Badge className="w-full justify-center bg-blue-500/80 text-white">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Your Group
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {groups.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Groups Yet</h3>
                  <p className="text-white/70 mb-6">Be the first to create a group for the AI music project!</p>
                  <Button
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Group
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-group" className="space-y-6">
              {userGroup ? (
                <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-white">{userGroup.name}</CardTitle>
                    <CardDescription className="text-white/70">
                      {userGroup.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-400" />
                        <span className="text-sm text-white/80">
                          {userGroup.member_count || 0} / {userGroup.max_members || 4} members
                        </span>
                      </div>
                      
                      {userGroup.is_official && (
                        <Badge className="bg-green-500/80 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Official Group
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Not in a Group</h3>
                  <p className="text-white/70 mb-6">You haven't joined a group yet. Apply to an existing group or create your own!</p>
                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={() => setShowCreateGroup(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="applications" className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Your Applications</h2>
              
              {userApplications.length > 0 ? (
                <div className="space-y-4">
                  {userApplications.map((app) => {
                    const group = groups.find(g => g.id === app.group_id);
                    return (
                      <Card key={app.id} className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white">{group?.name || 'Unknown Group'}</h3>
                              <p className="text-sm text-white/70 mt-1">
                                Applied on {new Date(app.applied_at).toLocaleDateString()}
                              </p>
                            </div>
                          <Badge 
                            className={
                              app.status === 'accepted' ? 'bg-green-500/80 text-white' :
                              app.status === 'rejected' ? 'bg-red-500/80 text-white' :
                              'bg-yellow-500/80 text-white'
                            }
                          >
                            {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {app.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                           </Badge>
                         </div>
                       </CardContent>
                     </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Applications</h3>
                  <p className="text-white/70">You haven't applied to any groups yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Start your own group for the AI music project. You'll be the group leader.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <Label htmlFor="create_name">Group Name *</Label>
              <Input id="create_name" name="name" required placeholder="Enter group name" />
            </div>
            <div>
              <Label htmlFor="create_description">Description</Label>
              <Textarea id="create_description" name="description" placeholder="Describe your group's focus or goals" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                Create Group
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateGroup(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Application Form Dialog */}
      <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to Group</DialogTitle>
            <DialogDescription>
              Fill out this application to join the group.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApplyToGroup} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" name="full_name" required placeholder="Your full name" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="Your email address" />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" name="phone_number" placeholder="Your phone number" />
            </div>
            <div>
              <Label htmlFor="main_skill_set">Main Skill Set *</Label>
              <Select name="main_skill_set" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your main skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="speaker">Speaker</SelectItem>
                  <SelectItem value="researcher">Researcher</SelectItem>
                  <SelectItem value="writer">Writer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="other_skills">Other Skills</Label>
              <Input id="other_skills" name="other_skills" placeholder="Additional skills you bring" />
            </div>
            <div>
              <Label htmlFor="motivation">Why do you want to join? *</Label>
              <Textarea id="motivation" name="motivation" required placeholder="Tell the group leader why you want to join" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                Submit Application
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowApplyForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </UniversalLayout>;
}