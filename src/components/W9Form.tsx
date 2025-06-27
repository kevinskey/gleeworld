import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface W9FormProps {
  onSuccess?: () => void;
}

export const W9Form = ({ onSuccess }: W9FormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    taxClassification: 'individual',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    accountNumbers: '',
    requestersName: '',
    requestersAddress: '',
    tin: '',
    certification: false,
    signature: null as string | null,
    signatureDate: new Date().toISOString().split('T')[0], // Default to today's date
    email: '' // Add email field for non-authenticated users
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log('Form field changed:', field, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSignatureChange = (signature: string | null) => {
    console.log('Signature changed:', signature ? 'signature provided' : 'signature cleared');
    setFormData(prev => ({
      ...prev,
      signature
    }));
  };

  const generateW9PDF = async () => {
    console.log('Starting PDF generation...');
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Add a page
    const page = pdfDoc.addPage([612, 792]); // 8.5" x 11" in points
    const { width, height } = page.getSize();
    
    // Title
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
    
    // Form fields
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
    
    // Certification section
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
    
    // Embed signature if available
    if (formData.signature) {
      try {
        // Convert base64 signature to image
        const signatureImage = await pdfDoc.embedPng(formData.signature);
        const signatureDims = signatureImage.scale(0.3);
        
        page.drawImage(signatureImage, {
          x: 150,
          y: yPosition - 50,
          width: signatureDims.width,
          height: signatureDims.height,
        });
      } catch (error) {
        console.error('Error embedding signature:', error);
        // Fallback to text signature
        page.drawText('[Digital Signature]', {
          x: 150,
          y: yPosition - 20,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Date
    page.drawText(`Date: ${formData.signatureDate}`, {
      x: 400,
      y: yPosition - 20,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    
    // Certification status
    yPosition -= 80;
    page.drawText(`Certified: ${formData.certification ? 'Yes' : 'No'}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    });
    
    // Generation timestamp
    yPosition -= 40;
    page.drawText(`Generated on: ${new Date().toLocaleString()}`, {
      x: 50,
      y: yPosition,
      size: 8,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    console.log('PDF generation completed');
    return await pdfDoc.save();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('W9 form submission started');
    console.log('Form data:', {
      ...formData,
      signature: formData.signature ? 'signature provided' : 'no signature'
    });
    
    // Validation checks with detailed logging
    if (!formData.certification) {
      console.log('Validation failed: certification not checked');
      toast({
        title: "Certification Required",
        description: "You must certify the accuracy of the information under penalties of perjury.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.signature) {
      console.log('Validation failed: no signature provided');
      toast({
        title: "Signature Required",
        description: "Please provide your signature.",
        variant: "destructive",
      });
      return;
    }

    // If no authenticated user, require email
    if (!user && !formData.email) {
      console.log('Validation failed: no email provided for guest user');
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
        variant: "destructive",
      });
      return;
    }

    console.log('All validations passed, proceeding with submission');

    try {
      setLoading(true);
      console.log('Loading state set to true');

      // Generate PDF with embedded signature
      console.log('Generating PDF...');
      const pdfBytes = await generateW9PDF();
      console.log('PDF generated successfully, size:', pdfBytes.length, 'bytes');
      
      // Generate unique file path with proper folder structure for RLS
      const userName = formData.name.replace(/[^a-zA-Z0-9]/g, '_') || 'anonymous';
      const userId = user?.id || 'guest';
      const timestamp = Date.now();
      const fileName = `${userId}/w9-${userName}-${userId}-${timestamp}.pdf`;
      
      console.log('Uploading PDF to storage with path:', fileName);
      
      // Upload PDF to storage
      const { error: uploadError } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('PDF uploaded successfully, saving to database...');

      // Save form record to database
      const { error: dbError } = await supabase
        .from('w9_forms')
        .insert({
          user_id: user?.id || null,
          storage_path: fileName,
          form_data: {
            ...formData,
            email: user?.email || formData.email
          },
          status: 'submitted'
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('W9 form saved to database successfully');

      toast({
        title: "W9 Form Submitted",
        description: "Your W9 form has been submitted successfully as a PDF.",
      });

      if (onSuccess) {
        console.log('Calling onSuccess callback');
        onSuccess();
      }

    } catch (error) {
      console.error('Error submitting W9 form:', error);
      toast({
        title: "Error",
        description: "Failed to submit W9 form. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('Setting loading state to false');
      setLoading(false);
    }
  };

  return (
    <div className="w9-form-container">
      <Card className="max-w-4xl mx-auto bg-white text-gray-900 border border-gray-300">
        <CardHeader className="bg-white border-b border-gray-200">
          <CardTitle className="text-gray-900 text-2xl font-bold">W9 Tax Form</CardTitle>
          <CardDescription className="text-gray-700">
            Request for Taxpayer Identification Number and Certification
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-900 font-medium">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Show email field only if user is not authenticated */}
              {!user && (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900 font-medium">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-gray-900 font-medium">Business Name (if different from above)</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address" className="text-gray-900 font-medium">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-gray-900 font-medium">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-gray-900 font-medium">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-gray-900 font-medium">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Part 1 Header */}
              <div className="md:col-span-2 mt-8 mb-4">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">
                  Part I - Taxpayer Identification Number (TIN)
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tin" className="text-gray-900 font-medium">Taxpayer Identification Number (SSN or EIN) *</Label>
                <Input
                  id="tin"
                  value={formData.tin}
                  onChange={(e) => handleInputChange('tin', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Part 2 Header */}
            <div className="mt-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">
                Part II - Certification
              </h3>
            </div>

            <div className="space-y-4">
              {/* Main Certification */}
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Checkbox
                  id="certification"
                  checked={formData.certification}
                  onCheckedChange={(checked) => handleInputChange('certification', checked as boolean)}
                  className="mt-1 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label htmlFor="certification" className="text-sm leading-relaxed text-gray-900 cursor-pointer">
                  <strong className="block mb-2">Under penalties of perjury, I certify that:</strong>
                  <div className="space-y-1 text-gray-800">
                    <div>1. The number shown on this form is my correct taxpayer identification number, and</div>
                    <div>2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding, and</div>
                    <div>3. I am a U.S. citizen or other U.S. person, and</div>
                    <div>4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</div>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-gray-800">
                    <strong>Certification instructions:</strong> You must cross out item 2 above if you have been notified by the IRS that you are currently subject to backup withholding.
                  </div>
                </Label>
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-8 space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">Signature</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Label className="text-gray-900 font-medium">Sign here</Label>
                  <p className="text-xs text-gray-600 mb-2">signature of U.S. person</p>
                  <SignatureCanvas 
                    onSignatureChange={handleSignatureChange}
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signatureDate" className="text-gray-900 font-medium">Date *</Label>
                  <Input
                    id="signatureDate"
                    type="date"
                    value={formData.signatureDate}
                    onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
              <Button
                type="submit"
                disabled={loading || !formData.certification || !formData.signature}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-medium"
                onClick={() => console.log('Submit button clicked - form state:', {
                  certification: formData.certification,
                  signature: formData.signature ? 'provided' : 'missing',
                  loading
                })}
              >
                {loading ? "Generating PDF..." : "Submit W9 Form"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
