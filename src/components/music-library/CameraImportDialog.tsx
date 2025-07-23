import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, FileText, X, Plus } from 'lucide-react';
import { useCameraImport } from '@/hooks/useCameraImport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CameraImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SheetMusicFormData {
  title: string;
  composer: string;
  arranger: string;
  keySignature: string;
  timeSignature: string;
  tempoMarking: string;
  difficultyLevel: string;
  voiceParts: string[];
  language: string;
  tags: string[];
  physicalCopiesCount: number;
  physicalLocation: string;
  conditionNotes: string;
  publisher: string;
  copyrightYear: string;
  isbnBarcode: string;
  purchasePrice: string;
  donorName: string;
  notes: string;
  file?: File;
}

export const CameraImportDialog = ({ open, onOpenChange, onSuccess }: CameraImportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newVoicePart, setNewVoicePart] = useState('');
  const [formMode, setFormMode] = useState<'capture' | 'details'>('capture');
  
  const [formData, setFormData] = useState<SheetMusicFormData>({
    title: '',
    composer: '',
    arranger: '',
    keySignature: '',
    timeSignature: '',
    tempoMarking: '',
    difficultyLevel: 'intermediate',
    voiceParts: [],
    language: 'English',
    tags: [],
    physicalCopiesCount: 1,
    physicalLocation: '',
    conditionNotes: '',
    publisher: '',
    copyrightYear: '',
    isbnBarcode: '',
    purchasePrice: '',
    donorName: '',
    notes: '',
  });

  const {
    isCapturing,
    isCameraReady,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    handleFileSelect,
  } = useCameraImport({
    onSuccess: (file) => {
      setFormData(prev => ({ ...prev, file }));
      setFormMode('details');
    },
    onError: (error) => {
      console.error('Camera import error:', error);
    }
  });

  const handleInputChange = (field: keyof SheetMusicFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addVoicePart = () => {
    if (newVoicePart.trim() && !formData.voiceParts.includes(newVoicePart.trim())) {
      setFormData(prev => ({
        ...prev,
        voiceParts: [...prev.voiceParts, newVoicePart.trim()]
      }));
      setNewVoicePart('');
    }
  };

  const removeVoicePart = (partToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      voiceParts: prev.voiceParts.filter(part => part !== partToRemove)
    }));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('sheet-music')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('sheet-music')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!formData.file || !formData.title || !user) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a title and captured file.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Upload file
      const fileUrl = await uploadFile(formData.file);

      // Prepare data for database
      const sheetMusicData = {
        title: formData.title,
        composer: formData.composer || null,
        arranger: formData.arranger || null,
        key_signature: formData.keySignature || null,
        time_signature: formData.timeSignature || null,
        tempo_marking: formData.tempoMarking || null,
        difficulty_level: formData.difficultyLevel,
        voice_parts: formData.voiceParts.length > 0 ? formData.voiceParts : null,
        language: formData.language,
        tags: formData.tags.length > 0 ? formData.tags : null,
        pdf_url: fileUrl,
        is_public: true,
        created_by: user.id,
        physical_copies_count: formData.physicalCopiesCount,
        physical_location: formData.physicalLocation || null,
        condition_notes: formData.conditionNotes || null,
        publisher: formData.publisher || null,
        copyright_year: formData.copyrightYear ? parseInt(formData.copyrightYear) : null,
        isbn_barcode: formData.isbnBarcode || null,
        purchase_price: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        donor_name: formData.donorName || null,
        notes: formData.notes || null,
      };

      const { error } = await supabase
        .from('gw_sheet_music')
        .insert([sheetMusicData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sheet music imported successfully with camera capture!",
      });

      // Reset form
      setFormData({
        title: '',
        composer: '',
        arranger: '',
        keySignature: '',
        timeSignature: '',
        tempoMarking: '',
        difficultyLevel: 'intermediate',
        voiceParts: [],
        language: 'English',
        tags: [],
        physicalCopiesCount: 1,
        physicalLocation: '',
        conditionNotes: '',
        publisher: '',
        copyrightYear: '',
        isbnBarcode: '',
        purchasePrice: '',
        donorName: '',
        notes: '',
      });
      setFormMode('capture');
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error('Error importing sheet music:', error);
      toast({
        title: "Error",
        description: "Failed to import sheet music. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCapture = () => {
    setFormData(prev => ({ ...prev, file: undefined }));
    setFormMode('capture');
    stopCamera();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Camera Import - Library Management
          </DialogTitle>
        </DialogHeader>

        {formMode === 'capture' ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Capture sheet music using your camera or upload a file
              </p>
            </div>

            {/* Camera Controls */}
            <div className="space-y-4">
              {!isCapturing ? (
                <div className="flex gap-4 justify-center">
                  <Button onClick={startCamera} className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Start Camera
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="file-upload"
                    />
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-64 object-cover"
                      playsInline
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  <div className="flex gap-4 justify-center">
                    <Button 
                      onClick={capturePhoto} 
                      disabled={!isCameraReady}
                      className="flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Capture Photo
                    </Button>
                    <Button onClick={stopCamera} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sheet Music Details</h3>
              <Button onClick={resetCapture} variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Recapture
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Basic Information</h4>
                
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter sheet music title"
                  />
                </div>

                <div>
                  <Label htmlFor="composer">Composer</Label>
                  <Input
                    id="composer"
                    value={formData.composer}
                    onChange={(e) => handleInputChange('composer', e.target.value)}
                    placeholder="Enter composer name"
                  />
                </div>

                <div>
                  <Label htmlFor="arranger">Arranger</Label>
                  <Input
                    id="arranger"
                    value={formData.arranger}
                    onChange={(e) => handleInputChange('arranger', e.target.value)}
                    placeholder="Enter arranger name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="keySignature">Key</Label>
                    <Input
                      id="keySignature"
                      value={formData.keySignature}
                      onChange={(e) => handleInputChange('keySignature', e.target.value)}
                      placeholder="e.g., C Major"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeSignature">Time</Label>
                    <Input
                      id="timeSignature"
                      value={formData.timeSignature}
                      onChange={(e) => handleInputChange('timeSignature', e.target.value)}
                      placeholder="e.g., 4/4"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Copy Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Physical Copy Details</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="physicalCopiesCount">Physical Copies</Label>
                    <Input
                      id="physicalCopiesCount"
                      type="number"
                      min="0"
                      value={formData.physicalCopiesCount}
                      onChange={(e) => handleInputChange('physicalCopiesCount', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="physicalLocation">Location</Label>
                    <Input
                      id="physicalLocation"
                      value={formData.physicalLocation}
                      onChange={(e) => handleInputChange('physicalLocation', e.target.value)}
                      placeholder="e.g., Shelf A-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="conditionNotes">Condition Notes</Label>
                  <Textarea
                    id="conditionNotes"
                    value={formData.conditionNotes}
                    onChange={(e) => handleInputChange('conditionNotes', e.target.value)}
                    placeholder="Describe physical condition"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    value={formData.publisher}
                    onChange={(e) => handleInputChange('publisher', e.target.value)}
                    placeholder="Publisher name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="copyrightYear">Copyright Year</Label>
                    <Input
                      id="copyrightYear"
                      type="number"
                      value={formData.copyrightYear}
                      onChange={(e) => handleInputChange('copyrightYear', e.target.value)}
                      placeholder="YYYY"
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchasePrice">Purchase Price</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Parts */}
            <div>
              <Label>Voice Parts</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newVoicePart}
                  onChange={(e) => setNewVoicePart(e.target.value)}
                  placeholder="Add voice part"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVoicePart())}
                />
                <Button onClick={addVoicePart} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.voiceParts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.voiceParts.map((part, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {part}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeVoicePart(part)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button onClick={resetCapture} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isProcessing}>
                {isProcessing ? 'Importing...' : 'Import Sheet Music'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};