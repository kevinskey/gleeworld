
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

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, ''));
  };

  const parseCsvFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          console.log('CSV lines found:', lines.length);
          
          if (lines.length < 2) {
            reject(new Error("CSV file must have at least a header row and one data row"));
            return;
          }
          
          const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
          console.log('CSV headers:', headers);
          
          const requiredColumns = ['email'];
          const missingColumns = requiredColumns.filter(col => 
            !headers.includes(col)
          );
          
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
          
          const users = [];
          const emailIndex = headers.indexOf('email');
          const fullNameIndex = headers.indexOf('full_name') >= 0 ? headers.indexOf('full_name') : headers.indexOf('name');
          const roleIndex = headers.indexOf('role');
          
          console.log('Column indices - email:', emailIndex, 'full_name:', fullNameIndex, 'role:', roleIndex);
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i]);
            console.log(`Row ${i} values:`, values);
            
            if (values.length < headers.length) {
              console.log(`Skipping row ${i} - insufficient columns`);
              continue;
            }
            
            const email = values[emailIndex]?.trim();
            if (!email) {
              console.log(`Skipping row ${i} - no email`);
              continue;
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              console.log(`Skipping row ${i} - invalid email format: ${email}`);
              continue;
            }
            
            const user: any = {
              email: email,
              full_name: fullNameIndex >= 0 ? values[fullNameIndex]?.trim() || '' : '',
              role: roleIndex >= 0 ? values[roleIndex]?.trim() || 'user' : 'user'
            };
            
            // Validate role
            if (!['user', 'admin', 'super-admin'].includes(user.role)) {
              user.role = 'user';
            }
            
            console.log(`Adding user:`, user);
            users.push(user);
          }
          
          console.log(`Total valid users parsed: ${users.length}`);
          
          if (users.length === 0) {
            reject(new Error("No valid users found in CSV. Please check that your CSV has valid email addresses and proper formatting."));
            return;
          }
          
          resolve(users);
        } catch (error) {
          console.error('CSV parsing error:', error);
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

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 10;
      setProgress(Math.min(currentProgress, 90));
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
            <li><strong>Optional columns:</strong> full_name (or name), role</li>
            <li>First row must contain column headers</li>
            <li>Roles should be: "user", "admin", or "super-admin" (defaults to "user")</li>
            <li>Maximum file size: 5MB</li>
            <li>Supports quoted fields and commas within quotes</li>
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
