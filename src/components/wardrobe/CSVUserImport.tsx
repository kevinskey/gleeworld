import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Loader2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CSVRow {
  name: string;
  email: string;
  voice_part?: string;
  formal_dress_size?: string;
  polo_size?: string;
  tshirt_size?: string;
  lipstick_shade?: string;
  pearl_status?: string;
  phone?: string;
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data: CSVRow }>;
}

export const CSVUserImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);

  const downloadTemplate = () => {
    const headers = [
      'name',
      'email',
      'voice_part',
      'formal_dress_size',
      'polo_size',
      'tshirt_size',
      'lipstick_shade',
      'pearl_status',
      'phone'
    ];
    
    const sampleData = [
      [
        'Jane Smith',
        'jane.smith@spelman.edu',
        'Soprano 1',
        'Size 8',
        'Medium',
        'Medium',
        'Ruby Red',
        'assigned',
        '(404) 555-0123'
      ],
      [
        'Maria Garcia',
        'maria.garcia@spelman.edu',
        'Alto 2',
        'Size 10',
        'Large',
        'Medium',
        'Classic Red',
        'unassigned',
        '(404) 555-0124'
      ]
    ];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wardrobe_members_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Template downloaded successfully');
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const data: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          row[header] = values[index];
        }
      });

      // Validate required fields
      if (row.name && row.email) {
        data.push(row as CSVRow);
      }
    }

    return data;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    // Preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setPreviewData(parsed.slice(0, 5)); // Show first 5 rows for preview
    };
    reader.readAsText(selectedFile);
  };

  const importUsers = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const csvData = parseCSV(text);
        
        const result: ImportResult = {
          success: 0,
          errors: []
        };

        for (let i = 0; i < csvData.length; i++) {
          const row = csvData[i];
          setProgress((i / csvData.length) * 100);

          try {
            // First, check if user already exists in profiles
            const { data: existingProfile } = await supabase
              .from('gw_profiles')
              .select('user_id')
              .eq('email', row.email)
              .single();

            let userId = existingProfile?.user_id;

            // If no profile exists, create one
            if (!userId) {
              const { data: newProfile, error: profileError } = await supabase
                .from('gw_profiles')
                .insert({
                  email: row.email,
                  full_name: row.name,
                  voice_part: row.voice_part,
                  role: 'member'
                })
                .select('user_id')
                .single();

              if (profileError) throw profileError;
              userId = newProfile.user_id;
            }

            // Create or update wardrobe profile
            const wardrobeData = {
              user_id: userId,
              formal_dress_size: row.formal_dress_size,
              polo_size: row.polo_size,
              tshirt_size: row.tshirt_size,
              lipstick_shade: row.lipstick_shade,
              pearl_status: row.pearl_status || 'unassigned'
            };

            const { error: wardrobeError } = await supabase
              .from('gw_member_wardrobe_profiles')
              .upsert(wardrobeData, { 
                onConflict: 'user_id' 
              });

            if (wardrobeError) throw wardrobeError;

            result.success++;
          } catch (error) {
            console.error('Error importing row:', error);
            result.errors.push({
              row: i + 2, // +2 because of header row and 0-based index
              error: error instanceof Error ? error.message : 'Unknown error',
              data: row
            });
          }
        }

        setProgress(100);
        setResult(result);
        
        if (result.success > 0) {
          toast.success(`Successfully imported ${result.success} users`);
        }
        
        if (result.errors.length > 0) {
          toast.error(`${result.errors.length} rows had errors`);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import CSV file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV User Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-medium">Download Template</h3>
              <p className="text-sm text-muted-foreground">
                Get the CSV template with the correct column headers
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={importing}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Voice Part</th>
                        <th className="p-2 text-left">Dress Size</th>
                        <th className="p-2 text-left">Pearl Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.email}</td>
                          <td className="p-2">{row.voice_part}</td>
                          <td className="p-2">{row.formal_dress_size}</td>
                          <td className="p-2">{row.pearl_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Button */}
          <Button 
            onClick={importUsers} 
            disabled={!file || importing}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Users
              </>
            )}
          </Button>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Import completed: {result.success} users successfully imported
                  {result.errors.length > 0 && `, ${result.errors.length} errors`}
                </AlertDescription>
              </Alert>

              {result.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Import Errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-sm p-2 bg-destructive/10 rounded">
                          <div className="font-medium">Row {error.row}: {error.data.name}</div>
                          <div className="text-muted-foreground">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format Requirements:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Required columns: name, email</li>
                <li>• Optional: voice_part, formal_dress_size, polo_size, tshirt_size, lipstick_shade, pearl_status, phone</li>
                <li>• Pearl status values: unassigned, assigned, lost, replaced</li>
                <li>• Voice parts: Soprano 1, Soprano 2, Alto 1, Alto 2</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};