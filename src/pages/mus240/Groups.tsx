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
  const PROJECT_TYPES = [{
    name: "Podcast Group",
    description: "Record and curate conversations about music and culture. Deliverable: Podcast archive hosted on GleeWorld Radio."
  }, {
    name: "Merchandise/Commodification Group",
    description: "Explore how ideas become commodities. Deliverable: Mockups for GleeWorld e-commerce store, commission models, design drafts."
  }, {
    name: "Video/Documentary Group",
    description: "Collect oral histories, interviews, and rehearsal footage. Deliverable: Video archive and short documentaries on GleeWorld."
  }, {
    name: "Slideshows/Visual History Group",
    description: "Build timeline and image narratives. Deliverable: Curated slideshows with captions published to the GleeWorld library."
  }, {
    name: "Audio Archive Group",
    description: "Gather clips, performances, and samples. Deliverable: Audio archive, categorized and searchable on GleeWorld."
  }, {
    name: "Digital Exhibits/Interactive Group",
    description: "Create interactive showcases linking text, image, and sound. Deliverable: Online exhibits embedded in the GleeWorld portal."
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
          semester: 'Fall 2024',
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
      } = await supabase.from('mus240_project_groups').delete().eq('semester', 'Fall 2024');
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
        `).eq('semester', 'Fall 2024').eq('enrollment_status', 'enrolled');
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
          semester: 'Fall 2024',
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
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="font-semibold text-white mb-4 text-xl">📋 Assignment Instructions</h2>
            <div className="text-white/90 space-y-3">
              <p className="font-medium">This is a graded assignment. You must participate in a group to receive credit.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {PROJECT_TYPES.map((project, index) => <div key={index} className="bg-white/20 rounded-lg p-4 border border-white/20">
                    <h3 className="font-semibold text-amber-300 mb-2">{project.name}</h3>
                    <p className="text-sm text-white/80">{project.description}</p>
                  </div>)}
              </div>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li><strong>Have an idea?</strong> Create your own group and recruit members</li>
                <li><strong>Looking to join?</strong> Browse existing groups and apply to ones that interest you</li>
                <li><strong>Can't decide?</strong> You can do both - create a group AND apply to others</li>
                <li>Groups need 3-4 members to become official and start the project</li>
              </ul>
            </div>
          </div>

          {/* Status badges and Admin Controls */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex gap-4 justify-center">
              <Badge variant={totalGroupsCount < maxGroups ? "default" : "destructive"} className="text-lg px-4 py-2">
                {totalGroupsCount}/{maxGroups} Groups Available
              </Badge>
              {userGroup && <Badge variant="secondary" className="text-lg px-4 py-2">
                  You're in: {userGroup.name}
                </Badge>}
            </div>
            
            {hasAdminAccess && <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                  <span className="text-white font-medium">Admin Controls</span>
                </div>
                <div className="flex flex-col gap-3">
                  
                  <Button onClick={handleAutoAssignGroups} disabled={autoAssigning} className="bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-2">
                    {autoAssigning ? <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Auto-Assigning...
                      </> : <>
                        <Shuffle className="h-4 w-4 mr-2" />
                        Auto-Assign All Students to Project Groups
                      </>}
                  </Button>
                </div>
                <div className="text-xs text-white/70 space-y-1">
                  
                  <p>Auto-Assign: Clears existing groups and randomly assigns all enrolled students (max 4 per group)</p>
                </div>
              </div>}
          </div>

          {/* Main content */}
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-md border border-white/20">
              <TabsTrigger value="browse" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">Browse Groups</TabsTrigger>
              <TabsTrigger value="my-group" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">My Group</TabsTrigger>
              <TabsTrigger value="applications" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">Applications</TabsTrigger>
              <TabsTrigger value="create" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">Create Group</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-6 mt-8">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {availableGroups.map(group => <Card key={group.id} className={`${group.is_official ? "border-green-400" : "border-orange-400"} bg-white/95 backdrop-blur-sm shadow-xl`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <CardDescription>
                            Led by {group.leader_profile?.full_name}
                          </CardDescription>
                        </div>
                        <Badge variant={group.is_official ? "default" : "secondary"}>
                          {group.is_official ? "Official" : "Forming"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.description && <p className="text-sm text-muted-foreground mb-3">{group.description}</p>}
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{group.member_count}/{group.max_members} members</span>
                      </div>
                      {!userGroup && !userApplications.some(app => app.group_id === group.id) && <Button onClick={() => {
                    setSelectedGroupId(group.id);
                    setShowApplyForm(true);
                  }} className="w-full bg-amber-500 hover:bg-amber-600 text-white" disabled={group.member_count >= group.max_members}>
                          Apply to Join
                        </Button>}
                      {userApplications.some(app => app.group_id === group.id) && <Button variant="outline" className="w-full" disabled>
                          Application Pending
                        </Button>}
                    </CardContent>
                  </Card>)}
              </div>
              
              {totalGroupsCount < maxGroups && !userGroup && <Card className="border-dashed border-white/30 bg-white/10 backdrop-blur-md">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Plus className="h-12 w-12 text-white/70 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">Create Your Own Group</h3>
                    <p className="text-white/80 text-center mb-4">
                      Start your own group and recruit members for the AI music project
                    </p>
                    <Button onClick={() => setShowCreateGroup(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
                      Create Group
                    </Button>
                  </CardContent>
                </Card>}
            </TabsContent>

            <TabsContent value="my-group" className="mt-8">
              {userGroup ? <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{userGroup.name}</CardTitle>
                        <CardDescription>
                          {userGroup.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={userGroup.is_official ? "default" : "secondary"}>
                          {userGroup.is_official ? "Official" : "Forming"}
                        </Badge>
                        {userGroup.leader_id === user?.id && userGroup.member_count <= 1 && <Button variant="destructive" size="sm" onClick={() => handleDeleteGroup(userGroup.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Members ({userGroup.member_count}/{userGroup.max_members})</h4>
                        <div className="space-y-2">
                          {userGroup.members?.map(member => <div key={member.id} className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              <span>{member.gw_profiles?.full_name}</span>
                              {member.role === 'leader' && <Badge variant="outline" className="text-xs">Leader</Badge>}
                            </div>)}
                        </div>
                      </div>
                      
                      {userGroup.leader_id === user?.id && <div>
                          <h4 className="font-semibold mb-2">Pending Applications</h4>
                          <div className="space-y-2">
                            {getGroupApplications(userGroup.id).filter(app => app.status === 'pending').map(application => <Card key={application.id} className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{application.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{application.email}</p>
                                    <p className="text-sm">
                                      <strong>Skills:</strong> {application.main_skill_set}
                                      {application.other_skills && `, ${application.other_skills}`}
                                    </p>
                                    {application.motivation && <p className="text-sm mt-1">
                                        <strong>Motivation:</strong> {application.motivation}
                                      </p>}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleReviewApplication(application.id, 'accepted')} disabled={userGroup.member_count >= userGroup.max_members} className="bg-green-500 hover:bg-green-600 text-white">
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleReviewApplication(application.id, 'rejected')}>
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>)}
                          </div>
                        </div>}
                    </div>
                  </CardContent>
                </Card> : <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Group Yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      You haven't joined a group yet. Browse available groups or create your own.
                    </p>
                  </CardContent>
                </Card>}
            </TabsContent>

            <TabsContent value="applications" className="mt-8">
              <div className="space-y-6">
                {userApplications.length > 0 ? userApplications.map(application => {
                const group = groups.find(g => g.id === application.group_id);
                return <Card key={application.id} className="bg-white/95 backdrop-blur-sm shadow-xl">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{group?.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Applied on {new Date(application.applied_at).toLocaleDateString()}
                              </p>
                              <p className="text-sm">
                                <strong>Skills:</strong> {application.main_skill_set}
                                {application.other_skills && `, ${application.other_skills}`}
                              </p>
                            </div>
                            <Badge variant={application.status === 'pending' ? 'secondary' : application.status === 'accepted' ? 'default' : 'destructive'}>
                              {application.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {application.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {application.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                              {application.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>;
              }) : <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Applications</h3>
                      <p className="text-muted-foreground text-center">
                        You haven't applied to any groups yet.
                      </p>
                    </CardContent>
                  </Card>}
              </div>
            </TabsContent>

            <TabsContent value="create" className="mt-8">
              {totalGroupsCount >= maxGroups ? <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <XCircle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No More Groups Available</h3>
                    <p className="text-muted-foreground text-center">
                      The maximum of {maxGroups} groups has been reached. You can only join existing groups.
                    </p>
                  </CardContent>
                </Card> : userGroup ? <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Already in a Group</h3>
                    <p className="text-muted-foreground text-center">
                      You're already a member of "{userGroup.name}". You can only be in one group.
                    </p>
                  </CardContent>
                </Card> : <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle>Create New Group</CardTitle>
                    <CardDescription>
                      Start your own group for the AI music project. You'll be the group leader.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Group Name *</Label>
                        <Input id="name" name="name" required placeholder="Enter group name" />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" placeholder="Describe your group's focus or goals" rows={3} />
                      </div>
                      <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                        Create Group
                      </Button>
                    </form>
                  </CardContent>
                </Card>}
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