import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ChevronLeft, ChevronRight, Presentation } from 'lucide-react';
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
  const [currentSlide, setCurrentSlide] = useState(0);

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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % updates.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + updates.length) % updates.length);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [updates.length]);

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

  const currentUpdate = updates[currentSlide];

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center p-4 bg-black/20 backdrop-blur-sm">
          <Link 
            to="/classes/mus240/groups"
            className="text-white/80 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit Presentation
          </Link>
          <div className="text-white/80 text-sm">
            {currentSlide + 1} / {updates.length}
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
                <h1 className="text-4xl font-bold text-slate-900">{currentUpdate.group_name}</h1>
              </div>
              <p className="text-xl text-slate-600">
                Moderator: {currentUpdate.group_moderator}
              </p>
            </div>

            {/* Slide Body - Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Thesis Statement */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Thesis / Goal</h2>
                <p className="text-lg text-slate-700 leading-relaxed">
                  {currentUpdate.thesis_statement}
                </p>
              </div>

              {/* Team Members */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Team Members</h2>
                <div className="text-lg text-slate-700 whitespace-pre-line">
                  {currentUpdate.team_members}
                </div>
              </div>

              {/* Individual Contributions */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Individual Contributions</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {currentUpdate.individual_contributions}
                </p>
              </div>

              {/* Project Progress */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Progress Summary</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {currentUpdate.project_progress}
                </p>
              </div>

              {/* Final Product */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Final Product</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {currentUpdate.final_product_description}
                </p>
                {currentUpdate.final_product_link && (
                  <a 
                    href={currentUpdate.final_product_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-2 inline-block"
                  >
                    View Product →
                  </a>
                )}
              </div>

              {/* Challenges */}
              {currentUpdate.challenges_faced && (
                <div>
                  <h2 className="text-2xl font-bold text-blue-700 mb-3">Challenges</h2>
                  <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                    {currentUpdate.challenges_faced}
                  </p>
                </div>
              )}

              {/* Completion Plan */}
              <div>
                <h2 className="text-2xl font-bold text-blue-700 mb-3">Next Steps</h2>
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
                  {currentUpdate.completion_plan}
                </p>
              </div>

              {/* Source Links */}
              {currentUpdate.source_links && (
                <div>
                  <h2 className="text-2xl font-bold text-blue-700 mb-3">Sources</h2>
                  <div className="text-sm text-slate-600 whitespace-pre-line">
                    {currentUpdate.source_links}
                  </div>
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="mt-6 pt-4 border-t text-sm text-slate-500 text-right">
              Submitted by {currentUpdate.submitter_name} • {new Date(currentUpdate.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center items-center gap-4 p-6 bg-black/20 backdrop-blur-sm">
          <Button
            onClick={prevSlide}
            disabled={updates.length <= 1}
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {updates.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-white w-8' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextSlide}
            disabled={updates.length <= 1}
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            Next
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>

        {/* Keyboard Hints */}
        <div className="text-center text-white/50 text-xs pb-4">
          Use ← → arrow keys to navigate
        </div>
      </div>
    </UniversalLayout>
  );
}
