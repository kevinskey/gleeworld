import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Sparkles, Send } from "lucide-react";

interface BudgetAIHelperProps {
  open: boolean;
  onClose: () => void;
  eventData: any;
  context: string;
}

export const BudgetAIHelper = ({ open, onClose, eventData, context }: BudgetAIHelperProps) => {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    setLoading(true);
    
    // Simulate AI response for now
    setTimeout(() => {
      setResponse(`Based on your ${eventData?.event_type || 'event'} budget, here are some suggestions:

1. **Food & Hospitality**: For ${eventData?.attendees || 10} attendees, consider budgeting $15-25 per person for meals.

2. **Venue Costs**: Check if your location includes tables, chairs, and AV equipment to avoid double-booking.

3. **Contingency**: Your current contingency of ${eventData?.contingency || 0}% is ${eventData?.contingency < 10 ? 'low' : 'appropriate'} for this type of event.

4. **Missing Items**: Consider adding:
   - Registration materials
   - Signage and banners
   - Cleanup supplies
   - Emergency fund

Would you like more specific advice on any category?`);
      setLoading(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Budget Assistant
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Ask about your budget:</label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What's a reasonable food budget for 50 people? Am I missing any important expense categories?"
              rows={3}
            />
          </div>

          <Button onClick={handleAskAI} disabled={loading || !question.trim()}>
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Ask AI Helper
              </>
            )}
          </Button>

          {response && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">AI Suggestion:</h4>
              <div className="text-sm whitespace-pre-line">{response}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};