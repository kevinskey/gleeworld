import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ChevronLeft, ChevronRight, Presentation, ExternalLink } from 'lucide-react';
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

export default function GroupPresentationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [update, setUpdate] = useState<GroupUpdate | null>(null);
  const [allUpdates, setAllUpdates] = useState<GroupUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch all updates for navigation
      const { data: allData, error: allError } = await supabase
        .from('group_updates_mus240')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllUpdates(allData || []);

      // Fetch specific update
      const { data: updateData, error: updateError } = await supabase
        .from('group_updates_mus240')
        .select('*')
        .eq('id', id)
        .single();

      if (updateError) throw updateError;
      setUpdate(updateData);

      // Find current index
      const index = (allData || []).findIndex(u => u.id === id);
      setCurrentIndex(index);
    } catch (error) {
      console.error('Error fetching update:', error);
      toast.error('Failed to load presentation');
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      navigate(`/classes/mus240/groups/presentation/${allUpdates[currentIndex - 1].id}`);
    }
  };

  const goToNext = () => {
    if (currentIndex < allUpdates.length - 1) {
      navigate(`/classes/mus240/groups/presentation/${allUpdates[currentIndex + 1].id}`);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'Escape') navigate('/classes/mus240/groups/presentation');
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, allUpdates.length]);

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </UniversalLayout>
    );
  }

  if (!update) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link 
            to="/classes/mus240/groups/presentation" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to Presentations</span>
          </Link>
          <div className="text-center py-12">
            <p className="text-lg text-slate-600">Presentation not found</p>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center p-4 bg-black/20 backdrop-blur-sm">
          <Link 
            to="/classes/mus240/groups/presentation"
            className="text-white/80 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Link>
          <div className="text-white/80 text-sm">
            {currentIndex + 1} / {allUpdates.length}
          </div>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        {/* Slide Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl w-full bg-white rounded-2xl shadow-2xl p-12 min-h-[600px] flex flex-col">
            {/* Slide Header */}
            <div className="mb-8 border-b-4 border-blue-600 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Presentation className="h-8 w-8 text-blue-600" />
                <h1 className="text-4xl font-bold text-slate-900">{update.group_name}</h1>
              </div>
              <p className="text-xl text-slate-600">
                Moderator: {update.group_moderator}
              </p>
            </div>

            {/* Slide Body - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Thesis Statement */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Thesis / Goal</h2>
                <p className="text-lg text-slate-700 leading-relaxed">
                  {update.thesis_statement}
                </p>
              </div>

              {/* Team Members */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Team Members</h2>
                <div className="text-lg text-slate-700 whitespace-pre-line">
                  {update.team_members}
                </div>
              </div>

              {/* Individual Contributions */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Individual Contributions</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {update.individual_contributions}
                </p>
              </div>

              {/* Project Progress */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Progress Summary</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {update.project_progress}
                </p>
              </div>

              {/* Final Product */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Final Product</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {update.final_product_description}
                </p>
                {update.final_product_link && (
                  <a 
                    href={update.final_product_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    View Product <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Challenges */}
              {update.challenges_faced && (
                <div>
                  <h2 className="text-2xl font-bold text-blue-700 mb-3">Challenges</h2>
                  <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                    {update.challenges_faced}
                  </p>
                </div>
              )}

              {/* Completion Plan */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Next Steps</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {update.completion_plan}
                </p>
              </div>

              {/* Source Links */}
              {update.source_links && (
                <div>
                  <h2 className="text-2xl font-bold text-blue-700 mb-3">Sources</h2>
                  <div className="text-sm text-slate-600 whitespace-pre-line">
                    {update.source_links}
                  </div>
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="mt-6 pt-4 border-t text-sm text-slate-500 text-right">
              Submitted by {update.submitter_name} • {new Date(update.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center items-center gap-4 p-6 bg-black/20 backdrop-blur-sm">
          <Button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {allUpdates.map((_, index) => (
              <button
                key={index}
                onClick={() => navigate(`/classes/mus240/groups/presentation/${allUpdates[index].id}`)}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white w-8' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={goToNext}
            disabled={currentIndex === allUpdates.length - 1}
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20 disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>

        {/* Keyboard Hints */}
        <div className="text-center text-white/50 text-xs pb-4">
          Use ← → arrow keys to navigate • ESC to return to list
        </div>
      </div>
    </UniversalLayout>
  );
}
