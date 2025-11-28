import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Presentation, Eye, Calendar, User, Edit2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';

interface GroupUpdate {
  id: string;
  group_name: string;
  group_moderator: string;
  team_members: string;
  individual_contributions: string;
  thesis_statement: string;
  project_progress: string;
  source_links: string | null;
  final_product_description: string;
  final_product_link: string | null;
  challenges_faced: string | null;
  completion_plan: string;
  submitter_name: string;
  created_at: string;
}

export default function GroupUpdatesPresentation() {
  const [updates, setUpdates] = useState<GroupUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUpdate, setEditingUpdate] = useState<{ id: string; name: string } | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('group_updates_mus240')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error('Failed to load group updates');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroupName = (update: GroupUpdate) => {
    setEditingUpdate({ id: update.id, name: update.group_name || '' });
    setNewGroupName(update.group_name || `${update.group_moderator}'s Group`);
  };

  const handleUpdateGroupName = async () => {
    if (!editingUpdate || !newGroupName.trim()) {
      toast.error('Please enter a valid group name');
      return;
    }

    // Validate input length
    if (newGroupName.trim().length > 200) {
      toast.error('Group name must be less than 200 characters');
      return;
    }

    try {
      console.log('Updating group name:', { id: editingUpdate.id, newName: newGroupName.trim() });
      
      const { data, error } = await supabase
        .from('group_updates_mus240')
        .update({ group_name: newGroupName.trim() })
        .eq('id', editingUpdate.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful:', data);
      toast.success('Group name updated successfully');
      setEditingUpdate(null);
      setNewGroupName('');
      fetchUpdates();
    } catch (error: any) {
      console.error('Error updating group name:', error);
      toast.error(error.message || 'Failed to update group name');
    }
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </UniversalLayout>
    );
  }

  if (updates.length === 0) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link 
            to="/mus-240/groups"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to Groups</span>
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>No Group Updates Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No group updates have been submitted yet. Check back later!
              </p>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/mus-240/groups" 
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6 bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200 hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back to Groups</span>
            </Link>
          </div>

          {/* Page Title */}
          <Card className="mb-8 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Presentation className="h-8 w-8 text-blue-600" />
                <CardTitle className="text-3xl text-blue-900">Group Presentations</CardTitle>
              </div>
              <CardDescription className="text-blue-700 text-lg">
                View all submitted final project presentations for MUS240
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Presentations List */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {updates.map((update) => (
              <Card 
                key={update.id} 
                className="hover:shadow-lg transition-shadow duration-200 border-2 border-slate-200 hover:border-blue-400"
              >
                <CardHeader className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-t-lg p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Presentation className="h-5 w-5 sm:h-6 sm:w-6 mt-1 flex-shrink-0" />
                      <CardTitle className="text-lg sm:text-xl leading-tight break-words">
                        {update.group_name || `${update.group_moderator}'s Group`}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditGroupName(update)}
                      className="text-white hover:bg-white/20 h-8 w-8 p-0 flex-shrink-0"
                      title="Edit group name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-blue-100 text-sm sm:text-base line-clamp-3">
                    {update.thesis_statement}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm text-slate-600 flex-wrap">
                      <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">Moderator:</span>
                      <span className="break-words">{update.group_moderator}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600">
                      <span className="font-medium">Team Members:</span>
                      <div className="mt-1 ml-4 sm:ml-6 space-y-0.5">
                        {update.team_members.split('\n').map((member, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></div>
                            <span className="break-words flex-1">{member}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm text-slate-600 flex-wrap">
                      <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">Submitted:</span>
                      <span>{new Date(update.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600">
                      <span className="font-medium">By:</span> <span className="break-words">{update.submitter_name}</span>
                    </div>
                  </div>

                  <Link to={`/classes/mus240/groups/presentation/${update.id}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base">
                      <Eye className="h-4 w-4 mr-2" />
                      View Presentation
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Stats */}
          <Card className="mt-8 border-slate-200">
            <CardContent className="pt-6">
              <div className="text-center text-slate-600">
                <p className="text-lg">
                  <span className="font-bold text-2xl text-blue-600">{updates.length}</span>
                  {' '}presentation{updates.length !== 1 ? 's' : ''} submitted
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Group Name Dialog */}
      <Dialog open={!!editingUpdate} onOpenChange={() => setEditingUpdate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
            <DialogDescription>
              Update the name for this group presentation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter new group name"
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdateGroupName}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Update
              </Button>
              <Button 
                variant="outline"
                onClick={() => setEditingUpdate(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </UniversalLayout>
  );
}
