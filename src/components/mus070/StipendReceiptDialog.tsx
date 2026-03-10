import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, DollarSign, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StipendReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StipendReceiptDialog = ({ open, onOpenChange }: StipendReceiptDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const fullName = user?.user_metadata?.full_name || 'Member';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.nativeEvent.offsetX) * scaleX, y: (e.nativeEvent.offsetY) * scaleY };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  }, [isDrawing, getPos]);

  const stopDraw = useCallback(() => setIsDrawing(false), []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSigned(false);
  };

  // Initialize canvas size
  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!hasSigned || !canvasRef.current) {
      toast({ title: 'Signature Required', description: 'Please sign above before submitting.', variant: 'destructive' });
      return;
    }

    setSigning(true);
    try {
      const signatureData = canvasRef.current.toDataURL('image/png');

      const { data: contractData, error } = await supabase
        .from('contracts_v2')
        .insert({
          title: `Stipend Receipt - ${fullName}`,
          content: `I, ${fullName}, hereby acknowledge receipt of my $100 stipend from the Spelman College Glee Club. Date: ${today}`,
          status: 'completed',
          created_by: user?.id,
          stipend_amount: 100,
          is_template: false,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (contractData) {
        await supabase.from('contract_signatures_v2').insert({
          contract_id: contractData.id,
          artist_signature_data: signatureData,
          artist_signed_at: new Date().toISOString(),
          status: 'completed',
        });
      }

      setSigned(true);
      toast({ title: 'Stipend Receipt Signed', description: 'Your $100 stipend receipt has been recorded.' });
    } catch (error) {
      console.error('Error signing stipend receipt:', error);
      toast({ title: 'Error', description: 'Failed to submit stipend receipt. Please try again.', variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSigned(false);
      setHasSigned(false);
      handleClear();
    }, 300);
  };

  if (signed) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold">Receipt Signed!</h3>
            <p className="text-sm text-muted-foreground">Your $100 stipend receipt has been successfully recorded.</p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Stipend Receipt Acknowledgment
          </DialogTitle>
          <DialogDescription>Sign below to confirm you received your stipend.</DialogDescription>
        </DialogHeader>

        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-medium">{fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount:</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">$100.00</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{today}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">Spelman College Glee Club</span>
              </div>
            </div>

            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-3">
                By signing below, I acknowledge that I have received a stipend of $100.00 from the Spelman College Glee Club.
              </p>
              <div className="border border-border rounded-lg bg-background overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  className="w-full h-32 cursor-crosshair"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">Sign above</p>
                <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs h-7">Clear</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={signing || !hasSigned}>
            {signing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Sign & Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
