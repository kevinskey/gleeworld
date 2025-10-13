import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Eye, EyeOff, Send, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { NewsletterContentManager } from "./NewsletterContentManager";
import { useFileUpload } from "@/integrations/supabase/hooks/useFileUpload";

export const NewsletterManager = () => {
  const { user } = useAuth();
  const { uploadFile, uploading } = useFileUpload();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [currentNewsletterId, setCurrentNewsletterId] = useState<string | null>(null);

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setCoverImageFile(file);
    toast.success(`${file.name} ready to upload`);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file");
      return;
    }

    setPdfFile(file);
    toast.success(`${file.name} ready to upload`);
  };

  const handleSave = async () => {
    if (!title) {
      toast.error("Please enter a newsletter title");
      return;
    }

    if (!pdfFile && !pdfUrl) {
      toast.error("Please upload a PDF or provide a PDF URL");
      return;
    }

    setSaving(true);
    try {
      let finalPdfUrl = pdfUrl;
      let finalCoverImageUrl = coverImageUrl;

      // Upload cover image if one was selected
      if (coverImageFile) {
        const uploadedUrl = await uploadFile(coverImageFile, 'alumnae-newsletters', `newsletters/${year}/${month}`);
        if (uploadedUrl) {
          finalCoverImageUrl = uploadedUrl;
          toast.success("Cover image uploaded successfully");
        } else {
          throw new Error("Failed to upload cover image");
        }
      }

      // Upload PDF file if one was selected
      if (pdfFile) {
        const uploadedUrl = await uploadFile(pdfFile, 'alumnae-newsletters', `newsletters/${year}/${month}`);
        if (uploadedUrl) {
          finalPdfUrl = uploadedUrl;
          toast.success("PDF uploaded successfully");
        } else {
          throw new Error("Failed to upload PDF");
        }
      }

      const newsletterData = {
        title,
        content: content || '', // Optional content field
        month,
        year,
        pdf_url: finalPdfUrl || null,
        cover_image_url: finalCoverImageUrl || null,
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
      setPdfFile(null);
      setCoverImageUrl("");
      setCoverImageFile(null);
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
        <Label htmlFor="title">Newsletter Title *</Label>
        <Input
          id="title"
          placeholder="e.g., March 2025 Newsletter"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImageUpload">Cover Image (Optional)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="coverImageUpload"
            type="file"
            accept="image/*"
            onChange={handleCoverImageUpload}
            className="cursor-pointer"
          />
          {coverImageFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCoverImageFile(null)}
              className="gap-1"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {coverImageFile && (
          <p className="text-sm text-muted-foreground">
            Ready to upload: {coverImageFile.name} ({(coverImageFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        {coverImageUrl && !coverImageFile && (
          <p className="text-sm text-muted-foreground">
            Current: <a href={coverImageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Image</a>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pdfUpload">Newsletter PDF *</Label>
        <div className="flex items-center gap-2">
          <Input
            id="pdfUpload"
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            className="cursor-pointer"
          />
          {pdfFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPdfFile(null)}
              className="gap-1"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {pdfFile && (
          <p className="text-sm text-muted-foreground">
            Ready to upload: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        {pdfUrl && !pdfFile && (
          <p className="text-sm text-muted-foreground">
            Current: <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View PDF</a>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Additional Notes (Optional)</Label>
        <Textarea
          id="content"
          placeholder="Add any additional notes or description about this newsletter..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
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
