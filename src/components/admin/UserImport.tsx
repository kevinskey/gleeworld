import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, Users, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CsvUploadSection } from "./CsvUploadSection";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  error?: string;
  details?: string;
}

export const UserImport = () => {
  const [apiUrl, setApiUrl] = useState("https://reader.gleeworld.org/api/users");
  const [apiKey, setApiKey] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [manualUsers, setManualUsers] = useState("");
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateJsonInput = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (!Array.isArray(parsed)) {
        return "JSON must be an array of user objects";
      }
      
      if (parsed.length === 0) {
        return "Array cannot be empty";
      }
      
      // Validate each user object
      for (let i = 0; i < parsed.length; i++) {
        const user = parsed[i];
        if (!user.email) {
          return `User at index ${i} is missing required 'email' field`;
        }
        if (typeof user.email !== 'string') {
          return `User at index ${i} has invalid email field (must be string)`;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
          return `User at index ${i} has invalid email format: ${user.email}`;
        }
      }
      
      return null; // No errors
    } catch (error) {
      return `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const handleJsonChange = (value: string) => {
    setManualUsers(value);
    if (value.trim()) {
      const validationError = validateJsonInput(value);
      setJsonValidationError(validationError);
    } else {
      setJsonValidationError(null);
    }
  };

  const handleApiImport = async () => {
    if (!apiUrl || !apiKey) {
      toast({
        title: "Missing Information",
        description: "Please provide both API URL and API Key",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResult(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          apiUrl,
          apiKey,
          source: 'reader.gleeworld.org'
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        console.error('Supabase function error:', error);
        setImportResult({
          success: 0,
          failed: 0,
          errors: [],
          error: error.message || 'Unknown error occurred',
          details: 'Failed to call import function'
        });
        return;
      }

      setImportResult(data);
      
      if (data.error) {
        toast({
          title: "Import Failed",
          description: data.details || data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${data.success} users`,
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(100);
      console.error('Import error:', error);
      
      setImportResult({
        success: 0,
        failed: 0,
        errors: [],
        error: error instanceof Error ? error.message : "Failed to import users",
        details: 'Check the console for more details'
      });
      
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import users",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualImport = async () => {
    if (!manualUsers.trim()) {
      toast({
        title: "No Data",
        description: "Please provide user data to import",
        variant: "destructive",
      });
      return;
    }

    // Validate JSON before attempting import
    const validationError = validateJsonInput(manualUsers);
    if (validationError) {
      toast({
        title: "Invalid Data Format",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResult(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const users = JSON.parse(manualUsers);
      
      console.log('Sending users to import function:', users);
      
      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          users,
          source: 'manual'
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log('Import function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        setImportResult({
          success: 0,
          failed: 0,
          errors: [],
          error: error.message || 'Unknown error occurred',
          details: 'Failed to call import function'
        });
        return;
      }

      setImportResult(data);
      
      if (data.error) {
        toast({
          title: "Import Failed",
          description: data.details || data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${data.success} users`,
        });
      }
    } catch (parseError) {
      clearInterval(progressInterval);
      setProgress(100);
      
      const errorMessage = parseError instanceof Error ? parseError.message : "Invalid JSON format";
      
      setImportResult({
        success: 0,
        failed: 0,
        errors: [],
        error: "JSON Parse Error",
        details: errorMessage
      });
      
      toast({
        title: "Import Failed",
        description: "Invalid JSON format. Please check your data.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const exampleJson = `[
  {
    "email": "john.doe@example.com",
    "full_name": "John Doe",
    "role": "user"
  },
  {
    "email": "jane.smith@example.com",
    "full_name": "Jane Smith",
    "role": "admin"
  }
]`;

  return (
    <div className="space-y-6">
      {/* CSV Import */}
      <CsvUploadSection 
        onImportResult={setImportResult}
        isImporting={isImporting}
        setIsImporting={setIsImporting}
        progress={progress}
        setProgress={setProgress}
      />

      {/* API Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Import from reader.gleeworld.org</span>
          </CardTitle>
          <CardDescription>
            Import users directly from the reader.gleeworld.org API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://reader.gleeworld.org/api/users"
              />
            </div>
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleApiImport}
            disabled={isImporting}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isImporting ? "Importing..." : "Import Users from API"}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Manual Import</span>
          </CardTitle>
          <CardDescription>
            Paste user data in JSON format for manual import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="manualUsers">User Data (JSON)</Label>
            <Textarea
              id="manualUsers"
              value={manualUsers}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={exampleJson}
              rows={10}
              className={`font-mono ${jsonValidationError ? 'border-red-300' : ''}`}
            />
            {jsonValidationError && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-600">
                  {jsonValidationError}
                </AlertDescription>
              </Alert>
            )}
            {manualUsers.trim() && !jsonValidationError && (
              <Alert className="mt-2">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  JSON format is valid. Ready to import {JSON.parse(manualUsers).length} users.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            <p className="font-medium">Required fields:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>email</code> - Valid email address (required)</li>
              <li><code>full_name</code> - User's full name (optional)</li>
              <li><code>role</code> - User role: "user", "admin", or "super-admin" (optional, defaults to "user")</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleManualImport}
            disabled={isImporting || !!jsonValidationError || !manualUsers.trim()}
            variant="outline"
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? "Importing..." : "Import Users Manually"}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {isImporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing users...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Import Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {importResult.error ? (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Import Failed: {importResult.error}</div>
                  {importResult.details && (
                    <div className="text-sm text-muted-foreground">{importResult.details}</div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                    <div className="text-sm text-green-700">Successful</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                </div>
                
                {importResult.errors.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <div className="font-medium mb-2">Errors encountered:</div>
                      <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
