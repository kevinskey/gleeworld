import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Camera, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileAndGetUrl } from '@/utils/storage';

interface PDFImportForm {
  title: string;
  composer: string;
  arranger: string;
  voicing: string;
  publisher: string;
  copyrightYear: string;
  notes: string;
  physicalCopiesCount: string;
  physicalLocation: string;
  conditionNotes: string;
  purchasePrice: string;
  purchaseDate: string;
  donorName: string;
  isbnBarcode: string;
}

export const PDFImportManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMethod, setImportMethod] = useState<'file' | 'scan'>('file');
  
  const [form, setForm] = useState<PDFImportForm>({
    title: '',
    composer: '',
    arranger: '',
    voicing: '',
    publisher: '',
    copyrightYear: '',
    notes: '',
    physicalCopiesCount: '0',
    physicalLocation: '',
    conditionNotes: '',
    purchasePrice: '',
    purchaseDate: '',
    donorName: '',
    isbnBarcode: '',
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      // Auto-fill title from filename
      const fileName = file.name.replace('.pdf', '');
      setForm(prev => ({ ...prev, title: prev.title || fileName }));
    } else {
      toast({
        title: "Error",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleFormChange = (field: keyof PDFImportForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      title: '',
      composer: '',
      arranger: '',
      voicing: '',
      publisher: '',
      copyrightYear: '',
      notes: '',
      physicalCopiesCount: '0',
      physicalLocation: '',
      conditionNotes: '',
      purchasePrice: '',
      purchaseDate: '',
      donorName: '',
      isbnBarcode: '',
    });
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      let pdfUrl = null;
      if (selectedFile) {
        const uploadResult = await uploadFileAndGetUrl(selectedFile, 'sheet-music', 'pdfs');
        if (uploadResult) {
          pdfUrl = uploadResult.url;
        }
      }

      const { error } = await supabase
        .from('gw_sheet_music')
        .insert({
          title: form.title,
          composer: form.composer || null,
          arranger: form.arranger || null,
          voicing: form.voicing || null,
          publisher: form.publisher || null,
          copyright_year: form.copyrightYear ? parseInt(form.copyrightYear) : null,
          notes: form.notes || null,
          physical_copies_count: parseInt(form.physicalCopiesCount) || 0,
          physical_location: form.physicalLocation || null,
          condition_notes: form.conditionNotes || null,
          purchase_price: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
          purchase_date: form.purchaseDate || null,
          donor_name: form.donorName || null,
          isbn_barcode: form.isbnBarcode || null,
          pdf_url: pdfUrl,
          is_public: true,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Score added successfully",
      });

      resetForm();
    } catch (error) {
      console.error('Error adding score:', error);
      toast({
        title: "Error",
        description: "Failed to add score",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Method Selection */}
      <div className="flex gap-4">
        <Button
          variant={importMethod === 'file' ? 'default' : 'outline'}
          onClick={() => setImportMethod('file')}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload PDF File
        </Button>
        <Button
          variant={importMethod === 'scan' ? 'default' : 'outline'}
          onClick={() => setImportMethod('scan')}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          Scan Score
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {importMethod === 'file' ? 'PDF File Upload' : 'Score Scanning'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          {importMethod === 'file' && (
            <div>
              <Label htmlFor="pdf-file">PDF File</Label>
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                placeholder="Enter piece title"
              />
            </div>
            <div>
              <Label htmlFor="composer">Composer</Label>
              <Input
                id="composer"
                value={form.composer}
                onChange={(e) => handleFormChange('composer', e.target.value)}
                placeholder="Enter composer name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="arranger">Arranger</Label>
              <Input
                id="arranger"
                value={form.arranger}
                onChange={(e) => handleFormChange('arranger', e.target.value)}
                placeholder="Enter arranger name"
              />
            </div>
            <div>
              <Label htmlFor="voicing">Voicing</Label>
              <Select value={form.voicing} onValueChange={(value) => handleFormChange('voicing', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voicing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SATB">SATB</SelectItem>
                  <SelectItem value="SSA">SSA</SelectItem>
                  <SelectItem value="SAB">SAB</SelectItem>
                  <SelectItem value="TTB">TTB</SelectItem>
                  <SelectItem value="SSAA">SSAA</SelectItem>
                  <SelectItem value="TTBB">TTBB</SelectItem>
                  <SelectItem value="Solo">Solo</SelectItem>
                  <SelectItem value="Unison">Unison</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Publishing Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={form.publisher}
                onChange={(e) => handleFormChange('publisher', e.target.value)}
                placeholder="Enter publisher name"
              />
            </div>
            <div>
              <Label htmlFor="copyrightYear">Copyright Year</Label>
              <Input
                id="copyrightYear"
                type="number"
                value={form.copyrightYear}
                onChange={(e) => handleFormChange('copyrightYear', e.target.value)}
                placeholder="e.g., 2023"
              />
            </div>
          </div>

          {/* Physical Inventory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="physicalCopiesCount">Hard Copies Count</Label>
              <Input
                id="physicalCopiesCount"
                type="number"
                value={form.physicalCopiesCount}
                onChange={(e) => handleFormChange('physicalCopiesCount', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="physicalLocation">Library Location</Label>
              <Input
                id="physicalLocation"
                value={form.physicalLocation}
                onChange={(e) => handleFormChange('physicalLocation', e.target.value)}
                placeholder="e.g., Shelf A-3, Box 12"
              />
            </div>
            <div>
              <Label htmlFor="conditionNotes">Condition Notes</Label>
              <Input
                id="conditionNotes"
                value={form.conditionNotes}
                onChange={(e) => handleFormChange('conditionNotes', e.target.value)}
                placeholder="e.g., Good, Fair, Poor"
              />
            </div>
          </div>

          {/* Purchase Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => handleFormChange('purchasePrice', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={(e) => handleFormChange('purchaseDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="donorName">Donor Name</Label>
              <Input
                id="donorName"
                value={form.donorName}
                onChange={(e) => handleFormChange('donorName', e.target.value)}
                placeholder="If donated"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="isbnBarcode">ISBN/Barcode</Label>
              <Input
                id="isbnBarcode"
                value={form.isbnBarcode}
                onChange={(e) => handleFormChange('isbnBarcode', e.target.value)}
                placeholder="Enter ISBN or barcode"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder="Additional notes about this score..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Score"}
              <Plus className="h-4 w-4 ml-2" />
            </Button>
            <Button onClick={resetForm} variant="outline">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};