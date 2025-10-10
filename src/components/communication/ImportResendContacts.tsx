import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ImportResendContacts = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [sendInvites, setSendInvites] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    
    try {
      console.log("Starting Resend user import...", { sendInvites });
      
      const { data, error } = await supabase.functions.invoke("import-resend-contacts", {
        body: {
          send_invite_emails: sendInvites,
          default_role: "alumna"
        }
      });

      if (error) throw error;

      if (data?.success) {
        const detailMessage = `Imported ${data.stats.imported_users} users. ${
          data.stats.failed_imports > 0 ? `${data.stats.failed_imports} failed.` : ''
        } ${sendInvites ? 'Invite emails sent.' : ''}`;
        
        toast({
          title: "Import Successful",
          description: detailMessage,
        });
        
        console.log("Import results:", data);
        
        if (data.failed_imports?.length > 0) {
          console.error("Failed imports:", data.failed_imports);
        }
      } else {
        throw new Error(data?.error || "Import failed");
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import users from Resend",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Users from Resend</CardTitle>
        <CardDescription>
          Create GleeWorld user accounts from your Resend contact lists
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="send-invites" 
            checked={sendInvites}
            onCheckedChange={(checked) => setSendInvites(checked as boolean)}
            disabled={isImporting}
          />
          <Label 
            htmlFor="send-invites"
            className="text-sm font-normal cursor-pointer"
          >
            Send invitation emails to imported users
          </Label>
        </div>

        <Button 
          onClick={handleImport} 
          disabled={isImporting}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing Users...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import Users
            </>
          )}
        </Button>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            This will create Supabase user accounts for all contacts in your Resend audiences.
          </p>
          <p className="text-xs">
            • Users will be assigned the "alumna" role<br />
            • Existing users will be skipped<br />
            • {sendInvites ? "Users will receive invitation emails to set their password" : "Users will be auto-confirmed and can reset their password"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
