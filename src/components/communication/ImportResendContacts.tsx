import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ImportResendContacts = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    
    try {
      console.log("Starting Resend contacts import...");
      
      const { data, error } = await supabase.functions.invoke("import-resend-contacts");

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        
        console.log("Import stats:", data.stats);
      } else {
        throw new Error(data?.error || "Import failed");
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import contacts from Resend",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Contacts from Resend</CardTitle>
        <CardDescription>
          Import all contacts from your Resend audiences into GleeWorld
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleImport} 
          disabled={isImporting}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import Contacts
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          This will fetch all contacts from your Resend audiences and add them to your GleeWorld database.
          Existing contacts will not be duplicated.
        </p>
      </CardContent>
    </Card>
  );
};
