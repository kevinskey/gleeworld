import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ChevronLeft, ChevronRight, Presentation, ExternalLink, Users, Target, TrendingUp, Package, AlertCircle, CheckSquare, Link2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';
import { SlideApprovalPanel } from '@/components/mus240/peer-review/SlideApprovalPanel';

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

interface Slide {
  title: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  bgGradient: string;
}

// Helper function to generate slides from update data
function getSlides(update: GroupUpdate): Slide[] {
  const slides: Slide[] = [
    // Title Slide
    {
      title: 'Title',
      bgGradient: 'from-blue-600 via-indigo-600 to-purple-700',
      icon: <Presentation className="h-20 w-20" />,
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white px-12">
          <div className="mb-8 opacity-90">
            <Presentation className="h-24 w-24 mx-auto mb-6" />
          </div>
          <h1 className="text-6xl font-bold mb-8 text-center leading-tight">
            {update.group_name}
          </h1>
          <div className="h-1 w-32 bg-white/50 mb-8"></div>
          <div className="mb-6">
            <p className="text-2xl mb-2 font-semibold">Moderator</p>
            <p className="text-xl opacity-90">{update.group_moderator}</p>
          </div>
          <div className="mt-4">
            <p className="text-2xl mb-3 font-semibold">Team Members</p>
            <div className="text-lg leading-relaxed opacity-90 space-y-1">
              {update.team_members.split('\n').map((member, i) => (
                <div key={i} className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white/70"></div>
                  <span>{member}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-base opacity-60 mt-8">MUS240 Final Project Presentation</p>
        </div>
      ),
    },
    // Thesis Slide
    {
      title: 'Thesis / Goal',
      bgGradient: 'from-emerald-500 via-teal-600 to-cyan-700',
      icon: <Target className="h-12 w-12" />,
      content: (
        <div className="flex flex-col h-full text-white px-16 py-12">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
            <Target className="h-12 w-12" />
            <h2 className="text-5xl font-bold">Thesis / Goal</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-start min-h-full">
              <p className="text-3xl leading-relaxed font-light break-words">
                {update.thesis_statement}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    // Team Members Slide
    {
      title: 'Team Members',
      bgGradient: 'from-orange-500 via-red-500 to-pink-600',
      icon: <Users className="h-12 w-12" />,
      content: (
        <div className="flex flex-col h-full text-white px-16 py-12">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
            <Users className="h-12 w-12" />
            <h2 className="text-5xl font-bold">Team Members</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="text-2xl leading-loose font-light w-full">
              {update.team_members.split('\n').map((member, i) => (
                <div key={i} className="flex items-center gap-3 mb-4">
                  <div className="h-3 w-3 rounded-full bg-white/70 flex-shrink-0"></div>
                  <span className="break-words">{member}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    // Individual Contributions Slide
    {
      title: 'Individual Contributions',
      bgGradient: 'from-violet-600 via-purple-600 to-fuchsia-700',
      icon: <CheckSquare className="h-12 w-12" />,
      content: (
        <div className="flex flex-col h-full text-white px-16 py-12">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
            <CheckSquare className="h-12 w-12" />
            <h2 className="text-5xl font-bold">Individual Contributions</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-4">
            <p className="text-2xl leading-relaxed font-light whitespace-pre-line break-words">
              {update.individual_contributions}
            </p>
          </div>
        </div>
      ),
    },
    // Progress Summary Slide
    {
      title: 'Progress Summary',
      bgGradient: 'from-sky-500 via-blue-600 to-indigo-700',
      icon: <TrendingUp className="h-12 w-12" />,
      content: (
        <div className="flex flex-col h-full text-white px-16 py-12">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
            <TrendingUp className="h-12 w-12" />
            <h2 className="text-5xl font-bold">Progress Summary</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-4">
            <p className="text-2xl leading-relaxed font-light whitespace-pre-line break-words">
              {update.project_progress}
            </p>
          </div>
        </div>
      ),
    },
    // Final Product Slide
    {
      title: 'Final Product',
      bgGradient: 'from-amber-500 via-orange-600 to-red-600',
      icon: <Package className="h-12 w-12" />,
      content: (
        <div className="flex flex-col h-full text-white px-16 py-12">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
            <Package className="h-12 w-12" />
            <h2 className="text-5xl font-bold">Final Product</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-4">
            <div className="w-full">
              <p className="text-2xl leading-relaxed font-light whitespace-pre-line mb-6 break-words">
                {update.final_product_description}
              </p>
              {update.final_product_link && (
                <a 
                  href={update.final_product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xl bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg transition-all break-all"
                >
                  <ExternalLink className="h-5 w-5 flex-shrink-0" />
                  <span className="break-all">View Product</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Add Challenges slide if content exists
  if (update.challenges_faced) {
    slides.push({
      title: 'Challenges',
      bgGradient: 'from-rose-500 via-red-600 to-pink-700',
      icon: <AlertCircle className="h-12 w-12" />,
      content: (
        <div className="flex flex-col h-full text-white px-16 py-12">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
            <AlertCircle className="h-12 w-12" />
            <h2 className="text-5xl font-bold">Challenges</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-4">
            <p className="text-2xl leading-relaxed font-light whitespace-pre-line break-words">
              {update.challenges_faced}
            </p>
          </div>
        </div>
      ),
    });
  }

  // Next Steps slide
  slides.push({
    title: 'Next Steps',
    bgGradient: 'from-green-500 via-emerald-600 to-teal-700',
    icon: <CheckSquare className="h-12 w-12" />,
    content: (
      <div className="flex flex-col h-full text-white px-16 py-12">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
          <CheckSquare className="h-12 w-12" />
          <h2 className="text-5xl font-bold">Next Steps</h2>
        </div>
        <div className="flex-1 overflow-y-auto pr-4">
          <p className="text-2xl leading-relaxed font-light whitespace-pre-line break-words">
            {update.completion_plan}
          </p>
        </div>
      </div>
    ),
  });

  // Add Sources slide if content exists
  if (update.source_links) {
    slides.push({
      title: 'Sources',
      bgGradient: 'from-slate-600 via-gray-700 to-zinc-800',
      icon: <Link2 className="h-12 w-12" />,
      content: (
        <div className="flex flex-col h-full text-white px-16 py-12">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-white/30">
            <Link2 className="h-12 w-12" />
            <h2 className="text-5xl font-bold">Sources</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-4">
            <p className="text-xl leading-relaxed font-light whitespace-pre-line break-all">
              {update.source_links}
            </p>
          </div>
        </div>
      ),
    });
  }

  return slides;
}

export default function GroupPresentationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [update, setUpdate] = useState<GroupUpdate | null>(null);
  const [allUpdates, setAllUpdates] = useState<GroupUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [presentationIndex, setPresentationIndex] = useState(0);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: allData, error: allError } = await supabase
        .from('group_updates_mus240')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllUpdates(allData || []);

      const { data: updateData, error: updateError } = await supabase
        .from('group_updates_mus240')
        .select('*')
        .eq('id', id)
        .single();

      if (updateError) throw updateError;
      setUpdate(updateData);

      const index = (allData || []).findIndex(u => u.id === id);
      setPresentationIndex(index);
    } catch (error) {
      console.error('Error fetching update:', error);
      toast.error('Failed to load presentation');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousPresentation = () => {
    if (presentationIndex > 0) {
      navigate(`/classes/mus240/groups/presentation/${allUpdates[presentationIndex - 1].id}`);
      setCurrentSlideIndex(0);
    }
  };

  const goToNextPresentation = () => {
    if (presentationIndex < allUpdates.length - 1) {
      navigate(`/classes/mus240/groups/presentation/${allUpdates[presentationIndex + 1].id}`);
      setCurrentSlideIndex(0);
    }
  };

  const nextSlide = () => {
    if (update) {
      const slides = getSlides(update);
      if (currentSlideIndex < slides.length - 1) {
        setCurrentSlideIndex(currentSlideIndex + 1);
      }
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleKeyPress = React.useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      if (update) {
        const slides = getSlides(update);
        if (currentSlideIndex < slides.length - 1) {
          setCurrentSlideIndex(prev => prev + 1);
        }
      }
    }
    if (e.key === 'ArrowLeft') {
      if (currentSlideIndex > 0) {
        setCurrentSlideIndex(prev => prev - 1);
      }
    }
    if (e.key === 'Escape') {
      navigate('/classes/mus240/groups/presentation');
    }
  }, [currentSlideIndex, update, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Early return for loading/error states
  if (loading || !update) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <LoadingSpinner />
        </div>
      </UniversalLayout>
    );
  }

  const slides = getSlides(update);
  const currentSlide = slides[currentSlideIndex];

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center px-6 py-3 bg-black/40 backdrop-blur-sm">
          <Link 
            to="/classes/mus240/groups/presentation"
            className="text-white/80 hover:text-white flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Link>
          <div className="text-white/80 text-sm">
            Slide {currentSlideIndex + 1} / {slides.length} • Presentation {presentationIndex + 1} / {allUpdates.length}
          </div>
          <div className="w-24" />
        </div>

        {/* Slide Content */}
        <div className="flex-1 relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${currentSlide.bgGradient}`}>
            {currentSlide.content}
          </div>

          {/* Slide Approval Panel - Top Right */}
          <div className="absolute top-4 right-4 max-w-sm">
            <SlideApprovalPanel
              presentationId={update.id}
              slideIndex={currentSlideIndex}
              slideTitle={currentSlide.title}
            />
          </div>

          {/* Slide Footer */}
          <div className="absolute bottom-0 left-0 right-0 px-8 py-4 bg-black/20 backdrop-blur-sm">
            <div className="flex justify-between items-center text-white/70 text-sm">
              <span>{update.group_name}</span>
              <span>Submitted by {update.submitter_name} • {new Date(update.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Controls */}
        <div className="bg-black/40 backdrop-blur-sm px-6 py-4">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <Button
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous Slide
            </Button>
            
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlideIndex 
                      ? 'bg-white w-8' 
                      : 'bg-white/40 hover:bg-white/60 w-2'
                  }`}
                  title={slides[index].title}
                />
              ))}
            </div>

            <Button
              onClick={nextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 disabled:opacity-30"
            >
              Next Slide
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>

          {/* Presentation Navigation */}
          {allUpdates.length > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t border-white/10">
              <Button
                onClick={goToPreviousPresentation}
                disabled={presentationIndex === 0}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous Group
              </Button>
              
              <span className="text-white/50 text-xs">
                Switch Presentations
              </span>

              <Button
                onClick={goToNextPresentation}
                disabled={presentationIndex === allUpdates.length - 1}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white disabled:opacity-30"
              >
                Next Group
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Keyboard Hints */}
          <div className="text-center text-white/40 text-xs mt-3">
            Use ← → arrow keys to navigate slides • ESC to return to list
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
}
