import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TreePine, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";

export const TreeLightingSurvey = () => {
  const { user } = useAuth();
  const [attended, setAttended] = useState<string | null>(null);
  const [enjoyedMost, setEnjoyedMost] = useState("");
  const [songOrder, setSongOrder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const deadline = new Date("2025-12-12T23:59:59");
  const isExpired = new Date() > deadline;

  useEffect(() => {
    const checkExistingResponse = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("tree_lighting_survey_responses")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking survey response:", error);
        setIsLoading(false);
        return;
      }

      if (data) {
        setHasSubmitted(true);
        setAttended(data.attended ? "yes" : "no");
        setEnjoyedMost(data.enjoyed_most || "");
        setSongOrder(data.song_order || "");
      }
      setIsLoading(false);
    };

    checkExistingResponse();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || attended === null) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("tree_lighting_survey_responses")
        .upsert({
          user_id: user.id,
          attended: attended === "yes",
          enjoyed_most: attended === "yes" ? enjoyedMost : null,
          song_order: songOrder,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Survey submitted successfully!");
      setHasSubmitted(true);
    } catch (error: any) {
      toast.error("Failed to submit survey: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-green-600/30 bg-card">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading survey...</p>
        </CardContent>
      </Card>
    );
  }

  // Always show the form - allow members to update their responses

  if (isExpired) {
    return (
      <Card className="border-2 border-muted bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg text-muted-foreground">Tree Lighting Participation Survey</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground">This survey has expired.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 border-green-600/30 bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasSubmitted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <TreePine className="h-5 w-5 text-green-600" />
                )}
                <CardTitle className="text-lg text-card-foreground">Tree Lighting Participation Survey</CardTitle>
                {hasSubmitted && (
                  <span className="text-xs bg-green-600/20 text-green-600 px-2 py-0.5 rounded-full">Completed</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="h-3 w-3" />
                  <span>Due: 12/12/25</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
            <CardDescription className="text-muted-foreground">
              {hasSubmitted 
                ? "You've already submitted. Click to update your response." 
                : "Click to complete this survey about the Tree Lighting event on 12/8/25"}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-card-foreground">Did you attend the Tree Lighting on 12/8/25?</Label>
              <RadioGroup value={attended || ""} onValueChange={setAttended}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="attended-yes" />
                  <Label htmlFor="attended-yes" className="cursor-pointer text-card-foreground">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="attended-no" />
                  <Label htmlFor="attended-no" className="cursor-pointer text-card-foreground">No</Label>
                </div>
              </RadioGroup>
            </div>

            {attended === "yes" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="enjoyed-most" className="text-sm font-medium text-card-foreground">
                    What did you enjoy most during the visit?
                  </Label>
                  <Textarea
                    id="enjoyed-most"
                    value={enjoyedMost}
                    onChange={(e) => setEnjoyedMost(e.target.value)}
                    placeholder="Share what you enjoyed most..."
                    className="min-h-[80px] text-card-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="song-order" className="text-sm font-medium text-card-foreground">
                    Please list the song order (as performed):
                  </Label>
                  <Textarea
                    id="song-order"
                    value={songOrder}
                    onChange={(e) => setSongOrder(e.target.value)}
                    placeholder="1. Song name&#10;2. Song name&#10;3. Song name&#10;..."
                    className="min-h-[100px] text-card-foreground"
                  />
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Saving..." : hasSubmitted ? "Update Response" : "Submit Survey"}
                </Button>
              </>
            )}

            {attended === "no" && (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">Thank you for letting us know!</p>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Saving..." : hasSubmitted ? "Update Response" : "Submit"}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
