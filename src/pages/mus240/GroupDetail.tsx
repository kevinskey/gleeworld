import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Plus, 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  Link as LinkIcon, 
  Trash2, 
  Crown,
  BookOpen
} from 'lucide-react';
import { Mus240UserAvatar } from '@/components/mus240/Mus240UserAvatar';

interface GroupMember {
  id: string;
  full_name: string;
  email: string;
  role: 'leader' | 'member';
}

interface GroupNote {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

interface GroupLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

interface GroupSandbox {
  id: string;
  title: string;
  description: string;
  sandbox_url: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

interface ProjectGroup {
  id: string;
  name: string;
  description: string;
  leader_id: string;
  member_count: number;
  max_members: number;
}

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [notes, setNotes] = useState<GroupNote[]>([]);
  const [links, setLinks] = useState<GroupLink[]>([]);
  const [sandboxes, setSandboxes] = useState<GroupSandbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddSandbox, setShowAddSandbox] = useState(false);

  const NOTEBOOKLM_URL = "https://notebooklm.google.com/notebook/80622ea3-83d2-4cdd-931c-aa11dffe0edf";

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);

      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('mus240_project_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch group members
      const { data: membersData, error: membersError } = await supabase
        .from('mus240_group_memberships')
        .select(`
          member_id,
          role,
          gw_profiles!member_id(
            user_id,
            full_name,
            email
          )
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      const formattedMembers = membersData?.map(m => ({
        id: m.member_id,
        full_name: m.gw_profiles?.full_name || 'Unknown',
        email: m.gw_profiles?.email || '',
        role: m.role as 'leader' | 'member'
      })) || [];

      setMembers(formattedMembers);

      // Fetch group content
      await Promise.all([
        fetchNotes(),
        fetchLinks(),
        fetchSandboxes()
      ]);

    } catch (error) {
      console.error('Error fetching group data:', error);
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('mus240_group_notes' as any)
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setNotes((data as any) || []);
  };

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('mus240_group_links' as any)
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching links:', error);
      return;
    }

    setLinks((data as any) || []);
  };

  const fetchSandboxes = async () => {
    const { data, error } = await supabase
      .from('mus240_group_sandboxes' as any)
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sandboxes:', error);
      return;
    }

    setSandboxes((data as any) || []);
  };

  const handleAddNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await supabase
        .from('mus240_group_notes' as any)
        .insert({
          group_id: groupId,
          title: formData.get('title') as string,
          content: formData.get('content') as string,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Note added successfully');
      setShowAddNote(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleAddLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await supabase
        .from('mus240_group_links' as any)
        .insert({
          group_id: groupId,
          title: formData.get('title') as string,
          url: formData.get('url') as string,
          description: formData.get('description') as string,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Link added successfully');
      setShowAddLink(false);
      fetchLinks();
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Failed to add link');
    }
  };

  const handleAddSandbox = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await supabase
        .from('mus240_group_sandboxes' as any)
        .insert({
          group_id: groupId,
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          sandbox_url: formData.get('sandbox_url') as string,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Sandbox added successfully');
      setShowAddSandbox(false);
      fetchSandboxes();
    } catch (error) {
      console.error('Error adding sandbox:', error);
      toast.error('Failed to add sandbox');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('mus240_group_notes' as any)
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Note deleted successfully');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const { error } = await supabase
        .from('mus240_group_links' as any)
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Link deleted successfully');
      fetchLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to delete link');
    }
  };

  const handleDeleteSandbox = async (sandboxId: string) => {
    if (!confirm('Are you sure you want to delete this sandbox?')) return;

    try {
      const { error } = await supabase
        .from('mus240_group_sandboxes' as any)
        .delete()
        .eq('id', sandboxId);

      if (error) throw error;

      toast.success('Sandbox deleted successfully');
      fetchSandboxes();
    } catch (error) {
      console.error('Error deleting sandbox:', error);
      toast.error('Failed to delete sandbox');
    }
  };

  const isGroupMember = members.some(member => member.id === user?.id);
  const isGroupLeader = members.some(member => member.id === user?.id && member.role === 'leader');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!group) {
    return <div className="min-h-screen flex items-center justify-center">Group not found</div>;
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <Mus240UserAvatar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* Group Header */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-dancing font-bold text-slate-900 mb-2 tracking-wide">{group.name}</h1>
                <p className="text-slate-600 text-lg">{group.description}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="text-center">
                  <Users className="h-4 w-4 mr-1" />
                  {group.member_count}/{group.max_members} Members
                </Badge>
              </div>
            </div>

            {/* Members List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {members.map((member) => (
                <div key={member.id} className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {member.role === 'leader' && <Crown className="h-4 w-4 text-amber-500" />}
                    <span className="font-medium text-slate-900">{member.full_name}</span>
                  </div>
                  <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                    {member.role === 'leader' ? 'Group Leader' : 'Member'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Resources */}
          <div className="mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <BookOpen className="h-5 w-5" />
                  Shared Data Center
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Access the shared NotebookLM workspace for compiling sources, asking questions, and creating media for your projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a 
                  href={NOTEBOOKLM_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open NotebookLM Data Center
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Group Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Notes Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notes
                  </CardTitle>
                  {isGroupMember && (
                    <Button 
                      onClick={() => setShowAddNote(true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {notes.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No notes yet</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{note.title}</h4>
                        {(note.created_by === user?.id || isGroupLeader) && (
                          <Button
                            onClick={() => handleDeleteNote(note.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 h-auto p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm mb-2">{note.content}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Links Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Links
                  </CardTitle>
                  {isGroupMember && (
                    <Button 
                      onClick={() => setShowAddLink(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {links.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No links yet</p>
                ) : (
                  links.map((link) => (
                    <div key={link.id} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          {link.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {(link.created_by === user?.id || isGroupLeader) && (
                          <Button
                            onClick={() => handleDeleteLink(link.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 h-auto p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {link.description && (
                        <p className="text-slate-600 text-sm mb-2">{link.description}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {new Date(link.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Sandboxes Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Sandboxes
                  </CardTitle>
                  {isGroupMember && (
                    <Button 
                      onClick={() => setShowAddSandbox(true)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sandboxes.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No sandboxes yet</p>
                ) : (
                  sandboxes.map((sandbox) => (
                    <div key={sandbox.id} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <a 
                          href={sandbox.sandbox_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          {sandbox.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {(sandbox.created_by === user?.id || isGroupLeader) && (
                          <Button
                            onClick={() => handleDeleteSandbox(sandbox.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 h-auto p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm mb-2">{sandbox.description}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(sandbox.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Create a new note for your group
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div>
              <Label htmlFor="note-title">Title</Label>
              <Input id="note-title" name="title" required placeholder="Note title" />
            </div>
            <div>
              <Label htmlFor="note-content">Content</Label>
              <Textarea id="note-content" name="content" required placeholder="Note content" rows={4} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                Add Note
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddNote(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={showAddLink} onOpenChange={setShowAddLink}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Share a useful link with your group
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLink} className="space-y-4">
            <div>
              <Label htmlFor="link-title">Title</Label>
              <Input id="link-title" name="title" required placeholder="Link title" />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" name="url" type="url" required placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="link-description">Description</Label>
              <Textarea id="link-description" name="description" placeholder="Optional description" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Add Link
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddLink(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Sandbox Dialog */}
      <Dialog open={showAddSandbox} onOpenChange={setShowAddSandbox}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sandbox</DialogTitle>
            <DialogDescription>
              Create a new sandbox environment for your group
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSandbox} className="space-y-4">
            <div>
              <Label htmlFor="sandbox-title">Title</Label>
              <Input id="sandbox-title" name="title" required placeholder="Sandbox title" />
            </div>
            <div>
              <Label htmlFor="sandbox-url">Sandbox URL</Label>
              <Input id="sandbox-url" name="sandbox_url" type="url" required placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="sandbox-description">Description</Label>
              <Textarea id="sandbox-description" name="description" required placeholder="Describe what this sandbox is for" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                Add Sandbox
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddSandbox(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </UniversalLayout>
  );
}