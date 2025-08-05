import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, FileText, DollarSign, Calendar, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface Receipt {
  id: string;
  vendor_name: string;
  amount: number;
  transaction_date: string;
  category: string;
  description: string;
  receipt_image_url?: string;
  receipt_pdf_url?: string;
  payment_method: string;
  tax_deductible: boolean;
  reimbursable: boolean;
  status: string;
  notes?: string;
  created_at: string;
}

export const ReceiptsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    vendor_name: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category: 'general',
    description: '',
    payment_method: 'card',
    tax_deductible: false,
    reimbursable: false,
    notes: ''
  });

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user]);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_receipts')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast({
        title: "Error",
        description: "Failed to load receipts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'receipt-photo.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const convertImageToPDF = async (imageFile: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const pdf = new jsPDF();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Calculate dimensions to fit PDF page
        const maxWidth = 180; // mm
        const maxHeight = 250; // mm
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        pdf.addImage(imgData, 'JPEG', 15, 15, canvas.width * 0.75, canvas.height * 0.75);
        
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], 'receipt.pdf', { type: 'application/pdf' });
        resolve(pdfFile);
      };
      img.src = URL.createObjectURL(imageFile);
    });
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) return;

    setIsUploading(true);

    try {
      let receiptPdfUrl = '';
      let receiptImageUrl = '';

      // If image file, convert to PDF and upload both
      if (selectedFile.type.startsWith('image/')) {
        receiptImageUrl = await uploadFile(selectedFile, 'images');
        const pdfFile = await convertImageToPDF(selectedFile);
        receiptPdfUrl = await uploadFile(pdfFile, 'pdfs');
      } else if (selectedFile.type === 'application/pdf') {
        receiptPdfUrl = await uploadFile(selectedFile, 'pdfs');
      }

      // Insert receipt record
      const { error } = await supabase
        .from('gw_receipts')
        .insert({
          vendor_name: formData.vendor_name,
          amount: parseFloat(formData.amount),
          transaction_date: formData.transaction_date,
          category: formData.category,
          description: formData.description,
          receipt_image_url: receiptImageUrl || null,
          receipt_pdf_url: receiptPdfUrl || null,
          payment_method: formData.payment_method,
          tax_deductible: formData.tax_deductible,
          reimbursable: formData.reimbursable,
          status: 'pending',
          notes: formData.notes || null,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Receipt uploaded successfully"
      });

      // Reset form
      setFormData({
        vendor_name: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        category: 'general',
        description: '',
        payment_method: 'card',
        tax_deductible: false,
        reimbursable: false,
        notes: ''
      });
      setSelectedFile(null);
      setShowUploadForm(false);
      
      // Refresh receipts
      fetchReceipts();

    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading receipts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Receipts & Records</h2>
          <p className="text-muted-foreground">
            Upload and manage your receipts and financial records
          </p>
        </div>
        <Button onClick={() => setShowUploadForm(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Receipt
        </Button>
      </div>

      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Upload Section */}
              <div className="space-y-4">
                <Label>Receipt File</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                  </div>
                )}

                {/* Camera View */}
                {isCapturing && (
                  <div className="space-y-2">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-w-md rounded border"
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={capturePhoto}>
                        Capture
                      </Button>
                      <Button type="button" variant="outline" onClick={stopCamera}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Receipt Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor_name">Vendor Name</Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="transaction_date">Date</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food & Meals</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({...formData, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.tax_deductible}
                    onChange={(e) => setFormData({...formData, tax_deductible: e.target.checked})}
                  />
                  <span>Tax Deductible</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.reimbursable}
                    onChange={(e) => setFormData({...formData, reimbursable: e.target.checked})}
                  />
                  <span>Reimbursable</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isUploading || !selectedFile}>
                  {isUploading ? 'Uploading...' : 'Upload Receipt'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Receipts List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No receipts yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your first receipt to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{receipt.vendor_name}</h4>
                      <Badge variant={receipt.status === 'approved' ? 'default' : 'secondary'}>
                        {receipt.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {receipt.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${receipt.amount.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {receipt.transaction_date}
                      </span>
                      <span>{receipt.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {receipt.receipt_pdf_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const { data } = supabase.storage
                            .from('receipts')
                            .getPublicUrl(receipt.receipt_pdf_url!);
                          window.open(data.publicUrl, '_blank');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};