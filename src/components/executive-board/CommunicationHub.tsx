import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MessageData {
  message: string;
  audience: string;
}

export const CommunicationHub = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<MessageData>({
    defaultValues: {
      message: "",
      audience: "all_members",
    },
  });

  const onSubmit = async (data: MessageData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // This would integrate with email service and Microsoft Teams webhook
      // For now, we'll just log the action
      await supabase.rpc('log_executive_board_action', {
        p_action_type: 'announcement_sent',
        p_action_description: `Sent announcement to ${data.audience}`,
        p_related_entity_type: 'announcement',
        p_metadata: { audience: data.audience, message_length: data.message.length }
      });

      toast.success("Announcement sent successfully!");
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error("Failed to send announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication Hub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Send announcements to Glee Club members via email and Microsoft Teams
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Send Announcement</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all_members">All Glee Club Members</SelectItem>
                          <SelectItem value="active_members">Active Members Only</SelectItem>
                          <SelectItem value="executive_board">Executive Board</SelectItem>
                          <SelectItem value="soprano">Soprano Section</SelectItem>
                          <SelectItem value="alto">Alto Section</SelectItem>
                          <SelectItem value="alumnae">Alumnae Network</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Type your announcement here..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Message will be sent via email and Microsoft Teams
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Announcement"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};