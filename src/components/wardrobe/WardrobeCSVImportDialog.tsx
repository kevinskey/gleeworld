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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      const parsedHeaders = parseCSVLine(lines[0]);
      const parsedData = lines.slice(1).map(line => parseCSVLine(line));
      
      setHeaders(parsedHeaders);
      setCsvData(parsedData);
      setStep('mapping');
    };
    reader.readAsText(uploadedFile);
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
    const errors: string[] = [];
    const previewData: CSVRecord[] = [];

    // Check if required fields are mapped
    requiredFields.forEach(field => {
      if (!mapping[field as keyof ImportMapping]) {
        errors.push(`Required field "${field}" is not mapped`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    csvData.forEach((row, index) => {
      try {
        const categoryIndex = headers.indexOf(mapping.category);
        const itemNameIndex = headers.indexOf(mapping.item_name);
        const sizesIndex = mapping.sizes ? headers.indexOf(mapping.sizes) : -1;
        const colorsIndex = mapping.colors ? headers.indexOf(mapping.colors) : -1;
        const quantityTotalIndex = headers.indexOf(mapping.quantity_total);
        const quantityAvailableIndex = headers.indexOf(mapping.quantity_available);
        const conditionIndex = mapping.condition ? headers.indexOf(mapping.condition) : -1;
        const lowStockIndex = mapping.low_stock_threshold ? headers.indexOf(mapping.low_stock_threshold) : -1;
        const notesIndex = mapping.notes ? headers.indexOf(mapping.notes) : -1;

        const category = row[categoryIndex]?.toLowerCase();
        if (!categories.includes(category)) {
          errors.push(`Row ${index + 2}: Invalid category "${category}". Must be one of: ${categories.join(', ')}`);
          return;
        }

        const itemName = row[itemNameIndex];
        if (!itemName) {
          errors.push(`Row ${index + 2}: Item name is required`);
          return;
        }

        const quantityTotal = parseInt(row[quantityTotalIndex]);
        const quantityAvailable = parseInt(row[quantityAvailableIndex]);
        if (isNaN(quantityTotal) || isNaN(quantityAvailable)) {
          errors.push(`Row ${index + 2}: Quantities must be valid numbers`);
          return;
        }

        if (quantityAvailable > quantityTotal) {
          errors.push(`Row ${index + 2}: Available quantity cannot exceed total quantity`);
          return;
        }

        const condition = conditionIndex >= 0 ? row[conditionIndex]?.toLowerCase() : 'good';
        if (condition && !conditions.includes(condition)) {
          errors.push(`Row ${index + 2}: Invalid condition "${condition}". Must be one of: ${conditions.join(', ')}`);
          return;
        }

        const record: CSVRecord = {
          category,
          item_name: itemName,
          size_available: sizesIndex >= 0 && row[sizesIndex] 
            ? row[sizesIndex].split(',').map(s => s.trim()).filter(Boolean)
            : [],
          color_available: colorsIndex >= 0 && row[colorsIndex]
            ? row[colorsIndex].split(',').map(c => c.trim()).filter(Boolean)
            : [],
          quantity_total: quantityTotal,
          quantity_available: quantityAvailable,
          condition: condition || 'good',
          low_stock_threshold: lowStockIndex >= 0 ? parseInt(row[lowStockIndex]) || 5 : 5,
          notes: notesIndex >= 0 ? row[notesIndex] || '' : ''
        };

        previewData.push(record);
      } catch (error) {
        errors.push(`Row ${index + 2}: Error processing row - ${error}`);
      }
    });

    setValidationErrors(errors);
    if (errors.length === 0) {
      setPreview(previewData);
      setStep('preview');
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    try {
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
    } catch (error) {
      console.error('Import error:', error);
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
  };

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
                <h4 className="font-medium text-blue-900 mb-2">Map CSV columns to wardrobe fields</h4>
                <p className="text-sm text-blue-700">
                  Match your CSV columns to the appropriate wardrobe inventory fields. Required fields are marked with *.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(mapping).map(([field, value]) => (
                  <div key={field}>
                    <Label className="text-sm font-medium">
                      {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {requiredFields.includes(field) && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select value={value} onValueChange={(val) => handleColumnMapping(field as keyof ImportMapping, val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Skip this field --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={index} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h4 className="font-medium text-destructive">Validation Errors</h4>
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
                  Generate Preview
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