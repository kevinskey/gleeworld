import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, MessageSquare } from "lucide-react";

interface AIAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AIAssistantDialog = ({ open, onOpenChange }: AIAssistantDialogProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: message }]);
    // TODO: Implement AI call here
    setMessage("");
    
    // Mock response for now
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "AI Assistant is coming soon! This will help you navigate modules, answer questions, and assist with tasks."
      }]);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Message Center & AI Assistant
          </DialogTitle>
          <DialogDescription>
            Get help, ask questions, or check your messages
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="assistant" className="flex-1 flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="flex-1 flex flex-col gap-4 mt-4">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bot className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                    <p className="text-lg font-medium mb-2">How can I help you today?</p>
                    <p className="text-sm">Ask me anything about modules, events, or tasks</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="flex-1 flex flex-col gap-4 mt-4">
            <ScrollArea className="flex-1">
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm">Your internal messages will appear here</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
