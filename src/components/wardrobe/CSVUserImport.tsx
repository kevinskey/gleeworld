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
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CSVRow {
  name: string;
  bust?: string;
  waist?: string;
  hips?: string;
  height?: string;
  shirt?: string;
  dress?: string;
  pants?: string;
  classification?: string;
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data: CSVRow }>;
}

export const CSVUserImport = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);

  const downloadTemplate = () => {
    const headers = [
      'Name',
      'Bust',
      'Waist',
      'Hips',
      'Height',
      'Shirt',
      'Dress',
      'Pants',
      'Classification'
    ];
    
    const sampleData = [
      [
        'Jane Smith',
        '36',
        '28',
        '38',
        '5\'6"',
        'Medium',
        'Size 8',
        'Size 6',
        'Senior'
      ],
      [
        'Maria Garcia',
        '34',
        '26',
        '36',
        '5\'4"',
        'Small',
        'Size 6',
        'Size 4',
        'Junior'
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
      if (row.name) {
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
            // Create wardrobe measurement record
            const wardrobeData = {
              name: row.name,
              bust_measurement: row.bust,
              waist_measurement: row.waist,
              hips_measurement: row.hips,
              height_measurement: row.height,
              shirt_size: row.shirt,
              dress_size: row.dress,
              pants_size: row.pants,
              classification: row.classification,
              created_by: user?.id
            };

            const { error: wardrobeError } = await supabase
              .from('gw_wardrobe_measurements')
              .insert(wardrobeData);

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
                        <th className="p-2 text-left">Bust</th>
                        <th className="p-2 text-left">Waist</th>
                        <th className="p-2 text-left">Hips</th>
                        <th className="p-2 text-left">Height</th>
                        <th className="p-2 text-left">Shirt</th>
                        <th className="p-2 text-left">Dress</th>
                        <th className="p-2 text-left">Pants</th>
                        <th className="p-2 text-left">Classification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.bust}</td>
                          <td className="p-2">{row.waist}</td>
                          <td className="p-2">{row.hips}</td>
                          <td className="p-2">{row.height}</td>
                          <td className="p-2">{row.shirt}</td>
                          <td className="p-2">{row.dress}</td>
                          <td className="p-2">{row.pants}</td>
                          <td className="p-2">{row.classification}</td>
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
                <li>• Required columns: Name</li>
                <li>• Optional measurements: Bust, Waist, Hips, Height</li>
                <li>• Optional sizes: Shirt, Dress, Pants</li>
                <li>• Classification: Senior, Junior, Sophomore, Freshman</li>
                <li>• All measurements should be in standard format (e.g., "36", "5'6"")</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};