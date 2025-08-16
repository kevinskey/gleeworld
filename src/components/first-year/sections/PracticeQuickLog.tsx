import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Music, Clock, Star, Plus, X, Loader2 } from "lucide-react";
import { useFirstYearData } from "@/hooks/useFirstYearData";

export const PracticeQuickLog = () => {
  const { practiceLogs, submitPracticeLog, isSubmittingPracticeLog } = useFirstYearData();
  const [duration, setDuration] = useState("");
  const [pieces, setPieces] = useState<string[]>([]);
  const [newPiece, setNewPiece] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [newFocusArea, setNewFocusArea] = useState("");
  const [notes, setNotes] = useState("");
  const [qualityRating, setQualityRating] = useState(3);

  const today = new Date().toISOString().split('T')[0];
  const todaysLog = practiceLogs?.find(log => log.practice_date === today);

  const addPiece = () => {
    if (newPiece.trim()) {
      setPieces([...pieces, newPiece.trim()]);
      setNewPiece("");
    }
  };

  const removePiece = (index: number) => {
    setPieces(pieces.filter((_, i) => i !== index));
  };

  const addFocusArea = () => {
    if (newFocusArea.trim()) {
      setFocusAreas([...focusAreas, newFocusArea.trim()]);
      setNewFocusArea("");
    }
  };

  const removeFocusArea = (index: number) => {
    setFocusAreas(focusAreas.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!duration) return;

    await submitPracticeLog({
      practice_date: today,
      duration_minutes: parseInt(duration),
      pieces_practiced: pieces,
      focus_areas: focusAreas,
      notes: notes,
      quality_rating: qualityRating,
    });

    // Clear form
    setDuration("");
    setPieces([]);
    setFocusAreas([]);
    setNotes("");
    setQualityRating(3);
  };

  if (todaysLog) {
    return (
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Music className="h-5 w-5" />
            Today's Practice Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">{todaysLog.duration_minutes} minutes</span>
            </div>
            
            {todaysLog.quality_rating && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Quality:</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${
                        i < todaysLog.quality_rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300'
                      }`} 
                    />
                  ))}
                </div>
              </div>
            )}

            {todaysLog.pieces_practiced && todaysLog.pieces_practiced.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Pieces practiced:</span>
                <div className="flex flex-wrap gap-1">
                  {todaysLog.pieces_practiced.map((piece, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {piece}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Quick Practice Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            placeholder="30"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Pieces Practiced</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Song title"
              value={newPiece}
              onChange={(e) => setNewPiece(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPiece()}
            />
            <Button size="sm" variant="outline" onClick={addPiece}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {pieces.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {pieces.map((piece, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {piece}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removePiece(index)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Focus Areas</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Breath control, intonation..."
              value={newFocusArea}
              onChange={(e) => setNewFocusArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addFocusArea()}
            />
            <Button size="sm" variant="outline" onClick={addFocusArea}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {focusAreas.map((area, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {area}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFocusArea(index)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Quality Rating</Label>
          <div className="flex items-center gap-2 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`h-6 w-6 cursor-pointer ${
                  i < qualityRating 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-gray-300'
                }`}
                onClick={() => setQualityRating(i + 1)}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="How did practice go today?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button 
          onClick={handleSubmit}
          className="w-full"
          disabled={!duration || isSubmittingPracticeLog}
        >
          {isSubmittingPracticeLog ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Logging...
            </>
          ) : (
            "Log Practice Session"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};