import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContractViewerContent } from "./ResponsiveContractViewerContent";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface ContractViewerProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800";
    case "pending_admin_signature": return "bg-yellow-100 text-yellow-800";
    case "pending_recipient": return "bg-orange-100 text-orange-800";
    case "pending_sender": return "bg-red-100 text-red-800";
    case "draft": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "completed": return "Completed";
    case "pending_admin_signature": return "Pending Admin Signature";
    case "pending_recipient": return "Pending Recipient";
    case "pending_sender": return "Pending Your Signature";
    case "draft": return "Draft";
    default: return "Unknown";
  }
};

export const ContractViewer = ({ contract, open, onOpenChange }: ContractViewerProps) => {
  const [enhancedContract, setEnhancedContract] = useState<Contract | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generatePdf = async () => {
    if (!enhancedContract) return;
    
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(enhancedContract.title, contentWidth);
      doc.text(titleLines, margin, yPosition);
      yPosition += (titleLines.length * 8) + 5;
      
      // Add status and date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Status: ${getStatusText(enhancedContract.status)} | Created: ${new Date(enhancedContract.created_at).toLocaleDateString()}`, margin, yPosition);
      yPosition += 10;
      doc.setTextColor(0);
      
      // Add horizontal line
      doc.setDrawColor(200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Process content - remove embedded signatures markers for clean text
      let cleanContent = enhancedContract.content
        .replace(/\[EMBEDDED_SIGNATURES\].*?\[\/EMBEDDED_SIGNATURES\]/gs, '')
        .replace(/\[SIGNATURE_FIELD:\d+\]/g, '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
        .trim();
      
      // Add content
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const lines = doc.splitTextToSize(cleanContent, contentWidth);
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > pageHeight - margin - 10) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(lines[i], margin, yPosition);
        yPosition += 5;
      }
      
      // Add signatures section if completed
      if (enhancedContract.status === 'completed') {
        const signatureMatch = enhancedContract.content.match(/\[EMBEDDED_SIGNATURES\](.*?)\[\/EMBEDDED_SIGNATURES\]/s);
        if (signatureMatch) {
          try {
            const signatures = JSON.parse(signatureMatch[1]);
            if (signatures.length > 0) {
              // Add new page for signatures if needed
              if (yPosition > pageHeight - 80) {
                doc.addPage();
                yPosition = margin;
              }
              
              yPosition += 10;
              doc.setDrawColor(200);
              doc.line(margin, yPosition, pageWidth - margin, yPosition);
              yPosition += 10;
              
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Signatures', margin, yPosition);
              yPosition += 10;
              
              for (const sig of signatures) {
                if (yPosition > pageHeight - 50) {
                  doc.addPage();
                  yPosition = margin;
                }
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                const signerLabel = sig.signerType === 'admin' ? 'Admin Signature' : 'Artist Signature';
                doc.text(signerLabel, margin, yPosition);
                yPosition += 5;
                
                // Add signature image if it's base64
                if (sig.signatureData && sig.signatureData.startsWith('data:image')) {
                  try {
                    doc.addImage(sig.signatureData, 'PNG', margin, yPosition, 50, 15);
                    yPosition += 20;
                  } catch (imgError) {
                    console.error('Error adding signature image:', imgError);
                    doc.setFont('helvetica', 'italic');
                    doc.text('[Digital Signature]', margin, yPosition);
                    yPosition += 5;
                  }
                } else {
                  doc.setFont('helvetica', 'italic');
                  doc.text(sig.signatureData || '[Digital Signature]', margin, yPosition);
                  yPosition += 5;
                }
                
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100);
                doc.text(`Signed: ${sig.dateSigned} | ${new Date(sig.timestamp).toLocaleString()}`, margin, yPosition);
                doc.setTextColor(0);
                yPosition += 15;
              }
            }
          } catch (e) {
            console.error('Error parsing signatures for PDF:', e);
          }
        }
      }
      
      // Save the PDF
      const fileName = `${enhancedContract.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(fileName);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const fetchSignatureData = async () => {
      if (!contract || !open) {
        setEnhancedContract(contract);
        return;
      }

      // For draft contracts, just use the contract as-is without trying to fetch signature data
      if (contract.status === 'draft') {
        console.log('Contract is draft, displaying as-is:', contract.title);
        setEnhancedContract(contract);
        return;
      }

      // If contract is completed, try to fetch embedded signatures from signature record
      if (contract.status === 'completed') {
        try {
          const { data: signatureRecord, error } = await supabase
            .from('contract_signatures_v2')
            .select('embedded_signatures')
            .eq('contract_id', contract.id)
            .eq('status', 'completed')
            .maybeSingle();

          if (!error && signatureRecord?.embedded_signatures) {
            console.log('Found signature record with embedded signatures:', signatureRecord.embedded_signatures);
            
            // Check if contract content already has embedded signatures
            const hasEmbeddedSignatures = contract.content.includes('[EMBEDDED_SIGNATURES]');
            
            if (!hasEmbeddedSignatures) {
              console.log('Adding embedded signatures to contract content for viewing');
              // Add embedded signatures to contract content for display
              let signaturesData = signatureRecord.embedded_signatures;
              
              // Handle both string and object formats
              let signaturesString;
              if (typeof signaturesData === 'string') {
                // If it's already a string, try to parse it to validate, then use as-is
                try {
                  JSON.parse(signaturesData);
                  signaturesString = signaturesData;
                } catch {
                  // If parsing fails, it might be raw JSON, wrap it
                  signaturesString = signaturesData;
                }
              } else {
                // If it's an object, stringify it
                signaturesString = JSON.stringify(signaturesData);
              }
              
              const signaturesSection = `\n\n[EMBEDDED_SIGNATURES]${signaturesString}[/EMBEDDED_SIGNATURES]`;
              const enhancedContent = contract.content + signaturesSection;
              
              console.log('Enhanced contract content with signatures, length:', enhancedContent.length);
              
              setEnhancedContract({
                ...contract,
                content: enhancedContent
              });
              return;
            } else {
              console.log('Contract already has embedded signatures in content');
            }
          } else {
            console.log('No signature record found or no embedded signatures');
          }
        } catch (error) {
          console.error('Error fetching signature data for contract viewer:', error);
        }
      }

      setEnhancedContract(contract);
    };

    fetchSignatureData();
  }, [contract, open]);

  if (!enhancedContract) return null;

  console.log('ContractViewer rendering contract:', {
    title: enhancedContract.title,
    status: enhancedContract.status,
    contentLength: enhancedContract.content?.length || 0,
    hasEmbeddedSignatures: enhancedContract.content?.includes('[EMBEDDED_SIGNATURES]') || false
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-5xl max-h-[95vh] overflow-y-auto p-2 md:p-6"
        style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }}
      >
        <DialogHeader className="px-4 md:px-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold flex-1" style={{ color: '#000000' }}>{enhancedContract.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generatePdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Badge className={getStatusColor(enhancedContract.status)}>
                {getStatusText(enhancedContract.status)}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-sm md:text-base" style={{ color: '#4b5563' }}>
            Created: {new Date(enhancedContract.created_at).toLocaleDateString()}
            {enhancedContract.updated_at && enhancedContract.updated_at !== enhancedContract.created_at && (
              <span className="ml-2 md:ml-4">
                • Updated: {new Date(enhancedContract.updated_at).toLocaleDateString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4" style={{ backgroundColor: '#ffffff' }}>
          <ResponsiveContractViewerContent contract={enhancedContract} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
