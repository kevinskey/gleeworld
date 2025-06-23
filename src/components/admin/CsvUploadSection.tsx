
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CsvUploadSectionProps {
  onImportResult: (result: any) => void;
  isImporting: boolean;
  setIsImporting: (importing: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
}

export const CsvUploadSection = ({ 
  onImportResult, 
  isImporting, 
  setIsImporting, 
  progress, 
  setProgress 
}: CsvUploadSectionProps) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvValidationError, setCsvValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  const validateCsvFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return "File must be a CSV file";
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return "File size must be less than 5MB";
    }
    
    return null;
  };

  const parseCsvFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error("CSV file must have at least a header row and one data row"));
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const requiredColumns = ['email'];
          
          const missingColumns = requiredColumns.filter(col => 
            !headers.some(header => header.toLowerCase() === col.toLowerCase())
          );
          
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
          
          const users = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length !== headers.length) {
              continue; // Skip malformed rows
            }
            
            const user: any = {};
            headers.forEach((header, index) => {
              const value = values[index];
              switch (header.toLowerCase()) {
                case 'email':
                  user.email = value;
                  break;
                case 'raw_user_meta_data':
                  try {
                    user.raw_user_meta_data = value ? JSON.parse(value) : {};
                  } catch {
                    user.raw_user_meta_data = { full_name: value };
                  }
                  break;
                case 'role':
                  user.role = value || 'user';
                  break;
                default:
                  // Store other columns in metadata
                  if (!user.raw_user_meta_data) user.raw_user_meta_data = {};
                  user.raw_user_meta_data[header] = value;
              }
            });
            
            // Extract full_name from raw_user_meta_data if available
            if (user.raw_user_meta_data && user.raw_user_meta_data.full_name) {
              user.full_name = user.raw_user_meta_data.full_name;
            }
            
            users.push(user);
          }
          
          resolve(users);
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateCsvFile(file);
      if (validationError) {
        setCsvValidationError(validationError);
        setCsvFile(null);
      } else {
        setCsvValidationError(null);
        setCsvFile(file);
      }
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    onImportResult(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 10;
        return Math.min(newProgress, 90);
      });
    }, 200);

    try {
      const users = await parseCsvFile(csvFile);
      
      console.log('Parsed CSV users:', users);
      
      if (users.length === 0) {
        throw new Error("No valid users found in CSV file");
      }
      
      const { data, error } = await supabase.functions.invoke('import-users', {
        body: {
          users,
          source: 'csv'
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log('Import function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Unknown error occurred');
      }

      onImportResult(data);
      
      if (data.error) {
        toast({
          title: "Import Failed",
          description: data.details || data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Completed",
          description: `Successfully imported ${data.success} users from CSV`,
        });
        setCsvFile(null);
      }
    } catch (parseError) {
      clearInterval(progressInterval);
      setProgress(100);
      
      const errorMessage = parseError instanceof Error ? parseError.message : "Failed to parse CSV file";
      
      onImportResult({
        success: 0,
        failed: 0,
        errors: [],
        error: "CSV Parse Error",
        details: errorMessage
      });
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>CSV Import</span>
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import multiple users at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="csv-upload">CSV File</Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isImporting}
          />
          {csvValidationError && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-600">
                {csvValidationError}
              </AlertDescription>
            </Alert>
          )}
          {csvFile && !csvValidationError && (
            <Alert className="mt-2">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-600">
                File "{csvFile.name}" is ready for import ({(csvFile.size / 1024).toFixed(1)} KB)
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-2">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Required column:</strong> email</li>
            <li><strong>Optional columns:</strong> role, raw_user_meta_data (JSON), or any other user fields</li>
            <li>First row must contain column headers</li>
            <li>Roles should be: "user", "admin", or "super-admin" (defaults to "user")</li>
            <li>Maximum file size: 5MB</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleCsvImport}
          disabled={isImporting || !csvFile || !!csvValidationError}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isImporting ? "Importing..." : "Import Users from CSV"}
        </Button>
      </CardContent>
    </Card>
  );
};
