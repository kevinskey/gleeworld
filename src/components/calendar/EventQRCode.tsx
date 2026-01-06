import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Download, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EventQRCodeProps {
  eventId: string;
  eventTitle: string;
  eventQrToken: string;
}

export const EventQRCode = ({ eventId, eventTitle, eventQrToken }: EventQRCodeProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const checkInUrl = `${window.location.origin}/event-checkin/${eventQrToken}`;

  useEffect(() => {
    if (open && eventQrToken) {
      generateQRCode();
    }
  }, [open, eventQrToken]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    const safeTitle = eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    link.download = `${safeTitle}-qr-code.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded",
      description: "QR code saved to your downloads",
    });
  };

  const printQRCode = () => {
    if (!qrCodeUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to print the QR code",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${eventTitle}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: system-ui, -apple-system, sans-serif;
            }
            img {
              max-width: 400px;
              width: 100%;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              text-align: center;
            }
            p {
              color: #666;
              font-size: 14px;
              margin-top: 20px;
              text-align: center;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>${eventTitle}</h1>
          <img src="${qrCodeUrl}" alt="Event Check-in QR Code" />
          <p>Scan to check in to this event</p>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="h-auto py-4 flex-col gap-2 hover:bg-secondary/80"
        >
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Event Check-in QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to check in to <strong>{eventTitle}</strong>
          </p>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Generating QR code...</div>
            </div>
          ) : qrCodeUrl ? (
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <img 
                  src={qrCodeUrl} 
                  alt="Event Check-in QR Code" 
                  className="w-64 h-64"
                />
              </div>
            </div>
          ) : null}
          
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              disabled={loading || !qrCodeUrl}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={printQRCode}
              disabled={loading || !qrCodeUrl}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            This QR code is unique to this event and can be used for attendance tracking.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
