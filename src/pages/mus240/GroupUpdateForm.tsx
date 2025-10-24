import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, FileText, HelpCircle, X, GripVertical } from 'lucide-react';
import { useMus240Enrollment } from '@/hooks/useMus240Enrollment';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rnd } from 'react-rnd';

const GROUP_OPTIONS = [
  "ANTI AI",
  "ETHICS and AI", 
  "Business & Economics of AI Music",
  "Cultural Identity & Authorship",
  "Artist Careers in the Age of AI",
  "Performance Project – AI in Performance"
];

export default function GroupUpdateForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isEnrolled, loading: enrollmentLoading } = useMus240Enrollment();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [groupMembers, setGroupMembers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [formData, setFormData] = useState({
    groupName: '',
    groupModerator: '',
    teamMembers: '',
    individualContributions: '',
    thesisStatement: '',
    projectProgress: '',
    sourceLinks: '',
    finalProductDescription: '',
    finalProductLink: '',
    challengesFaced: '',
    completionPlan: ''
  });

  // Fetch groups from database
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('mus240_project_groups')
          .select('id, name')
          .eq('semester', 'Fall 2025')
          .order('name');

        if (error) throw error;
        setGroups(data || []);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast.error('Failed to load groups');
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  // Fetch group members when group is selected
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!formData.groupName) {
        setGroupMembers([]);
        return;
      }

      try {
        const selectedGroup = groups.find(g => g.name === formData.groupName);
        if (!selectedGroup) return;

        // Fetch leader
        const { data: groupData, error: groupError } = await supabase
          .from('mus240_project_groups')
          .select('leader_id, gw_profiles!mus240_project_groups_leader_id_fkey(id, full_name, email)')
          .eq('id', selectedGroup.id)
          .single();

        if (groupError) throw groupError;

        // Fetch members
        const { data: membersData, error: membersError } = await supabase
          .from('mus240_group_memberships' as any)
          .select('member_id, gw_profiles(id, full_name, email)')
          .eq('group_id', selectedGroup.id);

        if (membersError) throw membersError;

        const allMembers: { id: string; full_name: string; email: string }[] = [];
        
        // Add leader
        if (groupData?.gw_profiles) {
          const leader = groupData.gw_profiles as any;
          allMembers.push({
            id: leader.id,
            full_name: leader.full_name,
            email: leader.email
          });
        }

        // Add other members
        if (membersData) {
          membersData.forEach((m: any) => {
            if (m.gw_profiles) {
              allMembers.push({
                id: m.gw_profiles.id,
                full_name: m.gw_profiles.full_name,
                email: m.gw_profiles.email
              });
            }
          });
        }

        setGroupMembers(allMembers);
      } catch (error) {
        console.error('Error fetching group members:', error);
        toast.error('Failed to load group members');
      }
    };

    fetchGroupMembers();
  }, [formData.groupName, groups]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit updates');
      return;
    }

    // Validate required fields
    if (!formData.groupName) {
      toast.error('Please select a group name');
      return;
    }
    if (!formData.groupModerator) {
      toast.error('Please select a group moderator');
      return;
    }
    if (!formData.teamMembers) {
      toast.error('Please list all team members');
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('group_updates_mus240')
        .insert({
          group_name: formData.groupName,
          group_moderator: formData.groupModerator,
          team_members: formData.teamMembers,
          individual_contributions: formData.individualContributions,
          thesis_statement: formData.thesisStatement,
          project_progress: formData.projectProgress,
          source_links: formData.sourceLinks || null,
          final_product_description: formData.finalProductDescription,
          final_product_link: formData.finalProductLink || null,
          challenges_faced: formData.challengesFaced || null,
          completion_plan: formData.completionPlan,
          submitter_name: profile?.full_name || user.email || 'Unknown',
          submitter_id: user.id
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Your group update has been recorded!');
    } catch (error: any) {
      console.error('Error submitting update:', error);
      toast.error(error.message || 'Failed to submit update');
    } finally {
      setSubmitting(false);
    }
  };

  if (enrollmentLoading || roleLoading || loadingGroups) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </UniversalLayout>
    );
  }

  if (!user) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800">Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700">Please log in to submit a group update.</p>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  // Allow admins and super admins to bypass enrollment check
  if (!isEnrolled() && !isAdmin() && !isSuperAdmin()) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800">MUS240 Enrollment Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700">
                You must be enrolled in MUS240 to submit group updates.
                Please contact your instructor if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  if (submitted) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">
                Update Submitted Successfully!
              </h1>
              <p className="text-lg text-slate-600 mb-8">
                Your group's update has been recorded. Keep working toward your final presentation!
              </p>
              <Link to="/classes/mus240/groups">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Groups
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      {showGuidelines && (
        <Rnd
          default={{
            x: window.innerWidth / 2 - 400,
            y: window.innerHeight / 2 - 300,
            width: 800,
            height: 600,
          }}
          minWidth={400}
          minHeight={400}
          bounds="window"
          dragHandleClassName="drag-handle"
          className="z-50"
        >
          <div className="bg-background border rounded-lg shadow-lg h-full flex flex-col">
            <div className="drag-handle cursor-move bg-muted px-6 py-4 rounded-t-lg flex items-center justify-between border-b">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Questions to Consider</h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGuidelines(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground px-6 pt-4">
              Reflect on these questions with your team before submitting.
            </p>
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6 pr-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    🧭 Project Details
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    <li>What problem or question are we actually trying to solve in the intersection of AI and music?</li>
                    <li>Why does this problem matter now? Who is affected by it?</li>
                    <li>Is our goal clearly stated in one or two sentences that someone outside the class could understand?</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    🎯 Thesis Statement / Goal
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    <li>What is our main claim or idea?</li>
                    <li>Can we defend it with evidence or examples?</li>
                    <li>How does it connect to what we've learned about ethics, creativity, or cultural impact in AI music?</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    🔧 Project Progress Summary
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    <li>What have we done so far—research, interviews, design, testing, writing?</li>
                    <li>What results or insights have we gathered?</li>
                    <li>What's still missing, and why?</li>
                    <li>How has our direction evolved since the start?</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    🔗 Links to Sources Found
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    <li>Which sources most shaped our thinking?</li>
                    <li>Do we have a balance of scholarly, journalistic, and multimedia sources?</li>
                    <li>Are all our links still accessible and properly cited?</li>
                    <li>Have we included any primary sources (e.g., artist interviews, data, or our own recordings)?</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    🧩 Final Product & Completion
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    <li>What are we actually creating or presenting—what will the audience see or experience?</li>
                    <li>How does this product solve or respond to the problem we identified?</li>
                    <li>What tools or technologies (AI models, DAWs, websites, datasets) are we using?</li>
                    <li>How will we measure whether our product "works" or communicates its message?</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    🚧 Challenges Faced
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    <li>What obstacles slowed us down—technical, creative, scheduling, communication?</li>
                    <li>How did we address or adapt to those challenges?</li>
                    <li>Did any surprise discoveries reshape our project?</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    🪜 Plan for Completion
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                    <li>What specific tasks remain (research, editing, coding, rehearsing, etc.)?</li>
                    <li>Who is responsible for each?</li>
                    <li>What's our realistic timeline for finalizing everything?</li>
                    <li>What will success look like on presentation day?</li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end px-6 py-4 border-t">
              <Button onClick={() => setShowGuidelines(false)}>
                Got it, let's start
              </Button>
            </div>
          </div>
        </Rnd>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with back navigation */}
          <div className="mb-8">
            <Link 
              to="/classes/mus240/groups" 
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6 bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200 hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back to Groups</span>
            </Link>
          </div>

          {/* Intro Banner */}
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-2xl text-blue-900">Final Project Group Update</CardTitle>
              </div>
              <CardDescription className="text-blue-700 text-base">
                Submit your group's latest progress update for your AI & Music final project. 
                Each team should report one update including moderator, member contributions, 
                research links, and your developing final product.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Group Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Group Name */}
                <div>
                  <Label htmlFor="groupName">Group Name *</Label>
                  <Select 
                    value={formData.groupName} 
                    onValueChange={(value) => handleInputChange('groupName', value)}
                    required
                  >
                    <SelectTrigger id="groupName">
                      <SelectValue placeholder="Select your group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.name}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Group Moderator */}
                <div>
                  <Label htmlFor="groupModerator">Group Moderator *</Label>
                  <Select 
                    value={formData.groupModerator} 
                    onValueChange={(value) => handleInputChange('groupModerator', value)}
                    required
                    disabled={!formData.groupName}
                  >
                    <SelectTrigger id="groupModerator">
                      <SelectValue placeholder={formData.groupName ? "Select moderator" : "Select a group first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {groupMembers.map((member) => (
                        <SelectItem key={member.id} value={member.full_name}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Members */}
                <div>
                  <Label htmlFor="teamMembers">All Team Members (one per line) *</Label>
                  <Textarea
                    id="teamMembers"
                    value={formData.teamMembers}
                    onChange={(e) => handleInputChange('teamMembers', e.target.value)}
                    placeholder={formData.groupName ? "List all team members, one per line..." : "Select a group first"}
                    required
                    disabled={!formData.groupName}
                    rows={4}
                    className="resize-y"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {groupMembers.length > 0 
                      ? `Group members: ${groupMembers.map(m => m.full_name).join(', ')}`
                      : 'Select a group to see registered members'
                    }
                  </p>
                </div>

                {/* My Individual Contribution */}
                <div>
                  <Label htmlFor="individualContributions">My Individual Contribution *</Label>
                  <Textarea
                    id="individualContributions"
                    value={formData.individualContributions}
                    onChange={(e) => handleInputChange('individualContributions', e.target.value)}
                    placeholder="Describe your specific role and work on this project"
                    rows={5}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Each group member should submit their own contribution separately.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Thesis Statement */}
                <div>
                  <Label htmlFor="thesisStatement">Thesis Statement / Goal *</Label>
                  <Textarea
                    id="thesisStatement"
                    value={formData.thesisStatement}
                    onChange={(e) => handleInputChange('thesisStatement', e.target.value)}
                    placeholder="What is your project's main thesis or goal?"
                    rows={4}
                    required
                  />
                </div>

                {/* Project Progress */}
                <div>
                  <Label htmlFor="projectProgress">Project Progress Summary *</Label>
                  <Textarea
                    id="projectProgress"
                    value={formData.projectProgress}
                    onChange={(e) => handleInputChange('projectProgress', e.target.value)}
                    placeholder="Summarize your group's progress so far"
                    rows={5}
                    required
                  />
                </div>

                {/* Source Links */}
                <div>
                  <Label htmlFor="sourceLinks">Links to Sources Found</Label>
                  <Textarea
                    id="sourceLinks"
                    value={formData.sourceLinks}
                    onChange={(e) => handleInputChange('sourceLinks', e.target.value)}
                    placeholder="One link per line"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Final Product & Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Final Product Description */}
                <div>
                  <Label htmlFor="finalProductDescription">Final Product Description *</Label>
                  <Textarea
                    id="finalProductDescription"
                    value={formData.finalProductDescription}
                    onChange={(e) => handleInputChange('finalProductDescription', e.target.value)}
                    placeholder="Describe the tangible product and its problem-solving goal"
                    rows={5}
                    required
                  />
                </div>

                {/* Final Product Link */}
                <div>
                  <Label htmlFor="finalProductLink">Link or Upload for Final Product</Label>
                  <Input
                    id="finalProductLink"
                    type="url"
                    value={formData.finalProductLink}
                    onChange={(e) => handleInputChange('finalProductLink', e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                {/* Challenges Faced */}
                <div>
                  <Label htmlFor="challengesFaced">Challenges Faced</Label>
                  <Textarea
                    id="challengesFaced"
                    value={formData.challengesFaced}
                    onChange={(e) => handleInputChange('challengesFaced', e.target.value)}
                    placeholder="What difficulties has your group encountered?"
                    rows={4}
                  />
                </div>

                {/* Plan for Completion */}
                <div>
                  <Label htmlFor="completionPlan">Plan for Completion *</Label>
                  <Textarea
                    id="completionPlan"
                    value={formData.completionPlan}
                    onChange={(e) => handleInputChange('completionPlan', e.target.value)}
                    placeholder="What are your next steps to complete the project?"
                    rows={4}
                    required
                  />
                </div>

                {/* Submitter Name (auto-filled) */}
                <div>
                  <Label htmlFor="submitterName">Submitter Name</Label>
                  <Input
                    id="submitterName"
                    value={profile?.full_name || user.email || 'Unknown'}
                    disabled
                    className="bg-slate-100"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link to="/classes/mus240/groups">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Submitting...' : 'Submit Update'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </UniversalLayout>
  );
}
