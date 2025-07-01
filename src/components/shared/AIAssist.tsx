
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bot, Send, Loader2 } from "lucide-react";

interface AIAssistProps {
  context?: string;
  placeholder?: string;
  className?: string;
}

export const AIAssist = ({ 
  context = "general", 
  placeholder = "Ask AI for help...",
  className = ""
}: AIAssistProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Simulate AI response - in a real app, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResponse(`Here's a helpful suggestion for "${query}" in the context of ${context}. This is a placeholder response that would come from an AI service.`);
    } catch (error) {
      setResponse("Sorry, I couldn't process that request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Bot className="h-4 w-4" />
          Ask AI
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
            
            {response && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-700">{response}</p>
              </div>
            )}
            
            {!response && !loading && (
              <p className="text-xs text-gray-500">
                Ask me anything about {context} and I'll try to help!
              </p>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
