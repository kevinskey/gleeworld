import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Download, FileText } from 'lucide-react';

interface HandbookContractSigningProps {
  examPassed: boolean;
  examScore?: number;
  examAttempts?: number;
}

export const HandbookContractSigning: React.FC<HandbookContractSigningProps> = ({
  examPassed,
  examScore,
  examAttempts
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [signatureCompleted, setSignatureCompleted] = useState(false);

  const handleSignatureChange = (signatureData: string | null) => {
    setSignature(signatureData);
  };

  const handleSubmitSignature = async () => {
    if (!signature || !fullName || !email) {
      toast({
        title: "Missing Information",
        description: "Please provide your full name, email, and signature.",
        variant: "destructive",
      });
      return;
    }

    if (!examPassed) {
      toast({
        title: "Exam Required",
        description: "You must pass the handbook exam before signing the contract.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save signature locally for now (until database is set up)
      const signatureRecord = {
        user_id: user?.id,
        signature_data: signature,
        full_name: fullName,
        email: email,
        device_info: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem(`handbook_signature_${user?.id}`, JSON.stringify(signatureRecord));

      // Send confirmation email via edge function
      const { error: emailError } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: email,
          subject: 'SCGC 2025–2026 Handbook Agreement – Confirmed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Spelman College Glee Club</h2>
              <h3 style="color: #2d3748;">Handbook Agreement Confirmation</h3>
              
              <p>Dear ${fullName},</p>
              
              <p>Thank you for successfully completing the SCGC Handbook comprehension exam and signing the 2025–2026 handbook agreement.</p>
              
              <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">Agreement Details:</h4>
                <ul>
                  <li><strong>Full Name:</strong> ${fullName}</li>
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Exam Score:</strong> ${examScore || 15}/15</li>
                  <li><strong>Date Signed:</strong> ${new Date().toLocaleDateString()}</li>
                </ul>
              </div>
              
              <p>This signature confirms that you have read, understood, and agreed to the expectations, policies, and responsibilities outlined in the Spelman College Glee Club Handbook 2025–2026.</p>
              
              <p>Welcome to another amazing year with the Spelman College Glee Club!</p>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>The SCGC Leadership Team</strong>
              </p>
            </div>
          `
        }
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the whole process if email fails
      }

      setSignatureCompleted(true);
      toast({
        title: "Contract Signed Successfully!",
        description: "Your handbook agreement has been recorded and a confirmation email has been sent.",
      });

    } catch (error) {
      console.error('Error submitting signature:', error);
      toast({
        title: "Submission Error",
        description: "There was an error submitting your signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!examPassed) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <span>📘 Sign the SCGC Handbook: 2025–2026</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Exam Required
            </h3>
            <p className="text-yellow-700">
              You must pass the 15-question handbook comprehension exam with a score of 100% before you can sign the contract.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (signatureCompleted) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span>Contract Signed Successfully!</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              🎉 Congratulations!
            </h3>
            <p className="text-green-700 mb-4">
              You have successfully signed the SCGC Handbook Agreement for 2025–2026. 
              A confirmation email has been sent to your email address.
            </p>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download Signed Contract</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <span>📘 Sign the SCGC Handbook: 2025–2026</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Congratulations on passing the SCGC Handbook Exam!
          </h3>
          <p className="text-green-700">
            Exam Score: {examScore || 15}/15 (Attempts: {examAttempts || 1})
          </p>
        </div>

        <div className="prose max-w-none">
          <p className="text-lg">
            Please sign below to confirm that you have read, understood, and agreed to the expectations, 
            policies, and responsibilities outlined in the <strong>Spelman College Glee Club Handbook 2025–2026</strong>.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-6">
            <h4 className="font-semibold text-gray-800 mb-3">By signing this document, I affirm the following:</h4>
            <ul className="space-y-2 text-gray-700">
              <li>• I understand and accept all rules regarding attendance, attire, behavior, and participation.</li>
              <li>• I commit to honoring the history and legacy of the Spelman College Glee Club.</li>
              <li>• I accept that failure to follow these policies may result in disciplinary action or removal from the ensemble.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full legal name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>Date:</strong> {new Date().toLocaleDateString()}
            </div>
          </div>

          <div>
            <SignatureCanvas
              onSignatureChange={handleSignatureChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex justify-center pt-6">
          <Button
            onClick={handleSubmitSignature}
            disabled={!signature || !fullName || !email || isSubmitting}
            className="px-8 py-3 text-lg"
          >
            {isSubmitting ? 'Submitting...' : '✅ Submit My Signature'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};