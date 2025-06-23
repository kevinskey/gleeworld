import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, FileText } from "lucide-react";

const w9Schema = z.object({
  name: z.string().min(1, "Name is required"),
  businessName: z.string().optional(),
  federalTaxClassification: z.enum([
    "individual",
    "c-corporation",
    "s-corporation",
    "partnership",
    "trust-estate",
    "llc",
    "other"
  ]),
  otherClassification: z.string().optional(),
  payeesAccountNumber: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "ZIP code is required"),
  requestersAccountNumber: z.string().optional(),
  taxpayerIdNumber: z.string().min(9, "Taxpayer ID number is required"),
  certificationSigned: z.boolean().refine(val => val === true, "You must sign the certification"),
});

type W9FormData = z.infer<typeof w9Schema>;

interface W9FormProps {
  onSuccess?: () => void;
}

export const W9Form = ({ onSuccess }: W9FormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<W9FormData>({
    resolver: zodResolver(w9Schema),
    defaultValues: {
      federalTaxClassification: "individual",
      certificationSigned: false,
    },
  });

  const onSubmit = async (data: W9FormData) => {
    console.log('W9 form submission started', { user: user?.id, data: Object.keys(data) });
    
    if (!user) {
      console.error('No authenticated user found during W9 submission');
      toast({
        title: "Authentication Error",
        description: "You must be logged in to submit a W9 form",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Generating W9 content...');
      // Generate PDF content as text (in a real implementation, you'd use a PDF library)
      const pdfContent = generateW9Content(data);
      
      // Create a blob from the content
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      
      // Upload to storage
      const fileName = `${user.id}/w9-form-${Date.now()}.txt`;
      console.log('Uploading W9 to storage:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('w9-forms')
        .upload(fileName, blob);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('W9 uploaded successfully, saving to database...');

      // Save form submission record
      const { error: dbError } = await supabase
        .from('w9_forms')
        .insert({
          user_id: user.id,
          storage_path: uploadData.path,
          form_data: data,
          status: 'submitted'
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      console.log('W9 form submitted successfully');

      toast({
        title: "W9 Form Submitted",
        description: "Your W9 form has been successfully submitted and saved.",
      });

      form.reset();
      onSuccess?.();

    } catch (error) {
      console.error("Error submitting W9 form:", error);
      toast({
        title: "Submission Failed",
        description: `There was an error submitting your W9 form: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Form W-9: Request for Taxpayer Identification Number
        </CardTitle>
        <CardDescription>
          Please fill out this form to provide your taxpayer identification information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (as shown on your income tax return) *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter your full name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name/disregarded entity name (if different from above)</Label>
            <Input
              id="businessName"
              {...form.register("businessName")}
              placeholder="Enter business name if applicable"
            />
          </div>

          {/* Federal Tax Classification */}
          <div className="space-y-2">
            <Label>Federal Tax Classification *</Label>
            <Select
              value={form.watch("federalTaxClassification")}
              onValueChange={(value) => form.setValue("federalTaxClassification", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual/sole proprietor or single-member LLC</SelectItem>
                <SelectItem value="c-corporation">C Corporation</SelectItem>
                <SelectItem value="s-corporation">S Corporation</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="trust-estate">Trust/estate</SelectItem>
                <SelectItem value="llc">Limited liability company</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Other Classification */}
          {form.watch("federalTaxClassification") === "other" && (
            <div className="space-y-2">
              <Label htmlFor="otherClassification">Other Classification (specify)</Label>
              <Input
                id="otherClassification"
                {...form.register("otherClassification")}
                placeholder="Specify other classification"
              />
            </div>
          )}

          {/* Address */}
          <div className="space-y-4">
            <Label>Address *</Label>
            <div className="space-y-2">
              <Input
                {...form.register("address")}
                placeholder="Street address"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Input
                  {...form.register("city")}
                  placeholder="City"
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600">{form.formState.errors.city.message}</p>
                )}
              </div>
              <div>
                <Input
                  {...form.register("state")}
                  placeholder="State"
                />
                {form.formState.errors.state && (
                  <p className="text-sm text-red-600">{form.formState.errors.state.message}</p>
                )}
              </div>
              <div>
                <Input
                  {...form.register("zipCode")}
                  placeholder="ZIP code"
                />
                {form.formState.errors.zipCode && (
                  <p className="text-sm text-red-600">{form.formState.errors.zipCode.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Account Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payeesAccountNumber">List account number(s) here (optional)</Label>
              <Input
                id="payeesAccountNumber"
                {...form.register("payeesAccountNumber")}
                placeholder="Account number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestersAccountNumber">Requester's name and address (optional)</Label>
              <Input
                id="requestersAccountNumber"
                {...form.register("requestersAccountNumber")}
                placeholder="Requester info"
              />
            </div>
          </div>

          {/* Taxpayer ID Number */}
          <div className="space-y-2">
            <Label htmlFor="taxpayerIdNumber">Taxpayer Identification Number (SSN or EIN) *</Label>
            <Input
              id="taxpayerIdNumber"
              {...form.register("taxpayerIdNumber")}
              placeholder="XXX-XX-XXXX or XX-XXXXXXX"
              maxLength={11}
            />
            {form.formState.errors.taxpayerIdNumber && (
              <p className="text-sm text-red-600">{form.formState.errors.taxpayerIdNumber.message}</p>
            )}
          </div>

          {/* Certification */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Certification</h3>
            <p className="text-sm text-gray-700">
              Under penalties of perjury, I certify that:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 ml-4">
              <li>1. The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me);</li>
              <li>2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding;</li>
              <li>3. I am a U.S. citizen or other U.S. person;</li>
              <li>4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</li>
            </ul>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="certificationSigned"
                checked={form.watch("certificationSigned")}
                onCheckedChange={(checked) => form.setValue("certificationSigned", checked as boolean)}
              />
              <Label htmlFor="certificationSigned" className="text-sm">
                I certify that the information provided above is true, correct, and complete *
              </Label>
            </div>
            {form.formState.errors.certificationSigned && (
              <p className="text-sm text-red-600">{form.formState.errors.certificationSigned.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="min-w-32">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit W9 Form"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Helper function to generate W9 content (simplified version)
function generateW9Content(data: W9FormData): string {
  return `
FORM W-9: REQUEST FOR TAXPAYER IDENTIFICATION NUMBER AND CERTIFICATION

Name: ${data.name}
Business Name: ${data.businessName || 'N/A'}
Federal Tax Classification: ${data.federalTaxClassification}
${data.otherClassification ? `Other Classification: ${data.otherClassification}` : ''}

Address: ${data.address}
City, State, ZIP: ${data.city}, ${data.state} ${data.zipCode}

Payee's Account Number: ${data.payeesAccountNumber || 'N/A'}
Requester's Account Number: ${data.requestersAccountNumber || 'N/A'}

Taxpayer Identification Number: ${data.taxpayerIdNumber}

Certification: ${data.certificationSigned ? 'SIGNED' : 'NOT SIGNED'}

Submitted on: ${new Date().toLocaleDateString()}
  `.trim();
}
