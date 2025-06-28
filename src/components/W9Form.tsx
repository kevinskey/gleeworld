
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
    signatureDate: new Date().toISOString().split('T')[0],
    email: ''
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

  const isSignatureValid = (signature: string | null): boolean => {
    if (!signature) return false;
    
    // Check if it's not just the default empty canvas
    const emptyCanvasSignatures = [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'data:image/png;base64,',
      ''
    ];
    
    if (emptyCanvasSignatures.includes(signature)) {
      return false;
    }
    
    // Check if signature has meaningful content (basic length check)
    return signature.length > 100; // A real signature should be longer than empty canvas data
  };

  const generateW9PDF = async () => {
    console.log('Starting PDF generation...');
    
    try {
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
      
      // Embed signature if available and valid
      if (formData.signature && isSignatureValid(formData.signature)) {
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
          page.drawText('[Digital Signature Applied]', {
            x: 150,
            y: yPosition - 20,
            size: 10,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
        }
      } else {
        page.drawText('[No Signature Provided]', {
          x: 150,
          y: yPosition - 20,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.5, 0.5, 0.5),
        });
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
      
      console.log('PDF generation completed successfully');
      return await pdfDoc.save();
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== W9 FORM SUBMISSION STARTED ===');
    console.log('User authenticated:', !!user);
    console.log('User ID:', user?.id || 'NO USER ID (GUEST)');
    console.log('Form data summary:', {
      name: formData.name,
      email: formData.email || user?.email || 'NO EMAIL',
      hasSignature: !!formData.signature,
      signatureValid: isSignatureValid(formData.signature),
      certified: formData.certification
    });
    
    // Enhanced validation checks
    const requiredFields = ['name', 'address', 'city', 'state', 'zipCode', 'tin'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      console.log('VALIDATION FAILED: missing required fields:', missingFields);
      toast({
        title: "Required Fields Missing",
        description: `Please fill in the following fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (!formData.certification) {
      console.log('VALIDATION FAILED: certification not checked');
      toast({
        title: "Certification Required",
        description: "You must certify the accuracy of the information under penalties of perjury.",
        variant: "destructive",
      });
      return;
    }

    if (!isSignatureValid(formData.signature)) {
      console.log('VALIDATION FAILED: invalid or missing signature');
      toast({
        title: "Valid Signature Required",
        description: "Please provide a valid signature using the signature canvas.",
        variant: "destructive",
      });
      return;
    }

    // For guest users, email is required
    const emailToUse = user?.email || formData.email;
    if (!emailToUse) {
      console.log('VALIDATION FAILED: no email provided');
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      console.log('VALIDATION FAILED: invalid email format');
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    console.log('=== ALL VALIDATIONS PASSED ===');

    try {
      setLoading(true);
      console.log('Loading state set to true');

      // Generate PDF with embedded signature
      console.log('=== STEP 1: GENERATING PDF ===');
      const pdfBytes = await generateW9PDF();
      console.log('PDF generated successfully, size:', pdfBytes.length, 'bytes');
      
      // Generate unique file path - handle both authenticated and guest users
      const userName = formData.name.replace(/[^a-zA-Z0-9]/g, '_') || 'anonymous';
      const userId = user?.id || 'guest';
      const timestamp = Date.now();
      const fileName = `${userId}/w9-${userName}-${userId}-${timestamp}.pdf`;
      
      console.log('=== STEP 2: UPLOADING TO STORAGE ===');
      console.log('Upload path:', fileName);
      console.log('User ID for path:', userId);
      
      // Upload PDF to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('=== STORAGE UPLOAD ERROR ===');
        console.error('Upload error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError
        });
        throw new Error('Failed to upload PDF: ' + uploadError.message);
      }

      console.log('=== PDF UPLOADED SUCCESSFULLY ===');
      console.log('Upload result:', uploadData);

      // Save form record to database
      console.log('=== STEP 3: SAVING TO DATABASE ===');
      const dbPayload = {
        user_id: user?.id || null,
        storage_path: fileName,
        form_data: {
          ...formData,
          email: emailToUse,
          signatureValid: isSignatureValid(formData.signature),
          submissionType: user ? 'authenticated' : 'guest',
          submissionTimestamp: new Date().toISOString()
        },
        status: 'submitted'
      };

      console.log('=== DATABASE PAYLOAD ===');
      console.log('Payload details:', {
        user_id: dbPayload.user_id || 'NULL (GUEST USER)',
        storage_path: dbPayload.storage_path,
        status: dbPayload.status,
        form_data_keys: Object.keys(dbPayload.form_data),
        submission_type: dbPayload.form_data.submissionType
      });

      // Insert to database with detailed error handling
      console.log('=== ATTEMPTING DATABASE INSERT ===');
      const { error: dbError, data: insertedData } = await supabase
        .from('w9_forms')
        .insert(dbPayload)
        .select();

      if (dbError) {
        console.error('=== DATABASE ERROR DETAILS ===');
        console.error('Error code:', dbError.code);
        console.error('Error message:', dbError.message);
        console.error('Error details:', dbError.details);
        console.error('Error hint:', dbError.hint);
        console.error('Full error object:', dbError);
        
        // Show specific error to user
        toast({
          title: "Database Error",
          description: `Error ${dbError.code}: ${dbError.message}`,
          variant: "destructive",
        });
        
        // Provide more specific error information
        if (dbError.code === '42501') {
          console.error('RLS POLICY VIOLATION - Permission denied');
          throw new Error('Permission denied. The database policies may need to be updated. Please contact support.');
        } else if (dbError.code === '23505') {
          throw new Error('A W9 form with similar details already exists.');
        } else {
          throw new Error(`Failed to save form data: ${dbError.message} (Code: ${dbError.code})`);
        }
      }

      console.log('=== SUCCESS: FORM SAVED TO DATABASE ===');
      console.log('Inserted data:', insertedData);

      toast({
        title: "W9 Form Submitted Successfully",
        description: "Your W9 form has been submitted and saved as a PDF with your signature.",
      });

      if (onSuccess) {
        console.log('Calling onSuccess callback');
        onSuccess();
      }

    } catch (error) {
      console.error('=== SUBMISSION ERROR ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit W9 form. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('=== SUBMISSION COMPLETE - CLEANING UP ===');
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
                <Label htmlFor="name" className="text-gray-900 font-medium">Name (as shown on your income tax return) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your full legal name"
                />
              </div>

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
                    placeholder="your.email@example.com"
                  />
                </div>
              )}

              {user && (
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Email Address</Label>
                  <Input
                    value={user.email || ''}
                    disabled
                    className="bg-gray-100 border-gray-300 text-gray-700"
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
                  placeholder="Business or DBA name (optional)"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address" className="text-gray-900 font-medium">Address (number, street, and apt. or suite no.) *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="123 Main Street, Apt 4B"
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
                  placeholder="Your city"
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
                  placeholder="State abbreviation (e.g., CA)"
                  maxLength={2}
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
                  placeholder="12345 or 12345-6789"
                />
              </div>

              <div className="md:col-span-2 mt-8 mb-4">
                <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">
                  Part I - Taxpayer Identification Number (TIN)
                </h3>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="tin" className="text-gray-900 font-medium">Taxpayer Identification Number (SSN or EIN) *</Label>
                <Input
                  id="tin"
                  value={formData.tin}
                  onChange={(e) => handleInputChange('tin', e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="XXX-XX-XXXX or XX-XXXXXXX"
                />
                <p className="text-xs text-gray-600">
                  Enter your Social Security Number (SSN) or Employer Identification Number (EIN)
                </p>
              </div>
            </div>

            <div className="mt-8 mb-6">
              <h3 className="text-xl font-bold text-gray-900 border-b-2 border-gray-300 pb-2">
                Part II - Certification
              </h3>
            </div>

            <div className="space-y-4">
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

            <div className="mt-8 space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">Signature</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Label className="text-gray-900 font-medium">Sign here *</Label>
                  <p className="text-xs text-gray-600 mb-2">signature of U.S. person</p>
                  <SignatureCanvas 
                    onSignatureChange={handleSignatureChange}
                    disabled={loading}
                  />
                  {formData.signature && isSignatureValid(formData.signature) && (
                    <p className="text-xs text-green-600 mt-2">✓ Valid signature captured</p>
                  )}
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
                disabled={loading || !formData.certification || !isSignatureValid(formData.signature)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
