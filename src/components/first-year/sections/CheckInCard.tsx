import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, Heart, Loader2 } from "lucide-react";
import { useFirstYearData } from "@/hooks/useFirstYearData";

export const CheckInCard = () => {
  const { studentRecord, checkins, submitCheckIn, isSubmittingCheckIn } = useFirstYearData();
  const [academicProgress, setAcademicProgress] = useState("");
  const [vocalProgress, setVocalProgress] = useState("");
  const [challenges, setChallenges] = useState("");
  const [goals, setGoals] = useState("");
  const [moodRating, setMoodRating] = useState([3]);

  const currentWeek = studentRecord ? 
    Math.ceil((Date.now() - new Date(studentRecord.cohort.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)) : 1;
  
  const hasCheckedInThisWeek = checkins && checkins.length > 0;

  const handleSubmit = async () => {
    if (!studentRecord) return;

    await submitCheckIn({
      week_number: currentWeek,
      academic_progress: academicProgress,
      vocal_progress: vocalProgress,
      challenges: challenges,
      goals: goals,
      mood_rating: moodRating[0],
    });

    // Clear form
    setAcademicProgress("");
    setVocalProgress("");
    setChallenges("");
    setGoals("");
    setMoodRating([3]);
  };

  if (hasCheckedInThisWeek) {
    return (
      <Card className="bg-green-50/50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Weekly Check-In Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600">
            You've completed your check-in for week {currentWeek}. Great job staying on track!
          </p>
          <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
            <h4 className="font-semibold mb-2">Your Mood This Week</h4>
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`h-6 w-6 ${
                    i < (checkins[0]?.mood_rating || 3) 
                      ? 'fill-pink-500 text-pink-500' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2">
                {checkins[0]?.mood_rating || 3}/5
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Weekly Check-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="academic">Academic Progress</Label>
          <Textarea
            id="academic"
            placeholder="How are your classes going this week?"
            value={academicProgress}
            onChange={(e) => setAcademicProgress(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="vocal">Vocal Development</Label>
          <Textarea
            id="vocal"
            placeholder="Any vocal breakthroughs or challenges?"
            value={vocalProgress}
            onChange={(e) => setVocalProgress(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="challenges">Challenges</Label>
          <Textarea
            id="challenges"
            placeholder="What challenges are you facing?"
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="goals">Goals for Next Week</Label>
          <Textarea
            id="goals"
            placeholder="What do you want to focus on next week?"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Mood Rating</Label>
          <div className="mt-2 space-y-2">
            <Slider
              value={moodRating}
              onValueChange={setMoodRating}
              max={5}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`h-6 w-6 ${
                    i < moodRating[0] 
                      ? 'fill-pink-500 text-pink-500' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2">
                {moodRating[0]}/5
              </span>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          className="w-full"
          disabled={isSubmittingCheckIn}
        >
          {isSubmittingCheckIn ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Check-In"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};