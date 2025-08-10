import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Bell, Send } from "lucide-react";

export const NotificationSenderPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    category: "general",
    priority: 0,
    sendToSelf: true,
    recipientEmail: "",
    sendEmail: false,
    sendSms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Determine recipient
      let recipientId = user.id;

      if (!formData.sendToSelf && formData.recipientEmail) {
        // Find user by email
        const { data: recipientUser, error: userError } = await supabase
          .from("gw_profiles")
          .select("user_id")
          .eq("email", formData.recipientEmail)
          .maybeSingle();

        if (userError || !recipientUser) {
          toast({
            title: "User not found",
            description: "Could not find a user with that email address.",
            variant: "destructive",
          });
          return;
        }
        recipientId = recipientUser.user_id as string;
      }

      // Create notification using the stored procedure (handles internal + delivery log)
      const { error } = await supabase.rpc("create_notification_with_delivery", {
        p_user_id: recipientId,
        p_title: formData.title,
        p_message: formData.message,
        p_type: formData.type,
        p_category: formData.category,
        p_priority: formData.priority,
        p_send_email: formData.sendEmail,
        p_send_sms: formData.sendSms,
      });

      if (error) throw error;

      // Optional: direct email dispatch via edge function if toggled and email is known
      if (formData.sendEmail) {
        const toEmail = formData.sendToSelf ? user.email : formData.recipientEmail;
        if (toEmail) {
          const { error: emailError } = await supabase.functions.invoke("gw-send-email", {
            body: {
              to: toEmail,
              subject: `GleeWorld Notification: ${formData.title}`,
              html: `
                <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">
                  <h2 style=\"color: #333; margin-bottom: 20px;\">${formData.title}</h2>
                  <p style=\"margin-bottom: 20px; line-height: 1.6;\">${formData.message}</p>
                  <hr style=\"margin: 20px 0; border: none; border-top: 1px solid #eee;\">
                  <p style=\"color: #666; font-size: 12px; text-align: center;\">
                    This notification was sent from GleeWorld.org
                  </p>
                </div>
              `,
              text: `${formData.title}\n\n${formData.message}\n\nThis notification was sent from GleeWorld.org`,
            },
          });
          if (emailError) {
            console.error("Email sending error:", emailError);
            toast({
              title: "Partial success",
              description: "Notification created but email failed to send.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Optional: direct SMS dispatch via edge function if toggled
      if (formData.sendSms) {
        // Find phone number from profile when sending to self
        if (formData.sendToSelf) {
          const { data: myProfile } = await supabase
            .from("gw_profiles")
            .select("phone")
            .eq("user_id", user.id)
            .maybeSingle();
          const phone = (myProfile as any)?.phone as string | undefined;
          if (phone) {
            const cleaned = phone.replace(/\D/g, "");
            const formatted = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
            await supabase.functions.invoke("gw-send-sms", {
              body: { to: formatted, message: formData.message },
            });
          }
        }
        // If sending to someone else by email lookup, we skip SMS unless we add phone lookup UI
      }

      toast({
        title: "Notification sent!",
        description: `Successfully sent notification to ${formData.sendToSelf ? "yourself" : formData.recipientEmail}.`,
      });

      // Reset form
      setFormData({
        title: "",
        message: "",
        type: "info",
        category: "general",
        priority: 0,
        sendToSelf: true,
        recipientEmail: "",
        sendEmail: false,
        sendSms: false,
      });
    } catch (err: any) {
      console.error("Error sending notification:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to send notification.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Send Notification (Email, In-App, SMS)
        </CardTitle>
        <CardDescription>Send a notification to yourself or another user</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="sendToSelf"
                checked={formData.sendToSelf}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, sendToSelf: !!checked }))
                }
              />
              <Label htmlFor="sendToSelf">Send to myself</Label>
            </div>

            {!formData.sendToSelf && (
              <div>
                <Label htmlFor="recipientEmail">Recipient Email</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, recipientEmail: e.target.value }))
                  }
                  placeholder="Enter recipient's email"
                  required={!formData.sendToSelf}
                />
              </div>
            )}
          </div>

          {/* Notification Content */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Notification title"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Notification message"
              rows={4}
              required
            />
          </div>

          {/* Notification Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="rehearsal">Rehearsal</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority (0-5)</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="5"
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))
              }
            />
          </div>

          {/* Delivery Options */}
          <div className="space-y-3">
            <Label>Delivery Options</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="sendEmail"
                checked={formData.sendEmail}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, sendEmail: !!checked }))
                }
              />
              <Label htmlFor="sendEmail">Send email notification</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="sendSms"
                checked={formData.sendSms}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, sendSms: !!checked }))
                }
              />
              <Label htmlFor="sendSms">Send SMS notification</Label>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
