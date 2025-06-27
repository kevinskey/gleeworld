
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
    certification: false,
    email: '' // Add email field for non-authenticated users
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
    
    if (!formData.certification) {
      toast({
        title: "Certification Required",
        description: "You must certify the accuracy of the information under penalties of perjury.",
        variant: "destructive",
      });
      return;
    }

    // If no authenticated user, require email
    if (!user && !formData.email) {
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
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
Email: ${user?.email || formData.email}
Certified: ${formData.certification ? 'Yes' : 'No'}
      `;

      // Generate unique file path with username in title
      const userName = formData.name.replace(/[^a-zA-Z0-9]/g, '_') || 'anonymous';
      const fileName = `w9-${userName}-${user?.id || 'guest'}-${Date.now()}.txt`;
      
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
          user_id: user?.id || null,
          storage_path: fileName,
          form_data: {
            ...formData,
            email: user?.email || formData.email
          },
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

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
              <Button
                type="submit"
                disabled={loading || !formData.certification}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-medium"
              >
                {loading ? "Submitting..." : "Submit W9 Form"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
