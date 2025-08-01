import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface GeneralInquiryDialogProps {
  children?: React.ReactNode;
}

export const GeneralInquiryDialog: React.FC<GeneralInquiryDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const { user } = useAuth();
  const { profile } = useUserRole();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-general-inquiry', {
        body: {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          userRole: profile?.role
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success("Your inquiry has been submitted successfully!");
        setFormData({ name: '', email: '', subject: '', message: '' });
        setOpen(false);
      } else {
        throw new Error(data?.error || "Failed to submit inquiry");
      }
    } catch (error: any) {
      console.error('Error submitting inquiry:', error);
      toast.error(error.message || "Failed to submit inquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill user info if logged in
  React.useEffect(() => {
    if (user && open) {
      setFormData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="h-16 flex-col">
            <MessageCircle className="h-5 w-5 mb-2" />
            Submit General Inquiry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit General Inquiry</DialogTitle>
          <DialogDescription>
            Send your questions or requests to our Chief of Staff. We'll respond within 24-48 hours.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief description of your inquiry"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Please provide detailed information about your inquiry..."
              rows={5}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Inquiry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};