import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Presentation, Eye, Calendar, User } from 'lucide-react';
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
            to="/classes/mus240/groups" 
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
              to="/classes/mus240/groups" 
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {updates.map((update) => (
              <Card 
                key={update.id} 
                className="hover:shadow-lg transition-shadow duration-200 border-2 border-slate-200 hover:border-blue-400"
              >
                <CardHeader className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <Presentation className="h-6 w-6 mt-1 flex-shrink-0" />
                    <CardTitle className="text-xl leading-tight">
                      {update.group_name}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-blue-100">
                    {update.thesis_statement.substring(0, 100)}
                    {update.thesis_statement.length > 100 && '...'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">Moderator:</span>
                      <span>{update.group_moderator}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">Submitted:</span>
                      <span>{new Date(update.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">By:</span> {update.submitter_name}
                    </div>
                  </div>

                  <Link to={`/classes/mus240/groups/presentation/${update.id}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
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
    </UniversalLayout>
  );
}
