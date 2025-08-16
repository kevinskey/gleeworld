import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Users } from "lucide-react";
import { useFirstYearData } from "@/hooks/useFirstYearData";
import { formatDistanceToNow } from "date-fns";

// Mock chat data - in a real app, this would come from Supabase realtime
const mockMessages = [
  {
    id: 1,
    sender: "Sarah M.",
    message: "Good luck with voice lessons this week everyone! 🎵",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    initials: "SM"
  },
  {
    id: 2,
    sender: "Alex R.",
    message: "Thanks! Quick question - does anyone have extra copies of the Brahms piece?",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    initials: "AR"
  },
  {
    id: 3,
    sender: "Maya P.",
    message: "I do! I'll bring them to rehearsal tomorrow.",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    initials: "MP"
  },
  {
    id: 4,
    sender: "Jordan L.",
    message: "Has anyone figured out that tricky rhythm in measure 42? 😅",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    initials: "JL"
  }
];

export const CohortChat = () => {
  const { studentRecord } = useFirstYearData();
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In a real app, this would send to Supabase realtime
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Cohort Chat
          <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>12 online</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {mockMessages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {msg.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{msg.sender}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground break-words">
                  {msg.message}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 This is a space for your {studentRecord?.cohort?.name || 'cohort'} to connect and support each other!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};