import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, AlertTriangle, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WardrobeCSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CSVRecord {
  category: string;
  item_name: string;
  size_available: string[];
  color_available: string[];
  quantity_total: number;
  quantity_available: number;
  condition: string;
  low_stock_threshold: number;
  notes: string;
}

interface ImportMapping {
  category: string;
  item_name: string;
  sizes: string;
  colors: string;
  quantity_total: string;
  quantity_available: string;
  condition: string;
  low_stock_threshold: string;
  notes: string;
}

const requiredFields = ['category', 'item_name', 'quantity_total', 'quantity_available'];
const categories = ['dresses', 'pearls', 'lipstick', 'polos', 't-shirts', 'garment-bags'];
const conditions = ['new', 'good', 'fair', 'poor', 'damaged'];

export const WardrobeCSVImportDialog = ({ open, onOpenChange, onSuccess }: WardrobeCSVImportDialogProps) => {
  console.log('🔄 WardrobeCSVImportDialog component rendering, open:', open);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({
    category: '',
    item_name: '',
    sizes: '',
    colors: '',
    quantity_total: '',
    quantity_available: '',
    condition: '',
    low_stock_threshold: '',
    notes: ''
  });
  const [preview, setPreview] = useState<CSVRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Check if user has permission to import CSV (admins and specific wardrobe managers)
  React.useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasPermission(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('gw_profiles')
          .select('email, full_name, is_admin, is_super_admin')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        // Allow admins, super admins, and specific wardrobe managers
        const isAdmin = profile?.is_admin || profile?.is_super_admin;

        const allowedUsers = [
          'drew', 'soleil', 'drewroberts@spelman.edu', 'soleilvailes@spelman.edu', 'soleilvailes111@gmail.com'
        ];

        const userEmail = profile?.email?.toLowerCase() || '';
        const userName = profile?.full_name?.toLowerCase() || '';
        
        const isSpecificUser = allowedUsers.some(name => 
          userEmail.includes(name) || userName.includes(name) || userEmail === name
        );

        setHasPermission(isAdmin || isSpecificUser);
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      }
    };

    checkPermission();
  }, [user]);

  console.log('🔄 WardrobeCSVImportDialog state initialized, open:', open);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('📂 File upload started');
      const uploadedFile = event.target.files?.[0];
      if (!uploadedFile) return;

      if (!uploadedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }

      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim());
          const rawHeaders = parseCSVLine(lines[0]);
          const sanitizedHeaders = rawHeaders.map((h, i) => {
            const cleaned = (h ?? '').trim();
            return cleaned.length > 0 ? cleaned : `Column ${i + 1}`;
          });
          const parsedData = lines.slice(1).map(line => parseCSVLine(line));
          
          setHeaders(sanitizedHeaders);
          setCsvData(parsedData);
          setStep('mapping');
          console.log('✅ File parsed successfully');
        } catch (error) {
          console.error('❌ Error parsing file:', error);
          toast({
            title: "File parsing error",
            description: "There was an error reading your CSV file",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(uploadedFile);
    } catch (error) {
      console.error('❌ Error in handleFileUpload:', error);
      toast({
        title: "Upload error",
        description: "There was an error uploading your file",
        variant: "destructive",
      });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] === ',')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(item => item.replace(/^"|"$/g, ''));
  };

  const handleColumnMapping = (field: keyof ImportMapping, csvColumn: string) => {
    setMapping(prev => ({ ...prev, [field]: csvColumn }));
  };

  const generatePreview = () => {
    try {
      console.log('🔍 Generating preview');
      const errors: string[] = [];
      const previewData: CSVRecord[] = [];

      // Special handling for the wardrobe structure with dress sizes and named items
      csvData.forEach((row, index) => {
        try {
          // Check if this is a dress size row (first column is a number)
          const firstColumnValue = row[0]?.trim();
          const isDressSizeRow = !isNaN(parseInt(firstColumnValue)) && firstColumnValue !== '';
          
          if (isDressSizeRow) {
            // Process dress size row
            const size = firstColumnValue;
            const quantity = parseInt(row[1]) || 0;
            
            if (quantity > 0) {
              const record: CSVRecord = {
                category: 'dresses',
                item_name: `Size ${size} Dress`,
                size_available: [size],
                color_available: [],
                quantity_total: quantity,
                quantity_available: quantity,
                condition: 'good',
                low_stock_threshold: 1,
                notes: ''
              };
              previewData.push(record);
            }
          } else if (row[0] && row[1] && !isNaN(parseInt(row[1]))) {
            // Process named item row (like "Spare Necklaces", "Stud Pairs", etc.)
            const itemName = row[0].trim();
            const quantity = parseInt(row[1]) || 0;
            
            if (quantity > 0 && itemName) {
              // Determine category based on item name
              let category = 'pearls'; // default
              const lowerName = itemName.toLowerCase();
              if (lowerName.includes('lipstick') || lowerName.includes('lip')) {
                category = 'lipstick';
              } else if (lowerName.includes('dress') || lowerName.includes('gown')) {
                category = 'dresses';
              }
              
              const record: CSVRecord = {
                category,
                item_name: itemName,
                size_available: [],
                color_available: [],
                quantity_total: quantity,
                quantity_available: quantity,
                condition: 'good',
                low_stock_threshold: Math.min(5, Math.ceil(quantity * 0.2)),
                notes: ''
              };
              previewData.push(record);
            }
          }
        } catch (error) {
          errors.push(`Row ${index + 2}: Error processing row - ${error}`);
        }
      });

      setValidationErrors(errors);
      if (errors.length === 0) {
        setPreview(previewData);
        setStep('preview');
        console.log('✅ Preview generated successfully', previewData);
      }
    } catch (error) {
      console.error('❌ Error in generatePreview:', error);
      toast({
        title: "Preview error",
        description: "There was an error generating the preview",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    try {
      console.log('📤 Starting import');
      setStep('importing');
      setLoading(true);

      const records = preview.map(record => ({
        ...record,
        quantity_checked_out: 0,
        created_by: user?.id
      }));

      const { data, error } = await supabase
        .from('gw_wardrobe_inventory')
        .insert(records)
        .select();

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Successfully imported ${data.length} wardrobe items`,
      });

      onSuccess();
      handleClose();
      console.log('✅ Import completed successfully');
    } catch (error) {
      console.error('❌ Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      });
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setMapping({
      category: '',
      item_name: '',
      sizes: '',
      colors: '',
      quantity_total: '',
      quantity_available: '',
      condition: '',
      low_stock_threshold: '',
      notes: ''
    });
    setPreview([]);
    setValidationErrors([]);
    setStep('upload');
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    try {
      const template = [
        ['category', 'item_name', 'sizes', 'colors', 'quantity_total', 'quantity_available', 'condition', 'low_stock_threshold', 'notes'],
        ['dresses', 'Black Evening Gown', 'S,M,L,XL', 'Black', '10', '8', 'good', '2', 'Formal performance dress'],
        ['pearls', 'Classic Pearl Necklace', '', 'White', '20', '18', 'new', '3', '16-inch strand'],
        ['lipstick', 'Performance Red', '', 'Red', '15', '12', 'new', '5', 'Stage-appropriate color']
      ];

      const csvContent = template.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'wardrobe_import_template.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('❌ Error downloading template:', error);
      toast({
        title: "Download error",
        description: "There was an error downloading the template",
        variant: "destructive",
      });
    }
  };

  console.log('🔄 About to render Dialog, open:', open);

  // Show loading while checking permission
  if (hasPermission === null) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checking Permissions...</DialogTitle>
            <DialogDescription>
              Please wait while we verify your access.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // If user doesn't have permission, show access denied
  if (!hasPermission) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
            <DialogDescription>
              CSV import is restricted to authorized wardrobe managers only. 
              Please contact Drew or Soleil if you need to import inventory data.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // If there's an error with the component state, show error dialog
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              You must be logged in to use the CSV import feature.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Wardrobe Inventory from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import wardrobe inventory items. Download the template to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center space-x-4">
            {[
              { key: 'upload', label: 'Upload File' },
              { key: 'mapping', label: 'Map Columns' },
              { key: 'preview', label: 'Preview & Import' }
            ].map((stepItem, index) => (
              <div key={stepItem.key} className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepItem.key ? 'bg-primary text-primary-foreground' :
                  ['mapping', 'preview'].includes(step) && stepItem.key === 'upload' ? 'bg-green-100 text-green-700' :
                  step === 'preview' && stepItem.key === 'mapping' ? 'bg-green-100 text-green-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {(['mapping', 'preview'].includes(step) && stepItem.key === 'upload') ||
                   (step === 'preview' && stepItem.key === 'mapping') ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-sm ${
                  step === stepItem.key ? 'font-medium' : 'text-muted-foreground'
                }`}>
                  {stepItem.label}
                </span>
                {index < 2 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Label htmlFor="csv-file" className="text-lg font-medium cursor-pointer">
                    Select your CSV file to import wardrobe inventory
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose a CSV file with wardrobe item data. Use our template for the correct format.
                  </p>
                </div>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-4 max-w-sm mx-auto"
                />
              </div>
              
              <div className="flex justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>

              {file && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>File selected:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Found {csvData.length} data rows to process
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mapping Step */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Auto-Processing Your Wardrobe Data</h4>
                <p className="text-sm text-blue-700">
                  Your CSV will be automatically processed. No column mapping needed for your format.
                </p>
              </div>

              {headers.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">CSV Data Preview</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((header, index) => (
                          <TableHead key={index} className="text-xs">{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 10).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="text-xs max-w-24 truncate">
                              {cell || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Processing Rules:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Numeric values in first column = Dress sizes</li>
                  <li>• Named items with "necklace", "stud", "pearl" = Pearls category</li>
                  <li>• Named items with "lipstick", "lip" = Lipstick category</li>
                  <li>• Items with quantity 0 will be skipped</li>
                </ul>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h4 className="font-medium text-destructive">Processing Errors</h4>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={generatePreview}>
                  Process Data
                </Button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  Ready to import {preview.length} wardrobe items
                </h4>
                <p className="text-sm text-green-700">
                  Review the data below and click "Import Items" to add them to your wardrobe inventory.
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Sizes</TableHead>
                      <TableHead>Colors</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Condition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.category.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {item.size_available.slice(0, 3).map((size, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {size}
                              </Badge>
                            ))}
                            {item.size_available.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.size_available.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {item.color_available.slice(0, 2).map((color, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {color}
                              </Badge>
                            ))}
                            {item.color_available.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.color_available.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity_total}</TableCell>
                        <TableCell>{item.quantity_available}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.condition}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {preview.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 10 items. {preview.length - 10} more items will be imported.
                </p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? 'Importing...' : 'Import Items'}
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <h4 className="text-lg font-medium">Importing wardrobe items...</h4>
              <p className="text-sm text-muted-foreground">Please wait while we process your data.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {step === 'importing' ? 'Please wait...' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};