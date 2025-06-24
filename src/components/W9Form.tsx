
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    certification: false
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a W9 form.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.certification) {
      toast({
        title: "Certification Required",
        description: "You must certify the accuracy of the information under penalties of perjury.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Create form data as text content
      const formContent = `
W9 Form Submission
Date: ${new Date().toISOString()}
Name: ${formData.name}
Business Name: ${formData.businessName}
Tax Classification: ${formData.taxClassification}
Address: ${formData.address}
City: ${formData.city}
State: ${formData.state}
ZIP Code: ${formData.zipCode}
Account Numbers: ${formData.accountNumbers}
Requester's Name: ${formData.requestersName}
Requester's Address: ${formData.requestersAddress}
TIN: ${formData.tin}
Certified: ${formData.certification ? 'Yes' : 'No'}
      `;

      // Generate unique file path
      const fileName = `w9-${user.id}-${Date.now()}.txt`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, formContent, {
          contentType: 'text/plain'
        });

      if (uploadError) {
        throw uploadError;
      }

      // Save form record to database
      const { error: dbError } = await supabase
        .from('w9_forms')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          form_data: formData,
          status: 'submitted'
        });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "W9 Form Submitted",
        description: "Your W9 form has been submitted successfully.",
      });

      if (onSuccess) {
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
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>W9 Tax Form</CardTitle>
        <CardDescription>
          Request for Taxpayer Identification Number and Certification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (if different from above)</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tin">Taxpayer Identification Number (SSN or EIN) *</Label>
              <Input
                id="tin"
                value={formData.tin}
                onChange={(e) => handleInputChange('tin', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="certification"
                checked={formData.certification}
                onCheckedChange={(checked) => handleInputChange('certification', checked as boolean)}
              />
              <Label htmlFor="certification" className="text-sm leading-relaxed">
                Under penalties of perjury, I certify that:
                <br />
                1. The number shown on this form is my correct taxpayer identification number, and
                <br />
                2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding, and
                <br />
                3. I am a U.S. citizen or other U.S. person, and
                <br />
                4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.
                <br />
                <br />
                <strong>Certification instructions:</strong> You must cross out item 2 above if you have been notified by the IRS that you are currently subject to backup withholding.
              </Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={loading || !formData.certification}
            >
              {loading ? "Submitting..." : "Submit W9 Form"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
