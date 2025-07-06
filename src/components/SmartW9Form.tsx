import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { W9CameraCapture } from "@/components/library/W9CameraCapture";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Camera, FileText, Loader2 } from "lucide-react";

interface SmartW9FormProps {
  onSuccess?: () => void;
  initialData?: {
    name?: string;
    businessName?: string;
    taxClassification?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    ssn?: string;
    ein?: string;
  };
}

export const SmartW9Form = ({ onSuccess, initialData }: SmartW9FormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    businessName: initialData?.businessName || '',
    taxClassification: initialData?.taxClassification || 'individual',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    accountNumbers: '',
    requestersName: '',
    requestersAddress: '',
    tin: initialData?.ssn || initialData?.ein || '',
    certification: false,
    signature: null as string | null,
    signatureDate: new Date().toISOString().split('T')[0],
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [extractingData, setExtractingData] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name || prev.name,
        businessName: initialData.businessName || prev.businessName,
        taxClassification: initialData.taxClassification || prev.taxClassification,
        address: initialData.address || prev.address,
        city: initialData.city || prev.city,
        state: initialData.state || prev.state,
        zipCode: initialData.zipCode || prev.zipCode,
        tin: initialData.ssn || initialData.ein || prev.tin,
      }));
    }
  }, [initialData]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSignatureChange = (signature: string | null) => {
    setFormData(prev => ({
      ...prev,
      signature
    }));
  };

  const isSignatureValid = (signature: string | null): boolean => {
    if (!signature) return false;
    
    const emptyCanvasSignatures = [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'data:image/png;base64,',
      ''
    ];
    
    if (emptyCanvasSignatures.includes(signature)) {
      return false;
    }
    
    return signature.length > 100;
  };

  const extractDataFromImage = async (imageFile: File) => {
    setExtractingData(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });

      // Call OCR service
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('w9-ocr-extract', {
        body: { imageBase64: base64 }
      });

      if (ocrError) {
        throw new Error('Failed to extract data from image');
      }

      // Populate form with extracted data
      if (ocrData.extractedData) {
        const extractedData = ocrData.extractedData;
        setFormData(prev => ({
          ...prev,
          name: extractedData.name || prev.name,
          businessName: extractedData.businessName || prev.businessName,
          taxClassification: extractedData.taxClassification || prev.taxClassification,
          address: extractedData.address || prev.address,
          city: extractedData.city || prev.city,
          state: extractedData.state || prev.state,
          zipCode: extractedData.zipCode || prev.zipCode,
          tin: extractedData.ssn || extractedData.ein || prev.tin,
        }));

        toast({
          title: "Data Extracted Successfully",
          description: `W9 form data has been automatically populated${extractedData.name ? ` for ${extractedData.name}` : ''}. Please review and complete any missing fields.`,
        });
      }
    } catch (error) {
      console.error('OCR extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: "Could not extract data from the image. Please fill out the form manually.",
        variant: "destructive",
      });
    } finally {
      setExtractingData(false);
    }
  };

  const generateW9PDF = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage([612, 792]);
      const { width, height } = page.getSize();
      
      page.drawText('Form W-9', {
        x: 50,
        y: height - 50,
        size: 18,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Request for Taxpayer Identification Number and Certification', {
        x: 50,
        y: height - 75,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
      
      let yPosition = height - 120;
      const lineHeight = 25;
      
      const fields = [
        { label: 'Name:', value: formData.name },
        { label: 'Business Name:', value: formData.businessName || 'N/A' },
        { label: 'Address:', value: formData.address },
        { label: 'City:', value: formData.city },
        { label: 'State:', value: formData.state },
        { label: 'ZIP Code:', value: formData.zipCode },
        { label: 'Taxpayer ID Number:', value: formData.tin },
        { label: 'Email:', value: user?.email || formData.email },
      ];
      
      fields.forEach(field => {
        page.drawText(field.label, {
          x: 50,
          y: yPosition,
          size: 10,
          font: timesRomanBoldFont,
          color: rgb(0, 0, 0),
        });
        
        page.drawText(field.value, {
          x: 150,
          y: yPosition,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= lineHeight;
      });
      
      // Add certification and signature sections
      yPosition -= 20;
      page.drawText('Certification:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 20;
      const certificationText = `Under penalties of perjury, I certify that:
1. The number shown on this form is my correct taxpayer identification number, and
2. I am not subject to backup withholding, and
3. I am a U.S. citizen or other U.S. person, and
4. The FATCA code(s) entered on this form (if any) is correct.`;
      
      const certificationLines = certificationText.split('\n');
      certificationLines.forEach(line => {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 9,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      });
      
      // Signature section
      yPosition -= 30;
      page.drawText('Signature:', {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      });
      
      if (formData.signature && isSignatureValid(formData.signature)) {
        try {
          const signatureImage = await pdfDoc.embedPng(formData.signature);
          const signatureDims = signatureImage.scale(0.3);
          
          page.drawImage(signatureImage, {
            x: 150,
            y: yPosition - 50,
            width: signatureDims.width,
            height: signatureDims.height,
          });
        } catch (error) {
          page.drawText('[Digital Signature Applied]', {
            x: 150,
            y: yPosition - 20,
            size: 10,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
        }
      }
      
      page.drawText(`Date: ${formData.signatureDate}`, {
        x: 400,
        y: yPosition - 20,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
      
      return await pdfDoc.save();
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = ['name', 'address', 'city', 'state', 'zipCode', 'tin'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (!formData.certification) {
      toast({
        title: "Certification Required",
        description: "You must certify the accuracy of the information.",
        variant: "destructive",
      });
      return;
    }

    if (!isSignatureValid(formData.signature)) {
      toast({
        title: "Valid Signature Required",
        description: "Please provide a valid signature.",
        variant: "destructive",
      });
      return;
    }

    const emailToUse = user?.email || formData.email;
    if (!emailToUse) {
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const pdfBytes = await generateW9PDF();
      
      const userName = formData.name.replace(/[^a-zA-Z0-9]/g, '_') || 'anonymous';
      const userId = user?.id || 'guest';
      const timestamp = Date.now();
      const fileName = `${userId}/w9-${userName}-${userId}-${timestamp}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf'
        });

      if (uploadError) {
        throw new Error('Failed to upload PDF: ' + uploadError.message);
      }
      
      const { error: dbError } = await supabase
        .from('w9_forms')
        .insert({
          user_id: user?.id || null,
          storage_path: fileName,
          form_data: {
            ...formData,
            email: emailToUse,
            submissionType: user ? 'authenticated' : 'guest',
            submissionTimestamp: new Date().toISOString(),
            ocrProcessed: !!initialData
          },
          status: 'submitted'
        });

      if (dbError) {
        throw new Error(`Database insertion failed: ${dbError.message}`);
      }

      toast({
        title: "W9 Form Submitted Successfully",
        description: "Your W9 form has been submitted and saved.",
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit W9 form.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="smart-w9-form-container">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Smart W9 Tax Form
          </CardTitle>
          <CardDescription>
            Request for Taxpayer Identification Number and Certification - with OCR support
          </CardDescription>
          <div className="flex gap-2 mt-4">
            <W9CameraCapture />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) extractDataFromImage(file);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={extractingData}
              />
              <Button variant="outline" disabled={extractingData} className="w-full">
                {extractingData ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting Data...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Upload & Extract Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name (as shown on your income tax return) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  placeholder="Enter your full legal name"
                />
              </div>

              {!user && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name (if different from above)</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="Business or organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxClassification">Tax Classification</Label>
                <Select value={formData.taxClassification} onValueChange={(value) => handleInputChange('taxClassification', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual/sole proprietor</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="trust">Trust/estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address (number, street, and apt. or suite no.) *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                  placeholder="City"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    required
                    placeholder="State"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    required
                    placeholder="ZIP Code"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tin">Taxpayer Identification Number (SSN or EIN) *</Label>
                <Input
                  id="tin"
                  value={formData.tin}
                  onChange={(e) => handleInputChange('tin', e.target.value)}
                  required
                  placeholder="XXX-XX-XXXX or XX-XXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="certification"
                  checked={formData.certification}
                  onCheckedChange={(checked) => handleInputChange('certification', checked === true)}
                />
                <Label htmlFor="certification" className="text-sm">
                  Under penalties of perjury, I certify that the number shown on this form is my correct taxpayer identification number, I am not subject to backup withholding, I am a U.S. citizen or other U.S. person, and the FATCA code(s) entered on this form (if any) is correct.
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Signature *</Label>
                <SignatureCanvas
                  onSignatureChange={handleSignatureChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signatureDate">Date</Label>
                <Input
                  id="signatureDate"
                  type="date"
                  value={formData.signatureDate}
                  onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit W9 Form'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};