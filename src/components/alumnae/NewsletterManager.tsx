import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Eye, EyeOff, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { NewsletterContentManager } from "./NewsletterContentManager";

export const NewsletterManager = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfUrl, setPdfUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [currentNewsletterId, setCurrentNewsletterId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title || !content) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const newsletterData = {
        title,
        content,
        month,
        year,
        pdf_url: pdfUrl || null,
        cover_image_url: coverImageUrl || null,
        is_published: isPublished,
        published_by: user?.id,
        published_at: isPublished ? new Date().toISOString() : null
      };

      const { data, error } = await supabase
        .from('alumnae_newsletters')
        .upsert(newsletterData, {
          onConflict: 'month,year'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Newsletter saved successfully!");
      
      // Store the newsletter ID for sending emails
      if (data) {
        setCurrentNewsletterId(data.id);
      }
      
      // Reset form
      setTitle("");
      setContent("");
      setPdfUrl("");
      setCoverImageUrl("");
      setIsPublished(false);
    } catch (error: any) {
      console.error('Error saving newsletter:', error);
      toast.error(error.message || "Failed to save newsletter");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotifications = async () => {
    if (!currentNewsletterId) {
      toast.error("Please save the newsletter first");
      return;
    }

    setSendingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-newsletter-notification', {
        body: { newsletter_id: currentNewsletterId }
      });

      if (error) throw error;

      toast.success(
        `Email notifications sent! ${data.stats.successful} successful, ${data.stats.failed} failed`,
        { duration: 5000 }
      );
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast.error(error.message || "Failed to send email notifications");
    } finally {
      setSendingEmails(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="month">Month</Label>
          <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            min={2020}
            max={2100}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Newsletter Title</Label>
        <Input
          id="title"
          placeholder="Enter newsletter title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Newsletter Content</Label>
        <Textarea
          id="content"
          placeholder="Enter newsletter content (supports HTML)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImage">Cover Image URL (Optional)</Label>
        <Input
          id="coverImage"
          placeholder="https://..."
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pdfUrl">PDF URL (Optional)</Label>
        <Input
          id="pdfUrl"
          placeholder="https://..."
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t">
        <Button
          variant={isPublished ? "destructive" : "default"}
          onClick={() => setIsPublished(!isPublished)}
          className="gap-2"
        >
          {isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isPublished ? "Unpublish" : "Publish"}
        </Button>

        <div className="flex gap-2">
          {currentNewsletterId && (
            <Button 
              onClick={handleSendNotifications} 
              disabled={sendingEmails}
              variant="secondary"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendingEmails ? "Sending..." : "Send to Alumnae"}
            </Button>
          )}
          
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Newsletter"}
          </Button>
        </div>
      </div>

      {currentNewsletterId && (
        <div className="pt-6 border-t">
          <NewsletterContentManager newsletterId={currentNewsletterId} />
        </div>
      )}
    </div>
  );
};
