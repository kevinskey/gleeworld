import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Star, Save, RotateCcw, Music, Mic, Users, FileText, ExternalLink, ArrowLeft, X, UserCheck, Shield, ChevronDown, ChevronUp, GraduationCap, MapPin, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ScoreCategory {
  id: string;
  name: string;
  maxScore: number;
  currentScore: number;
  icon: React.ReactNode;
}

interface MobileScoreWindowProps {
  performerId?: string;
  performerName?: string;
  eventType?: 'audition' | 'performance' | 'competition';
  onScoreSubmitted?: (score: any) => void;
}

export const MobileScoreWindow = ({ 
  performerId, 
  performerName = "Sarah Johnson", 
  eventType = 'audition',
  onScoreSubmitted 
}: MobileScoreWindowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<ScoreCategory[]>([
    {
      id: 'vocal',
      name: 'Vocal Quality',
      maxScore: 10,
      currentScore: 8,
      icon: <Mic className="h-4 w-4" />
    },
    {
      id: 'pitch',
      name: 'Pitch Accuracy',
      maxScore: 10,
      currentScore: 9,
      icon: <Music className="h-4 w-4" />
    },
    {
      id: 'rhythm',
      name: 'Rhythm & Timing',
      maxScore: 10,
      currentScore: 7,
      icon: <Music className="h-4 w-4" />
    },
    {
      id: 'expression',
      name: 'Musical Expression',
      maxScore: 10,
      currentScore: 8,
      icon: <Star className="h-4 w-4" />
    },
    {
      id: 'stage',
      name: 'Stage Presence',
      maxScore: 10,
      currentScore: 9,
      icon: <Users className="h-4 w-4" />
    }
  ]);

  const [comments, setComments] = useState("Excellent breath control and clear diction. Strong stage presence with confident delivery. Could work on maintaining consistent vibrato in the upper register.");
  const [overallScore, setOverallScore] = useState(85);
  const [isSaving, setIsSaving] = useState(false);
  const [songTitle, setSongTitle] = useState("Amazing Grace");
  const [sheetMusicData, setSheetMusicData] = useState<any>(null);
  const [performerProfile, setPerformerProfile] = useState<any>({
    first_name: "Sarah",
    last_name: "Johnson", 
    avatar_url: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    class_year: 2026,
    voice_part: "Soprano"
  });
  const [isTablet, setIsTablet] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(true);

  // Sample application data
  const applicationData = {
    personal_info: {
      hometown: "Atlanta, Georgia",
      phone: "(404) 555-0123",
      email: "sarah.johnson@spelman.edu",
      major: "Music Education",
      gpa: "3.8"
    },
    experience: {
      previous_choir: "Atlanta Youth Choir (3 years)",
      solo_experience: "Church soloist since age 16",
      instruments: "Piano (intermediate), Guitar (beginner)"
    },
    essays: {
      why_glee: "Music has been my passion since childhood. Joining the Spelman Glee Club represents the perfect opportunity to combine my love for choral music with the sisterhood and excellence that Spelman represents. I want to be part of a legacy that has inspired audiences for over 100 years.",
      goals: "I hope to grow as both a musician and a leader. I want to learn from the talented women in this ensemble while contributing my own voice and energy to continue the tradition of amazing performances.",
      commitment: "I understand the time commitment required and am prepared to prioritize rehearsals, performances, and the high standards expected of Glee Club members."
    }
  };

  // Detect tablet/iPad view
  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Consider it a tablet if width is >= 768px or if it's in landscape mode with reasonable size
      setIsTablet(width >= 768 || (width >= 640 && height <= width));
    };
    
    checkIsTablet();
    window.addEventListener('resize', checkIsTablet);
    return () => window.removeEventListener('resize', checkIsTablet);
  }, []);

  // Fetch performer profile and avatar
  useEffect(() => {
    const fetchPerformerProfile = async () => {
      if (!performerId) return;
      
      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('first_name, last_name, avatar_url, class_year, voice_part')
          .eq('user_id', performerId)
          .single();

        if (data && !error) {
          setPerformerProfile(data);
        }
      } catch (error) {
        console.log('Error fetching performer profile:', error);
        // Keep the placeholder data if fetch fails
      }
    };

    fetchPerformerProfile();
  }, [performerId]);

  // Search for sheet music when song title changes
  useEffect(() => {
    const searchSheetMusic = async () => {
      if (songTitle.trim().length < 2) {
        setSheetMusicData(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('gw_sheet_music')
          .select('id, title, composer, pdf_url')
          .ilike('title', `%${songTitle.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setSheetMusicData(data);
        } else {
          setSheetMusicData(null);
        }
      } catch (error) {
        console.log('No sheet music found for:', songTitle);
        setSheetMusicData(null);
      }
    };

    const timeoutId = setTimeout(searchSheetMusic, 500);
    return () => clearTimeout(timeoutId);
  }, [songTitle]);

  const handleSheetMusicClick = () => {
    if (sheetMusicData?.pdf_url) {
      window.open(sheetMusicData.pdf_url, '_blank');
    }
  };

  const updateCategoryScore = (categoryId: string, score: number) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { 
              ...cat, 
              currentScore: Math.max(0, Math.min(score, cat.maxScore)) // Ensure score is between 0 and maxScore
            }
          : cat
      )
    );
  };

  const calculateTotalScore = () => {
    const totalPossible = categories.reduce((sum, cat) => sum + cat.maxScore, 0);
    const totalEarned = categories.reduce((sum, cat) => sum + cat.currentScore, 0);
    
    // Ensure we don't divide by zero and handle edge cases
    const percentage = totalPossible > 0 ? (totalEarned / totalPossible * 100) : 0;
    
    return { 
      totalEarned, 
      totalPossible, 
      percentage: percentage.toFixed(1) 
    };
  };

  const resetScores = () => {
    setCategories(prev => prev.map(cat => ({ ...cat, currentScore: 0 })));
    setComments("");
    setOverallScore(0);
    setSongTitle("Amazing Grace");
    // Keep the sample performer profile data
  };

  const saveScore = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save scores.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { totalEarned, totalPossible, percentage } = calculateTotalScore();
      
      const scoreData = {
        performer_id: performerId,
        performer_name: performerName,
        evaluator_id: user.id,
        event_type: eventType,
        song_title: songTitle.trim() || null,
        sheet_music_id: sheetMusicData?.id || null,
        categories: JSON.stringify(categories.reduce((acc, cat) => ({
          ...acc,
          [cat.id]: cat.currentScore
        }), {})),
        total_score: totalEarned,
        max_score: totalPossible,
        percentage: parseFloat(percentage),
        overall_score: overallScore,
        comments: comments
      };

      console.log('Saving score data:', scoreData);

      // Save to the dedicated performance scores table
      const scoreRecord = {
        performer_id: performerId,
        performer_name: performerName,
        evaluator_id: user.id,
        event_type: eventType,
        song_title: songTitle.trim() || null,
        sheet_music_id: sheetMusicData?.id || null,
        category_scores: categories.reduce((acc, cat) => ({
          ...acc,
          [cat.id]: {
            name: cat.name,
            score: cat.currentScore,
            maxScore: cat.maxScore,
            percentage: ((cat.currentScore / cat.maxScore) * 100).toFixed(1)
          }
        }), {}),
        total_score: totalEarned,
        max_score: totalPossible,
        percentage: parseFloat(percentage),
        overall_score: overallScore,
        comments: comments.trim() || null
      };

      console.log('Saving score to gw_performance_scores:', scoreRecord);

      const { data, error } = await supabase
        .from('gw_performance_scores')
        .insert(scoreRecord)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Score saved successfully:', data);

      toast({
        title: "Score Saved!",
        description: `${performerName}'s ${eventType} score (${percentage}%) has been saved successfully.`
      });

      onScoreSubmitted?.(scoreData);
      resetScores();
      
    } catch (error) {
      console.error('Error saving score:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save the score. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const { totalEarned, totalPossible, percentage } = calculateTotalScore();

  return (
    <div className={`min-h-screen bg-background p-4 pb-safe ${isTablet ? 'max-w-4xl mx-auto' : ''}`}>
      
      {/* Back Button Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onScoreSubmitted?.(null)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scoring
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onScoreSubmitted?.(null)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Adjudicator Info */}
      <Card className="mb-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">ADJUDICATOR</span>
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="font-semibold text-lg">
                {user?.user_metadata?.full_name || user?.email || "Evaluator"}
              </p>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">
              {eventType.charAt(0).toUpperCase() + eventType.slice(1)} Judge
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className={`space-y-4 ${isTablet ? 'grid grid-cols-2 gap-6' : ''}`}>
        
        {/* Left Column - Audition Card (iPad) / Full Width (Phone) */}
        <div className={`space-y-4 ${isTablet ? 'col-span-1' : ''}`}>
          {/* Audition Card Header */}
          <Card className={`${eventType === 'audition' && isTablet ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-center ${isTablet ? 'text-xl' : 'text-lg'}`}>
                {eventType.charAt(0).toUpperCase() + eventType.slice(1)} {eventType === 'audition' ? 'Evaluation' : 'Scoring'}
              </CardTitle>
              
              {/* Performer Info with Picture */}
              <div className={`${isTablet ? 'space-y-4' : 'text-center'}`}>
                {isTablet && eventType === 'audition' ? (
                  // iPad Audition Card Layout
                  <div className="flex flex-col items-center space-y-4 p-4">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage 
                        src={performerProfile?.avatar_url} 
                        alt={performerName} 
                      />
                       <AvatarFallback className="text-xl font-semibold bg-primary/10">
                         {performerProfile?.first_name && performerProfile?.last_name 
                           ? `${performerProfile.first_name[0]}${performerProfile.last_name[0]}`.toUpperCase()
                           : performerName.split(' ').map(n => n[0]).join('').toUpperCase()
                         }
                       </AvatarFallback>
                     </Avatar>
                     
                     <div className="text-center space-y-2">
                       <h3 className="font-bold text-2xl">
                         {performerProfile?.first_name && performerProfile?.last_name 
                           ? `${performerProfile.first_name} ${performerProfile.last_name}`
                           : performerName
                         }
                       </h3>
                      {performerProfile && (
                        <div className="space-y-1">
                          {performerProfile.class_year && (
                            <Badge variant="outline" className="text-sm">
                              Class of {performerProfile.class_year}
                            </Badge>
                          )}
                          {performerProfile.voice_part && (
                            <Badge variant="secondary" className="text-sm ml-2">
                              {performerProfile.voice_part}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Badge variant="default" className="text-lg px-4 py-2">
                      {totalEarned}/{totalPossible} ({percentage}%)
                    </Badge>
                  </div>
                ) : (
                  // Phone Layout or Non-Audition
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={performerProfile?.avatar_url} 
                          alt={performerName} 
                        />
                         <AvatarFallback className="font-semibold bg-primary/10">
                           {performerProfile?.first_name && performerProfile?.last_name 
                             ? `${performerProfile.first_name[0]}${performerProfile.last_name[0]}`.toUpperCase()
                             : performerName.split(' ').map(n => n[0]).join('').toUpperCase()
                           }
                         </AvatarFallback>
                       </Avatar>
                       <div>
                         <h3 className="font-semibold text-xl">
                           {performerProfile?.first_name && performerProfile?.last_name 
                             ? `${performerProfile.first_name} ${performerProfile.last_name}`
                             : performerName
                           }
                         </h3>
                        {performerProfile?.voice_part && (
                          <Badge variant="secondary" className="text-xs">
                            {performerProfile.voice_part}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="mt-1">
                      {totalEarned}/{totalPossible} ({percentage}%)
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Right Column - Scoring Interface (iPad) / Continue Below (Phone) */}
        <div className={`space-y-4 ${isTablet ? 'col-span-1' : ''}`}>

          {/* Application Section */}
          <Collapsible open={applicationOpen} onOpenChange={setApplicationOpen}>
            <Card className="bg-gradient-to-r from-secondary/5 to-primary/5 border-secondary/20">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 hover:bg-secondary/5 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Application Details
                    </CardTitle>
                    {applicationOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 bg-background/50 backdrop-blur-sm border-t border-secondary/20">
                  <div className="grid grid-cols-10 gap-4">
                    {/* Left Column - Image (40%) */}
                    <div className="col-span-4 flex flex-col items-center space-y-3">
                      <Avatar className="h-24 w-24 border-3 border-secondary/30">
                        <AvatarImage 
                          src={performerProfile?.avatar_url} 
                          alt={`${performerProfile?.first_name} ${performerProfile?.last_name}`} 
                        />
                        <AvatarFallback className="text-lg font-semibold bg-secondary/10">
                          {performerProfile?.first_name && performerProfile?.last_name 
                            ? `${performerProfile.first_name[0]}${performerProfile.last_name[0]}`.toUpperCase()
                            : "SJ"
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center space-y-1">
                        <h4 className="font-semibold">
                          {performerProfile?.first_name} {performerProfile?.last_name}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          Class of {performerProfile?.class_year}
                        </Badge>
                      </div>
                    </div>

                    {/* Right Column - Application Data (60%) */}
                    <div className="col-span-6 space-y-4">
                      {/* Personal Info */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm text-primary">Personal Information</h5>
                        <div className="grid grid-cols-1 gap-1 text-xs">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{applicationData.personal_info.hometown}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{applicationData.personal_info.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-3 w-3 text-muted-foreground" />
                            <span>{applicationData.personal_info.major} • GPA: {applicationData.personal_info.gpa}</span>
                          </div>
                        </div>
                      </div>

                      {/* Experience */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm text-primary">Musical Experience</h5>
                        <div className="space-y-1 text-xs">
                          <p><span className="font-medium">Previous Choir:</span> {applicationData.experience.previous_choir}</p>
                          <p><span className="font-medium">Solo Experience:</span> {applicationData.experience.solo_experience}</p>
                          <p><span className="font-medium">Instruments:</span> {applicationData.experience.instruments}</p>
                        </div>
                      </div>

                      {/* Essay Excerpts */}
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm text-primary">Essay Responses</h5>
                        <div className="space-y-2">
                          <div className="p-2 bg-muted/30 rounded text-xs">
                            <p className="font-medium mb-1">Why Glee Club?</p>
                            <p className="line-clamp-2">{applicationData.essays.why_glee}</p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded text-xs">
                            <p className="font-medium mb-1">Goals & Commitment</p>
                            <p className="line-clamp-2">{applicationData.essays.goals}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Song Title Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Song Selection</CardTitle>
            </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="songTitle">Song Title</Label>
              <Input
                id="songTitle"
                placeholder="Enter the song being performed..."
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {sheetMusicData && (
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{sheetMusicData.title}</span>
                      {sheetMusicData.pdf_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={handleSheetMusicClick}
                          title="Open PDF"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {sheetMusicData.composer && (
                      <p className="text-xs text-muted-foreground">
                        by {sheetMusicData.composer}
                      </p>
                    )}
                  </div>
                </div>
                {sheetMusicData.pdf_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleSheetMusicClick}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Sheet Music PDF
                  </Button>
                )}
              </div>
            )}
            
            {songTitle.trim().length > 2 && !sheetMusicData && (
              <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Music className="h-4 w-4" />
                  <span>No sheet music found for "{songTitle}"</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Scoring Categories */}
          <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
            <Card>
              <div className="flex items-center">
                <CollapsibleTrigger className="flex-1">
                  <CardHeader className="pb-3 hover:bg-muted/30 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Score Categories
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {totalEarned}/{totalPossible} ({percentage}%)
                        </Badge>
                        {categoriesOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent>
                <CardContent className="space-y-4 bg-background/80 backdrop-blur-sm border-t border-muted/20">
            {categories.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    /{category.maxScore}
                  </span>
                </div>
                
                {/* Score buttons */}
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: category.maxScore + 1 }, (_, i) => i).map(score => (
                    <Button
                      key={score}
                      variant={category.currentScore === score ? "default" : "outline"}
                      size="sm"
                      className="h-10 text-xs"
                      onClick={() => updateCategoryScore(category.id, score)}
                    >
                      {score}
                    </Button>
                  ))}
                </div>
                
                {/* Star rating visual */}
                <div className="flex justify-center gap-1">
                  {Array.from({ length: category.maxScore }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < category.currentScore 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

        {/* Overall Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall Impression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="overall">Overall Score (0-100)</Label>
              <Input
                id="overall"
                type="number"
                min="0"
                max="100"
                value={overallScore}
                onChange={(e) => setOverallScore(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comments & Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add your comments, feedback, or notes here..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={resetScores}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            className="flex-1"
            onClick={saveScore}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Score'}
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-primary">
                {percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                Total Score: {totalEarned}/{totalPossible}
              </div>
              {overallScore > 0 && (
                <div className="text-sm">
                  Overall: {overallScore}/100
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};