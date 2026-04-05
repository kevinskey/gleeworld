import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileSignature, CheckCircle2, Loader2, ScrollText } from 'lucide-react';
import { jsPDF } from 'jspdf';

const TOUR_CONTRACT_ID = '99ad60d3-0e94-41b2-b4f9-1b03146c62c9';

interface TourContractSigningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TourContractSigningModal: React.FC<TourContractSigningModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the contract content
  const { data: contract } = useQuery({
    queryKey: ['tour-contract', TOUR_CONTRACT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts_v2')
        .select('id, title, content, status')
        .eq('id', TOUR_CONTRACT_ID)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Check if student already signed
  const { data: existingSignature, isLoading: checkingSignature } = useQuery({
    queryKey: ['tour-contract-signature', user?.id, TOUR_CONTRACT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tour_contract_signatures')
        .select('id, signed_at, full_name')
        .eq('contract_id', TOUR_CONTRACT_ID)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!user,
  });

  // Fetch student profile
  const { data: profile } = useQuery({
    queryKey: ['student-profile-for-signing', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('full_name, email')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!user,
  });

  const generateSignedPdf = (contractContent: string, signerName: string, signatureDataUrl: string): Blob => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize('Spelman College Glee Club Tour Participation Contract & Code of Conduct', contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 7 + 5;

    // Divider
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const cleanContent = contractContent
      .replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();

    const lines = doc.splitTextToSize(cleanContent, contentWidth);
    for (const line of lines) {
      if (y > pageHeight - margin - 10) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    }

    // Signature section
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    y += 10;
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Signature', margin, y);
    y += 8;

    // Signature image
    try {
      doc.addImage(signatureDataUrl, 'PNG', margin, y, 60, 20);
      y += 25;
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.text('[Digital Signature]', margin, y);
      y += 8;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(`Signed by: ${signerName}`, margin, y);
    y += 5;
    doc.text(`Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, y);
    doc.setTextColor(0);

    return doc.output('blob');
  };

  const handleSign = async () => {
    if (!signature || !user || !contract || !profile) return;

    setIsSubmitting(true);
    try {
      // 1. Generate signed PDF
      const pdfBlob = generateSignedPdf(contract.content, profile.full_name, signature);

      // 2. Upload PDF to storage
      const fileName = `tour-contracts/${user.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) {
        console.error('PDF upload error:', uploadError);
        // Continue even if upload fails — the signature record is most important
      }

      // 3. Save signature record
      const { error: sigError } = await supabase
        .from('tour_contract_signatures')
        .insert({
          contract_id: TOUR_CONTRACT_ID,
          user_id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          signature_data: signature,
          pdf_storage_path: fileName,
        });

      if (sigError) throw sigError;

      // 4. Save to "Student Tour Documents" folder in tour documents
      const STUDENT_TOUR_DOCS_FOLDER_ID = '6f0188aa-290b-4a18-a2a8-9d06658bd011';
      const folderId = STUDENT_TOUR_DOCS_FOLDER_ID;

      // 5. Add document to media library for tour docs page
      await supabase
        .from('gw_media_library')
        .insert({
          title: `Tour Contract - ${profile.full_name}`,
          file_url: fileName,
          file_path: fileName,
          file_type: 'application/pdf',
          file_size: pdfBlob.size,
          category: 'documents',
          folder_id: folderId,
          uploaded_by: user.id,
          is_public: false,
          is_featured: false,
          download_count: 0,
          view_count: 0,
          is_deleted: false,
          tags: ['tour-contract', 'signed', 'spring-2026'],
          description: `Signed tour participation contract for ${profile.full_name}`,
        });

      // 6. Email signed contract to student
      try {
        await supabase.functions.invoke('send-signed-contract-email', {
          body: {
            studentEmail: profile.email,
            studentName: profile.full_name,
            pdfStoragePath: fileName,
          },
        });
      } catch (emailErr) {
        console.error('Email send failed (non-blocking):', emailErr);
      }

      queryClient.invalidateQueries({ queryKey: ['tour-contract-signature'] });
      toast.success('Contract signed successfully! A copy has been sent to your email.');
      setSignature(null);
    } catch (err: any) {
      console.error('Error signing contract:', err);
      toast.error(err.message || 'Failed to sign contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6"
        style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2" style={{ color: '#000' }}>
            <ScrollText className="h-5 w-5" />
            Tour Participation Contract
          </DialogTitle>
          <DialogDescription style={{ color: '#6b7280' }}>
            Please read the contract carefully, then sign at the bottom.
          </DialogDescription>
        </DialogHeader>

        {checkingSignature ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : existingSignature ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold" style={{ color: '#000' }}>Contract Already Signed</h3>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                Signed by {existingSignature.full_name} on {new Date(existingSignature.signed_at).toLocaleDateString()}
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800">Signed ✓</Badge>
          </div>
        ) : (
          <>
            {/* Contract Content */}
            <div
              className="border rounded-lg p-4 md:p-6 max-h-[40vh] overflow-y-auto font-serif text-sm leading-relaxed"
              style={{ backgroundColor: '#fafafa', color: '#1a1a1a', borderColor: '#e5e7eb' }}
            >
              {contract?.content?.split('\n').map((line, i) => (
                <p key={i} className={line.trim() === '' ? 'h-3' : 'mb-2'} style={{ color: '#1a1a1a' }}>
                  {line}
                </p>
              ))}
            </div>

            {/* Signature Section */}
            <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" style={{ color: '#374151' }} />
                <h3 className="font-semibold" style={{ color: '#000' }}>Your Signature</h3>
              </div>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                By signing below, I acknowledge that I have read and agree to the Tour Participation Contract & Code of Conduct.
              </p>
              <div className="bg-white border-2 rounded-lg p-2" style={{ borderColor: '#d1d5db' }}>
                <SignatureCanvas
                  onSignatureChange={setSignature}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  Signing as: <strong style={{ color: '#374151' }}>{profile?.full_name || '...'}</strong>
                </p>
                <Button
                  onClick={handleSign}
                  disabled={!signature || isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <FileSignature className="h-4 w-4" />
                      Sign Contract
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
