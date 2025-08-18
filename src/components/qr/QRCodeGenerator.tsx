import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Copy, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  defaultText?: string;
  title?: string;
}

export const QRCodeGenerator = ({ 
  defaultText = window.location.origin, 
  title = "QR Code Generator" 
}: QRCodeGeneratorProps) => {
  const [text, setText] = useState(defaultText);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateQRCode = async (inputText: string) => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(inputText, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
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

  useEffect(() => {
    generateQRCode(text);
  }, [text]);

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = 'gleeworld-qr-code.png';
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded",
      description: "QR code saved to your downloads",
    });
  };

  const copyQRCode = async () => {
    if (!qrCodeUrl) return;
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      toast({
        title: "Copied",
        description: "QR code copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying QR code:', error);
      toast({
        title: "Error",
        description: "Failed to copy QR code",
        variant: "destructive",
      });
    }
  };

  const shareQRCode = async () => {
    if (!navigator.share || !qrCodeUrl) return;
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], 'gleeworld-qr-code.png', { type: 'image/png' });
      
      await navigator.share({
        title: 'GleeWorld QR Code',
        text: 'Scan this QR code to visit GleeWorld',
        files: [file]
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      toast({
        title: "Error",
        description: "Failed to share QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qr-text">Text or URL to encode</Label>
          <Input
            id="qr-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text or URL"
          />
        </div>
        
        {qrCodeUrl && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <img 
                  src={qrCodeUrl} 
                  alt="Generated QR Code" 
                  className="w-64 h-64"
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQRCode}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={copyQRCode}
                disabled={loading}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              
              {navigator.share && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareQRCode}
                  disabled={loading}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="text-center text-muted-foreground">
            Generating QR code...
          </div>
        )}
      </CardContent>
    </Card>
  );
};