
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GleeWorldEvent } from "@/hooks/useGleeWorldEvents";

interface EventExportButtonProps {
  event: GleeWorldEvent;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const EventExportButton = ({ event, variant = "outline", size = "sm" }: EventExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const projectId = "oopmlreysjzuxzylyheb";
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const exportEvent = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams({ 
        type: 'single',
        eventId: event.id 
      });
      
      const response = await fetch(`${baseUrl}/export-calendar?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to export event');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create a safe filename from the event title
      const safeTitle = event.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
      a.download = `${safeTitle}-event.ics`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Event Exported",
        description: `${event.title} has been exported to your calendar.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={exportEvent}
      disabled={isExporting}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exporting..." : "Export Event"}
    </Button>
  );
};
