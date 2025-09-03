import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMus240Groups } from '@/hooks/useMus240Groups';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Users, Plus, Clock, CheckCircle, XCircle, UserCheck, Trash2 } from 'lucide-react';

export default function Groups() {
  const { user } = useAuth();
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
    getGroupApplications
  } = useMus240Groups();

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Music Project Groups</h1>
        
        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📋 Assignment Instructions</h2>
          <div className="text-blue-800 dark:text-blue-200 space-y-2">
            <p className="font-medium">This is a graded assignment. You must participate in a group to receive credit.</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Have an idea?</strong> Create your own group and recruit members</li>
              <li><strong>Looking to join?</strong> Browse existing groups and apply to ones that interest you</li>
              <li><strong>Can't decide?</strong> You can do both - create a group AND apply to others</li>
              <li>Groups need 3-4 members to become official and start the project</li>
            </ul>
          </div>
        </div>
        
        <p className="text-muted-foreground mb-4">
          Form groups for the AI music project. Groups need 3-4 members to be official.
        </p>
        <div className="flex gap-4 mb-6">
          <Badge variant={totalGroupsCount < maxGroups ? "default" : "destructive"}>
            {totalGroupsCount}/{maxGroups} Groups Available
          </Badge>
          {userGroup && (
            <Badge variant="secondary">
              You're in: {userGroup.name}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse">Browse Groups</TabsTrigger>
          <TabsTrigger value="my-group">My Group</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="create">Create Group</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableGroups.map((group) => (
              <Card key={group.id} className={group.is_official ? "border-green-200" : "border-orange-200"}>
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
                  {group.description && (
                    <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{group.member_count}/{group.max_members} members</span>
                  </div>
                  {!userGroup && !userApplications.some(app => app.group_id === group.id) && (
                    <Button 
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setShowApplyForm(true);
                      }}
                      className="w-full"
                      disabled={group.member_count >= group.max_members}
                    >
                      Apply to Join
                    </Button>
                  )}
                  {userApplications.some(app => app.group_id === group.id) && (
                    <Button variant="outline" className="w-full" disabled>
                      Application Pending
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {totalGroupsCount < maxGroups && !userGroup && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Create Your Own Group</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start your own group and recruit members for the AI music project
                </p>
                <Button onClick={() => setShowCreateGroup(true)}>
                  Create Group
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-group">
          {userGroup ? (
            <Card>
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
                    {userGroup.leader_id === user?.id && userGroup.member_count <= 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteGroup(userGroup.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Members ({userGroup.member_count}/{userGroup.max_members})</h4>
                    <div className="space-y-2">
                      {userGroup.members?.map((member) => (
                        <div key={member.id} className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          <span>{member.gw_profiles?.full_name}</span>
                          {member.role === 'leader' && (
                            <Badge variant="outline" className="text-xs">Leader</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {userGroup.leader_id === user?.id && (
                    <div>
                      <h4 className="font-semibold mb-2">Pending Applications</h4>
                      <div className="space-y-2">
                        {getGroupApplications(userGroup.id)
                          .filter(app => app.status === 'pending')
                          .map((application) => (
                          <Card key={application.id} className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{application.full_name}</p>
                                <p className="text-sm text-muted-foreground">{application.email}</p>
                                <p className="text-sm">
                                  <strong>Skills:</strong> {application.main_skill_set}
                                  {application.other_skills && `, ${application.other_skills}`}
                                </p>
                                {application.motivation && (
                                  <p className="text-sm mt-1">
                                    <strong>Motivation:</strong> {application.motivation}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewApplication(application.id, 'accepted')}
                                  disabled={userGroup.member_count >= userGroup.max_members}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReviewApplication(application.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Group Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven't joined a group yet. Browse available groups or create your own.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applications">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Applications</h2>
            {userApplications.length > 0 ? (
              <div className="space-y-4">
                {userApplications.map((application) => {
                  const group = groups.find(g => g.id === application.group_id);
                  return (
                    <Card key={application.id}>
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
                          <Badge variant={
                            application.status === 'pending' ? 'secondary' :
                            application.status === 'accepted' ? 'default' : 'destructive'
                          }>
                            {application.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {application.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {application.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                            {application.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Applications</h3>
                  <p className="text-muted-foreground text-center">
                    You haven't applied to any groups yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          {totalGroupsCount >= maxGroups ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-semibold mb-2">No More Groups Available</h3>
                <p className="text-muted-foreground text-center">
                  The maximum of {maxGroups} groups has been reached. You can only join existing groups.
                </p>
              </CardContent>
            </Card>
          ) : userGroup ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Already in a Group</h3>
                <p className="text-muted-foreground text-center">
                  You're already a member of "{userGroup.name}". You can only be in one group.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
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
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Enter group name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe your group's focus or goals"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Group
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
              <Input
                id="create_name"
                name="name"
                required
                placeholder="Enter group name"
              />
            </div>
            <div>
              <Label htmlFor="create_description">Description</Label>
              <Textarea
                id="create_description"
                name="description"
                placeholder="Describe your group's focus or goals"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Create Group
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateGroup(false)}
              >
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
              <Input
                id="full_name"
                name="full_name"
                required
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Your email address"
              />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                name="phone_number"
                placeholder="Your phone number"
              />
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
              <Input
                id="other_skills"
                name="other_skills"
                placeholder="Additional skills you bring"
              />
            </div>
            <div>
              <Label htmlFor="motivation">Why do you want to join? *</Label>
              <Textarea
                id="motivation"
                name="motivation"
                required
                placeholder="Tell the group leader why you want to join"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Submit Application
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApplyForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}