import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Download,
  X,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CSVRow {
  [key: string]: string;
}

interface ImportMapping {
  title: string;
  composer: string;
  voicing: string;
  library_number: string;
  physical_copies: string;
}

interface ImportResult {
  success: number;
  errors: number;
  updated: number;
  created: number;
  details: Array<{
    row: number;
    title: string;
    status: 'success' | 'error' | 'updated' | 'created';
    message: string;
  }>;
}

const EXPECTED_COLUMNS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'composer', label: 'Composer', required: false },
  { key: 'library_number', label: 'Library Number', required: false },
  { key: 'voicing', label: 'Voicing', required: false },
  { key: 'physical_copies', label: 'Physical Copies', required: true },
];

export const CSVImportDialog = ({ open, onOpenChange, onSuccess }: CSVImportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'importing' | 'results'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ImportMapping>({
    title: '',
    composer: '',
    voicing: '',
    library_number: '',
    physical_copies: '',
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = useCallback((csvText: string): CSVRow[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    setCsvHeaders(headers);
    
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: CSVRow = {};
      
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      
      return row;
    });
    
    return data;
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const data = parseCSV(csvText);
        setCsvData(data);
        setStep('preview');
        
        toast({
          title: "CSV Loaded",
          description: `Successfully loaded ${data.length} rows from CSV file.`,
        });
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
  }, [parseCSV, toast]);

  const handleColumnMapping = (column: keyof ImportMapping, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [column]: csvColumn
    }));
  };

  const validateMapping = (): boolean => {
    return !!(columnMapping.title && columnMapping.title !== 'unmapped' && 
              columnMapping.physical_copies && columnMapping.physical_copies !== 'unmapped');
  };

  const findExistingSheet = async (title: string, composer?: string) => {
    let query = supabase
      .from('gw_sheet_music')
      .select('*')
      .ilike('title', `%${title}%`);
    
    if (composer) {
      query = query.ilike('composer', `%${composer}%`);
    }
    
    const { data } = await query.limit(1);
    return data?.[0] || null;
  };

  const processImport = async () => {
    if (!validateMapping()) {
      toast({
        title: "Invalid Mapping",
        description: "Please map at least Title and Physical Copies columns.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStep('importing');

    const result: ImportResult = {
      success: 0,
      errors: 0,
      updated: 0,
      created: 0,
      details: []
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const title = row[columnMapping.title]?.trim();
      const composer = columnMapping.composer !== 'unmapped' ? row[columnMapping.composer]?.trim() : '';
      const voicing = columnMapping.voicing !== 'unmapped' ? row[columnMapping.voicing]?.trim() : '';
      const libraryNumber = columnMapping.library_number !== 'unmapped' ? row[columnMapping.library_number]?.trim() : '';
      const physicalCopiesStr = row[columnMapping.physical_copies]?.trim();

      if (!title) {
        result.errors++;
        result.details.push({
          row: i + 1,
          title: 'Unknown',
          status: 'error',
          message: 'Missing title'
        });
        continue;
      }

      const physicalCopies = parseInt(physicalCopiesStr) || 0;
      if (physicalCopies < 0) {
        result.errors++;
        result.details.push({
          row: i + 1,
          title,
          status: 'error',
          message: 'Invalid physical copies count'
        });
        continue;
      }

      try {
        // Try to find existing record
        const existingSheet = await findExistingSheet(title, composer);

        if (existingSheet) {
          // Update existing record
          const updateData: any = {
            physical_copies_count: physicalCopies,
            physical_location: libraryNumber || existingSheet.physical_location,
            last_inventory_date: new Date().toISOString().split('T')[0],
          };
          
          if (voicing) {
            updateData.voicing = voicing;
          }

          const { error } = await supabase
            .from('gw_sheet_music')
            .update(updateData)
            .eq('id', existingSheet.id);

          if (error) throw error;

          result.updated++;
          result.success++;
          result.details.push({
            row: i + 1,
            title,
            status: 'updated',
            message: `Updated physical copies: ${physicalCopies}`
          });
        } else {
          // Create new record
          const insertData: any = {
            title,
            composer: composer || null,
            physical_copies_count: physicalCopies,
            physical_location: libraryNumber || null,
            last_inventory_date: new Date().toISOString().split('T')[0],
            is_public: true,
            created_by: user?.id,
          };

          if (voicing) {
            insertData.voicing = voicing;
          }

          const { error } = await supabase
            .from('gw_sheet_music')
            .insert(insertData);

          if (error) throw error;

          result.created++;
          result.success++;
          result.details.push({
            row: i + 1,
            title,
            status: 'created',
            message: `Created new entry with ${physicalCopies} physical copies`
          });
        }
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        result.errors++;
        result.details.push({
          row: i + 1,
          title,
          status: 'error',
          message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    setImportResult(result);
    setIsProcessing(false);
    setStep('results');

    toast({
      title: "Import Complete",
      description: `Processed ${csvData.length} rows. ${result.success} successful, ${result.errors} errors.`,
    });
  };

  const resetImport = () => {
    setStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({
      title: '',
      composer: '',
      voicing: '',
      library_number: '',
      physical_copies: '',
    });
    setImportResult(null);
    setIsProcessing(false);
  };

  const downloadTemplate = () => {
    const template = [
      ['Title', 'Composer', 'Library Number', 'Voicing', 'Physical Copies'],
      ['Amazing Grace', 'John Newton', 'A-001', 'SATB', '3'],
      ['Ave Maria', 'Franz Schubert', 'A-002', 'SSA', '2'],
      ['Hallelujah Chorus', 'George Frideric Handel', 'H-001', 'SATB', '5'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'library_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Physical Library Data
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Upload a CSV file with your physical library data
              </p>
              <Button onClick={downloadTemplate} variant="outline" className="mb-4">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Expected CSV Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <p><strong>Required columns:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Title - Name of the sheet music</li>
                    <li>Physical Copies - Number of physical copies in library</li>
                  </ul>
                  <p><strong>Optional columns:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Composer - Composer name</li>
                    <li>Voicing - Voice arrangement (e.g., SATB, SSA)</li>
                    <li>Library Number - Your internal library numbering system</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
              <div className="text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-lg font-medium">Choose CSV file</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select your CSV file to import physical library data
                  </p>
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Preview Data ({csvData.length} rows)</h3>
              <Button onClick={() => setStep('mapping')} disabled={csvData.length === 0}>
                Continue to Mapping
              </Button>
            </div>

            <ScrollArea className="h-64 border rounded">
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {csvHeaders.map((header, index) => (
                        <th key={index} className="text-left p-2 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-b">
                        {csvHeaders.map((header, colIndex) => (
                          <td key={colIndex} className="p-2">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvData.length > 10 && (
                  <p className="text-center text-muted-foreground mt-4">
                    ... and {csvData.length - 10} more rows
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Map CSV Columns</h3>
              <div className="flex gap-2">
                <Button onClick={() => setStep('preview')} variant="outline">
                  Back
                </Button>
                <Button 
                  onClick={processImport} 
                  disabled={!validateMapping()}
                >
                  Start Import
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {EXPECTED_COLUMNS.map((column) => (
                <div key={column.key}>
                  <Label className="flex items-center gap-2">
                    {column.label}
                    {column.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </Label>
                  <Select
                    value={columnMapping[column.key as keyof ImportMapping]}
                    onValueChange={(value) => handleColumnMapping(column.key as keyof ImportMapping, value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select CSV column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">-- Not mapped --</SelectItem>
                      {csvHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {validateMapping() && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-green-600">Mapping Valid</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ready to import {csvData.length} rows. The system will:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>Look for existing sheet music by title and composer</li>
                    <li>Update physical copy information for existing items</li>
                    <li>Create new entries for items not found in the database</li>
                    <li>Set the inventory date to today for all processed items</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold">Importing Data...</h3>
              <p className="text-muted-foreground">
                Processing {csvData.length} rows. Please wait...
              </p>
            </div>
          </div>
        )}

        {step === 'results' && importResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Import Results</h3>
              <div className="flex gap-2">
                <Button onClick={resetImport} variant="outline">
                  Import Another File
                </Button>
                <Button onClick={() => { onOpenChange(false); onSuccess?.(); }}>
                  Close
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{importResult.created}</div>
                  <div className="text-sm text-muted-foreground">Created</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </CardContent>
              </Card>
            </div>

            <ScrollArea className="h-64 border rounded">
              <div className="p-4 space-y-2">
                {importResult.details.map((detail, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded border">
                    {detail.status === 'success' || detail.status === 'updated' || detail.status === 'created' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">Row {detail.row}: {detail.title}</div>
                      <div className="text-xs text-muted-foreground">{detail.message}</div>
                    </div>
                    <Badge 
                      variant={detail.status === 'error' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {detail.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};