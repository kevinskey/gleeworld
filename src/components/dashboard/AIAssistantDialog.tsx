import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, MessageSquare, Sparkles, User, Inbox } from "lucide-react";

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
    setMessage("");
    
    // Mock response for now
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "AI Assistant is coming soon! I'll help you navigate modules, answer questions, and assist with tasks. This feature will be powered by advanced AI to make your experience seamless."
      }]);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <DialogHeader className="relative px-6 py-5">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  Message Center & AI Assistant
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Powered by AI
                  </Badge>
                </div>
                <DialogDescription className="text-sm">
                  Get help, ask questions, or check your messages
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <Tabs defaultValue="assistant" className="flex-1 flex flex-col h-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50">
              <TabsTrigger value="assistant" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Bot className="h-4 w-4" />
                <span className="font-medium">AI Assistant</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Messages</span>
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  0
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="assistant" className="flex-1 flex flex-col gap-4 mt-4 px-6 pb-6 m-0">
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4 pr-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <Card className="text-center py-16 px-8 max-w-md bg-gradient-to-br from-primary/5 to-transparent border-2 border-dashed">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-20 w-20 bg-primary/10 rounded-full animate-pulse" />
                        </div>
                        <Bot className="h-20 w-20 mx-auto text-primary relative z-10" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">How can I help you today?</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ask me anything about modules, events, tasks, or the Glee Club
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          Show my modules
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          What's happening today?
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          Help with tasks
                        </Badge>
                      </div>
                    </Card>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="p-2 rounded-full bg-primary/10 h-fit">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <Card
                        className={`px-4 py-3 max-w-[75%] ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </Card>
                      {msg.role === "user" && (
                        <div className="p-2 rounded-full bg-primary/10 h-fit">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <Card className="p-4 bg-background/50 backdrop-blur-sm border-2">
              <div className="flex gap-3">
                <Input
                  placeholder="Ask me anything..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 bg-background"
                />
                <Button onClick={handleSend} size="icon" className="h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="flex-1 flex flex-col gap-4 mt-4 px-6 pb-6 m-0">
            <ScrollArea className="flex-1">
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Card className="text-center py-16 px-8 max-w-md bg-gradient-to-br from-muted/50 to-transparent border-2 border-dashed">
                  <Inbox className="h-20 w-20 mx-auto mb-6 text-muted-foreground/50" />
                  <h3 className="text-xl font-semibold mb-3">No messages yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Your internal messages and notifications will appear here
                  </p>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
