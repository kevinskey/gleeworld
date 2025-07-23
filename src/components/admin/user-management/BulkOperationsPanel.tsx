import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  X
} from "lucide-react";

interface BulkOperationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOperationComplete: () => void;
  totalUsers: number;
}

interface ImportResult {
  success: number;
  errors: string[];
  skipped: number;
}

export const BulkOperationsPanel = ({ 
  isOpen, 
  onClose, 
  onOperationComplete,
  totalUsers 
}: BulkOperationsPanelProps) => {
  const [csvContent, setCsvContent] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

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
          users: users,
          source: 'bulk'
        }
      });

      if (error) throw error;

      const result: ImportResult = {
        success: data.success || 0,
        errors: data.errors || [],
        skipped: data.users ? users.length - data.success : 0
      };

      setImportResult(result);

      if (result.success > 0) {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${result.success} users.`,
        });
        onOperationComplete();
      }

      if (result.errors.length > 0) {
        toast({
          title: "Import Completed with Errors",
          description: `${result.success} users imported, ${result.errors.length} errors occurred.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import users",
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
        description: error instanceof Error ? error.message : "Failed to parse CSV",
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
        title: "Email Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse emails",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    // This would be implemented to export current users
    toast({
      title: "Export Started",
      description: `Exporting ${totalUsers} users to CSV...`,
    });
    // Implementation would go here
  };

  const resetForm = () => {
    setCsvContent("");
    setBulkEmails("");
    setImportResult(null);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 lg:w-[500px] bg-white shadow-xl border-l z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Bulk Operations
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6">
        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import Users</TabsTrigger>
            <TabsTrigger value="export">Export Users</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV File Import
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV file with user information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csvFile">CSV File</Label>
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">
                      CSV should contain: email (required), name, role columns
                    </p>
                  </div>

                  {csvContent && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="text-xs bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                        {csvContent.split('\n').slice(0, 3).join('\n')}
                        {csvContent.split('\n').length > 3 && '\n...'}
                      </div>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Bulk Email Import
                  </CardTitle>
                  <CardDescription>
                    Enter multiple email addresses to create user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkEmails">Email Addresses</Label>
                    <Textarea
                      id="bulkEmails"
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      placeholder="user1@example.com, user2@example.com&#10;user3@example.com"
                      rows={6}
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">
                      Enter email addresses separated by commas, semicolons, or new lines. All users will be created with 'user' role.
                    </p>
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
                        <Upload className="h-4 w-4 mr-2" />
                        Import Email List
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Import Results */}
              {importResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {importResult.success > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      Import Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <p className="text-green-600">✓ {importResult.success} users imported successfully</p>
                      {importResult.errors.length > 0 && (
                        <p className="text-red-600">✗ {importResult.errors.length} errors occurred</p>
                      )}
                    </div>

                    {importResult.errors.length > 0 && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription>
                          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                            {importResult.errors.map((error, index) => (
                              <div key={index} className="text-red-800">• {error}</div>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button variant="outline" size="sm" onClick={resetForm}>
                      Clear Results
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export User Data
                </CardTitle>
                <CardDescription>
                  Download user information as CSV file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Current users in system: <strong>{totalUsers}</strong></p>
                  <p className="text-xs mt-1">
                    Export will include: Name, Email, Role, Created Date
                  </p>
                </div>

                <Button onClick={handleExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};