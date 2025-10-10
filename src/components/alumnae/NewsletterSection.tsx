import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Calendar, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Newsletter {
  id: string;
  title: string;
  month: number;
  year: number;
  content: string;
  pdf_url?: string;
  cover_image_url?: string;
  published_at: string;
}

export const NewsletterSection = () => {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentNewsletter();
  }, []);

  const fetchCurrentNewsletter = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const { data, error } = await supabase
        .from('alumnae_newsletters')
        .select('*')
        .eq('is_published', true)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;
      setNewsletter(data);
    } catch (error) {
      console.error('Error fetching newsletter:', error);
      toast.error('Failed to load newsletter');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="p-12 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (!newsletter) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Monthly Newsletter
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No newsletter available for this month</p>
          <p className="text-sm text-muted-foreground mt-2">Check back soon for the latest updates!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in hover-scale">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Monthly Newsletter
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {getMonthName(newsletter.month)} {newsletter.year}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {newsletter.cover_image_url && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden">
            <img 
              src={newsletter.cover_image_url} 
              alt={newsletter.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div>
          <h3 className="text-xl font-semibold mb-2">{newsletter.title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span>Published {new Date(newsletter.published_at).toLocaleDateString()}</span>
          </div>
          <div 
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: newsletter.content.substring(0, 300) + '...' }}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1 bg-purple-500 hover:bg-purple-600">
            <Eye className="h-4 w-4 mr-2" />
            Read Full Newsletter
          </Button>
          {newsletter.pdf_url && (
            <Button variant="outline" asChild>
              <a href={newsletter.pdf_url} download>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
