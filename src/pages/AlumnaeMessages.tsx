import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { MessageCircle, Send, Users, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AlumnaeMessage {
  id: string;
  content: string;
  visible_to: string;
  is_approved: boolean;
  recipient_type: string;
  target_graduation_year?: number;
  created_at: string;
  sender_id: string;
}

interface UserMessage extends AlumnaeMessage {
  is_own_message: boolean;
}

export default function AlumnaeMessages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [targetYear, setTargetYear] = useState("");
  const [visibleTo, setVisibleTo] = useState("current_members");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isVerifiedAlumna, setIsVerifiedAlumna] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAlumnaStatusAndFetchMessages();
  }, [user, navigate]);

  const checkAlumnaStatusAndFetchMessages = async () => {
    if (!user) return;

    try {
      // Check if user is verified alumna
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('role, verified')
        .eq('user_id', user.id)
        .single();

      const verified = profileData?.role === 'alumna' && profileData?.verified === true;
      setIsVerifiedAlumna(verified);

      if (verified) {
        // Fetch approved messages and user's own messages
        const { data: messagesData } = await supabase
          .from('alumnae_messages')
          .select('*')
          .or(`is_approved.eq.true,sender_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        const messagesWithOwnership = messagesData?.map(msg => ({
          ...msg,
          is_own_message: msg.sender_id === user.id
        })) || [];

        setMessages(messagesWithOwnership);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMessage = async () => {
    if (!user || !newMessage.trim() || !isVerifiedAlumna) return;

    setSubmitting(true);
    try {
      const messageData: any = {
        sender_id: user.id,
        content: newMessage.trim(),
        visible_to: visibleTo,
        recipient_type: recipientType,
        is_approved: false
      };

      if (recipientType === 'specific_class' && targetYear) {
        messageData.target_graduation_year = parseInt(targetYear);
      }

      const { error } = await supabase
        .from('alumnae_messages')
        .insert(messageData);

      if (error) throw error;

      toast.success('Your message has been submitted for review!');
      setNewMessage("");
      setRecipientType("all");
      setTargetYear("");
      setVisibleTo("current_members");
      
      // Refresh messages
      checkAlumnaStatusAndFetchMessages();
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error('Failed to submit message');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </UniversalLayout>
    );
  }

  if (!isVerifiedAlumna) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
              <p className="text-muted-foreground mb-6">
                Messaging features are exclusively for verified Spelman College Glee Club alumnae.
                Please contact an administrator to verify your alumni status.
              </p>
              <Button onClick={() => navigate('/alumnae')}>
                Return to Alumnae Landing
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-primary">
            Messages to Current Members
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Share wisdom, encouragement, and guidance with the next generation of Glee Club members.
            Your words can inspire and motivate current students on their musical journey.
          </p>
        </div>

        {/* Message Composition */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send a Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Share your wisdom, encouragement, or advice with current Glee Club members..."
                className="min-h-32"
                maxLength={1000}
              />
              <div className="text-right text-sm text-muted-foreground">
                {newMessage.length}/1000 characters
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Current Members</SelectItem>
                    <SelectItem value="current_members">Current Glee Club</SelectItem>
                    <SelectItem value="specific_class">Specific Class Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recipientType === 'specific_class' && (
                <div className="space-y-2">
                  <Label>Target Graduation Year</Label>
                  <Select value={targetYear} onValueChange={setTargetYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 8 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            Class of {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibleTo} onValueChange={setVisibleTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_members">Current Members Only</SelectItem>
                  <SelectItem value="alumnae_only">Alumnae Only</SelectItem>
                  <SelectItem value="public">Public (Website)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> All messages are reviewed by administrators before being shared. 
                Please keep content positive, appropriate, and encouraging.
              </p>
            </div>

            <Button
              onClick={handleSubmitMessage}
              disabled={submitting || !newMessage.trim()}
              className="w-full"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Messages Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Recent Messages from Alumnae
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.filter(msg => msg.is_approved && !msg.is_own_message).length > 0 ? (
                  messages
                    .filter(msg => msg.is_approved && !msg.is_own_message)
                    .slice(0, 10)
                    .map((message) => (
                      <div key={message.id} className="p-4 border rounded-lg space-y-2">
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {message.recipient_type === 'all' ? 'All Members' :
                               message.recipient_type === 'current_members' ? 'Current Members' :
                               `Class of ${message.target_graduation_year}`}
                            </Badge>
                            <Badge variant="secondary">
                              {message.visible_to}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No approved messages yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.filter(msg => msg.is_own_message).length > 0 ? (
                  messages
                    .filter(msg => msg.is_own_message)
                    .map((message) => (
                      <div key={message.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="text-sm flex-1 pr-2">{message.content}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {message.is_approved ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge variant="outline">
                              {message.recipient_type === 'all' ? 'All Members' :
                               message.recipient_type === 'current_members' ? 'Current Members' :
                               `Class of ${message.target_graduation_year}`}
                            </Badge>
                            <Badge 
                              variant={message.is_approved ? "default" : "secondary"}
                            >
                              {message.is_approved ? 'Published' : 'Under Review'}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      You haven't sent any messages yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversalLayout>
  );
}