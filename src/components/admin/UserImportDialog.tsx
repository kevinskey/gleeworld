
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Users, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface UserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsersImported: () => void;
}

interface ImportResult {
  success: number;
  errors: string[];
  skipped: number;
}

export const UserImportDialog = ({ open, onOpenChange, onUsersImported }: UserImportDialogProps) => {
  const [csvContent, setCsvContent] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('full_name'));
    const roleIndex = headers.findIndex(h => h.includes('role'));

    if (emailIndex === -1) {
      throw new Error('CSV must contain an email column');
    }

    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values[emailIndex]) {
        users.push({
          email: values[emailIndex],
          full_name: nameIndex !== -1 ? values[nameIndex] : '',
          role: roleIndex !== -1 ? values[roleIndex] || 'user' : 'user'
        });
      }
    }

    return users;
  };

  const parseBulkEmails = (content: string) => {
    const emails = content
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    return emails.map(email => ({
      email,
      full_name: '',
      role: 'user'
    }));
  };

  const handleImport = async (users: any[]) => {
    setLoading(true);
    setImportResult(null);

    try {
      console.log('Importing users:', users);

      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          users,
          source: 'bulk_import'
        }
      });

      if (error) {
        throw error;
      }

      const result: ImportResult = {
        success: data.success || 0,
        errors: data.errors || [],
        skipped: data.skipped || 0
      };

      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.success} users.`,
        });
        onUsersImported();
      }

      if (result.errors.length > 0) {
        toast({
          title: "Import Issues",
          description: `${result.errors.length} users had issues during import.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error importing users:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async () => {
    try {
      const users = parseCSV(csvContent);
      await handleImport(users);
    } catch (error) {
      toast({
        title: "CSV Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleBulkEmailImport = async () => {
    try {
      const users = parseBulkEmails(bulkEmails);
      if (users.length === 0) {
        toast({
          title: "No Valid Emails",
          description: "Please enter valid email addresses.",
          variant: "destructive",
        });
        return;
      }
      await handleImport(users);
    } catch (error) {
      toast({
        title: "Bulk Import Error",
        description: error instanceof Error ? error.message : "Failed to import emails.",
        variant: "destructive",
      });
    }
  };

  const resetDialog = () => {
    setCsvContent("");
    setBulkEmails("");
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetDialog}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Users
          </DialogTitle>
          <DialogDescription>
            Import multiple users at once using CSV file or bulk email list.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CSV File
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk Emails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV file with columns: <code>email</code> (required), <code>name</code> (optional), <code>role</code> (optional, defaults to 'user')
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="csvFile">CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </div>

            {csvContent && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <Textarea
                  value={csvContent.split('\n').slice(0, 5).join('\n')}
                  readOnly
                  rows={5}
                  className="text-xs font-mono"
                />
                <p className="text-xs text-gray-500">
                  Showing first 5 lines. Total lines: {csvContent.split('\n').length}
                </p>
              </div>
            )}

            <Button 
              onClick={handleCSVImport} 
              disabled={!csvContent || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CSV
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enter email addresses separated by commas, semicolons, or new lines. All users will be created with 'user' role.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="bulkEmails">Email Addresses</Label>
              <Textarea
                id="bulkEmails"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="john@example.com, jane@example.com&#10;alice@example.com&#10;bob@example.com"
                rows={8}
                disabled={loading}
              />
            </div>

            <Button 
              onClick={handleBulkEmailImport} 
              disabled={!bulkEmails.trim() || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Import Emails
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {importResult && (
          <Alert className={importResult.success > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {importResult.success > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <div className={importResult.success > 0 ? "text-green-800" : "text-red-800"}>
                  <strong>Import Results:</strong>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    <li>{importResult.success} users imported successfully</li>
                    {importResult.skipped > 0 && <li>{importResult.skipped} users skipped (already exist)</li>}
                    {importResult.errors.length > 0 && <li>{importResult.errors.length} errors occurred</li>}
                  </ul>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-red-800">
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside mt-1 text-xs">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};
