import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload, FileSpreadsheet, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const CSVImportExport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const exportToCSV = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select(`
          title, composer, arranger, voicing, physical_copies_count,
          physical_location, condition_notes, last_inventory_date,
          publisher, copyright_year, purchase_price, purchase_date,
          donor_name, isbn_barcode, notes
        `);

      if (error) throw error;

      const headers = [
        'Title',
        'Composer', 
        'Arranger',
        'Voicing',
        'Hard Copies Count',
        'Library Location',
        'Condition Notes',
        'Last Inventory Date',
        'Publisher',
        'Copyright Year',
        'Purchase Price',
        'Purchase Date',
        'Donor Name',
        'ISBN/Barcode',
        'Notes'
      ];

      const csvContent = [
        headers.join(','),
        ...data.map(row => [
          `"${row.title || ''}"`,
          `"${row.composer || ''}"`,
          `"${row.arranger || ''}"`,
          `"${row.voicing || ''}"`,
          row.physical_copies_count || 0,
          `"${row.physical_location || ''}"`,
          `"${row.condition_notes || ''}"`,
          row.last_inventory_date || '',
          `"${row.publisher || ''}"`,
          row.copyright_year || '',
          row.purchase_price || '',
          row.purchase_date || '',
          `"${row.donor_name || ''}"`,
          `"${row.isbn_barcode || ''}"`,
          `"${(row.notes || '').replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `music_library_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "CSV file exported successfully",
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvPreview(content);
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const importCSV = async () => {
    if (!csvPreview) return;

    try {
      setLoading(true);
      const lines = csvPreview.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const record: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch (header.toLowerCase()) {
            case 'title':
              record.title = value;
              break;
            case 'composer':
              record.composer = value || null;
              break;
            case 'arranger':
              record.arranger = value || null;
              break;
            case 'voicing':
              record.voicing = value || null;
              break;
            case 'hard copies count':
            case 'physical_copies_count':
              record.physical_copies_count = parseInt(value) || 0;
              break;
            case 'library location':
            case 'physical_location':
              record.physical_location = value || null;
              break;
            case 'condition notes':
            case 'condition_notes':
              record.condition_notes = value || null;
              break;
            case 'publisher':
              record.publisher = value || null;
              break;
            case 'copyright year':
            case 'copyright_year':
              record.copyright_year = value ? parseInt(value) : null;
              break;
            case 'purchase price':
            case 'purchase_price':
              record.purchase_price = value ? parseFloat(value) : null;
              break;
            case 'purchase date':
            case 'purchase_date':
              record.purchase_date = value || null;
              break;
            case 'donor name':
            case 'donor_name':
              record.donor_name = value || null;
              break;
            case 'isbn/barcode':
            case 'isbn_barcode':
              record.isbn_barcode = value || null;
              break;
            case 'notes':
              record.notes = value || null;
              break;
          }
        });

        return {
          ...record,
          is_public: true,
          created_by: user?.id,
        };
      }).filter(record => record.title);

      if (records.length === 0) {
        throw new Error('No valid records found in CSV');
      }

      const { error } = await supabase
        .from('gw_sheet_music')
        .insert(records);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully imported ${records.length} records`,
      });

      setCsvPreview('');
      setShowPreview(false);
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: "Error",
        description: "Failed to import CSV: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const csvTemplate = `Title,Composer,Arranger,Voicing,Hard Copies Count,Library Location,Condition Notes,Publisher,Copyright Year,Purchase Price,Purchase Date,Donor Name,ISBN/Barcode,Notes
"Amazing Grace","Traditional","John Smith","SATB",5,"Shelf A-1","Good condition","Music Publishers",2020,15.99,"2023-01-15","","978-1234567890","Popular hymn arrangement"
"Ave Maria","Franz Schubert","","Solo",3,"Shelf B-2","Fair condition","Classical Music Co",1995,12.50,"2022-06-20","Jane Doe","","Classic solo piece"`;

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Library to CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export all music library data including physical inventory information to a CSV file.
          </p>
          <Button onClick={exportToCSV} disabled={loading}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {loading ? 'Exporting...' : 'Export to CSV'}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import from CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Import music library data from a CSV file. The CSV should include columns for title, composer, arranger, voicing, hard copies count, and library location.
          </p>
          
          <div>
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </div>

          {showPreview && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Preview</Label>
                <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-3 w-3 mr-1" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
              <Textarea
                value={csvPreview.split('\n').slice(0, 10).join('\n')}
                readOnly
                rows={8}
                className="font-mono text-xs"
              />
              {csvPreview.split('\n').length > 10 && (
                <p className="text-xs text-muted-foreground">
                  Showing first 10 lines of {csvPreview.split('\n').length} total lines
                </p>
              )}
              <Button onClick={importCSV} disabled={loading}>
                {loading ? 'Importing...' : 'Import CSV Data'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use this template to format your CSV file correctly. Required columns are marked with *.
          </p>
          
          <div className="space-y-2">
            <Label>CSV Format Example</Label>
            <Textarea
              value={csvTemplate}
              readOnly
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Column Descriptions:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><strong>Title*:</strong> Name of the piece</li>
              <li><strong>Composer:</strong> Original composer</li>
              <li><strong>Arranger:</strong> Person who arranged the piece</li>
              <li><strong>Voicing:</strong> Voice parts (SATB, SSA, etc.)</li>
              <li><strong>Hard Copies Count:</strong> Number of physical copies</li>
              <li><strong>Library Location:</strong> Where the physical copies are stored</li>
              <li><strong>Condition Notes:</strong> Physical condition of the scores</li>
              <li><strong>Publisher:</strong> Publishing company</li>
              <li><strong>Copyright Year:</strong> Year of publication</li>
              <li><strong>Purchase Price:</strong> Cost of the score</li>
              <li><strong>Purchase Date:</strong> When it was purchased (YYYY-MM-DD)</li>
              <li><strong>Donor Name:</strong> Person who donated the score</li>
              <li><strong>ISBN/Barcode:</strong> Identification number</li>
              <li><strong>Notes:</strong> Additional information</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};