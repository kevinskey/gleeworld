import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pen, Type, RotateCcw, Check } from 'lucide-react';

interface ElectronicSignatureProps {
  onSign: (signatureData: SignatureData) => void;
  onCancel?: () => void;
  signerName?: string;
  signerTitle?: string;
  contractTitle?: string;
  isLoading?: boolean;
}

export interface SignatureData {
  type: 'typed' | 'drawn' | 'both';
  typedName: string;
  typedTitle?: string;
  drawnSignature?: string; // Base64 image data
  signedAt: string;
  ipAddress?: string;
  consent: boolean;
}

// Custom signature canvas component
const SignatureCanvas = ({ 
  onSignatureChange 
}: { 
  onSignatureChange: (hasSignature: boolean, dataUrl?: string) => void 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (!hasContent) {
      setHasContent(true);
      onSignatureChange(true, canvas?.toDataURL('image/png'));
    }
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      onSignatureChange(hasContent, canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onSignatureChange(false, undefined);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  return (
    <div className="space-y-2">
      <div 
        className="border-2 rounded-lg overflow-hidden touch-none"
        style={{ borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
      >
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full cursor-crosshair"
          style={{ backgroundColor: '#ffffff', touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={clear}
        className="flex items-center gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        Clear
      </Button>
    </div>
  );
};

export const ElectronicSignature = ({
  onSign,
  onCancel,
  signerName = '',
  signerTitle = '',
  contractTitle = 'this contract',
  isLoading = false
}: ElectronicSignatureProps) => {
  const [activeTab, setActiveTab] = useState<'type' | 'draw'>('type');
  const [typedName, setTypedName] = useState(signerName);
  const [typedTitle, setTypedTitle] = useState(signerTitle);
  const [consent, setConsent] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [drawnSignatureData, setDrawnSignatureData] = useState<string | undefined>();

  const handleSignatureChange = useCallback((hasSignature: boolean, dataUrl?: string) => {
    setHasDrawnSignature(hasSignature);
    setDrawnSignatureData(dataUrl);
  }, []);

  const handleSign = () => {
    const signatureData: SignatureData = {
      type: activeTab === 'draw' && drawnSignatureData ? 'drawn' : 'typed',
      typedName: typedName.trim(),
      typedTitle: typedTitle.trim() || undefined,
      drawnSignature: drawnSignatureData,
      signedAt: new Date().toISOString(),
      consent: true
    };

    // If both typed name and drawn signature exist
    if (typedName.trim() && drawnSignatureData) {
      signatureData.type = 'both';
    }

    onSign(signatureData);
  };

  const canSign = () => {
    if (!consent) return false;
    if (!typedName.trim()) return false;
    if (activeTab === 'draw' && !hasDrawnSignature) return false;
    return true;
  };

  return (
    <Card style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: '#111827' }}>
          <Pen className="h-5 w-5" />
          Electronic Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signature method tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'type' | 'draw')}>
          <TabsList className="grid w-full grid-cols-2" style={{ backgroundColor: '#f3f4f6' }}>
            <TabsTrigger value="type" className="flex items-center gap-2 data-[state=active]:bg-white" style={{ color: '#374151' }}>
              <Type className="h-4 w-4" />
              Type Name
            </TabsTrigger>
            <TabsTrigger value="draw" className="flex items-center gap-2 data-[state=active]:bg-white" style={{ color: '#374151' }}>
              <Pen className="h-4 w-4" />
              Draw Signature
            </TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="typed-name" style={{ color: '#374151' }}>Full Legal Name *</Label>
              <Input
                id="typed-name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Enter your full legal name"
                style={{ backgroundColor: '#ffffff', color: '#1a1a1a', borderColor: '#d1d5db' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typed-title" style={{ color: '#374151' }}>Title/Position (optional)</Label>
              <Input
                id="typed-title"
                value={typedTitle}
                onChange={(e) => setTypedTitle(e.target.value)}
                placeholder="e.g., Director, President"
                style={{ backgroundColor: '#ffffff', color: '#1a1a1a', borderColor: '#d1d5db' }}
              />
            </div>
            
            {/* Preview of typed signature */}
            {typedName.trim() && (
              <div className="mt-4 p-4 border rounded-lg" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                <p className="text-xs mb-2" style={{ color: '#6b7280' }}>Signature Preview:</p>
                <div 
                  className="text-2xl italic"
                  style={{ 
                    fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                    color: '#1e3a8a'
                  }}
                >
                  {typedName}
                </div>
                {typedTitle && (
                  <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{typedTitle}</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="draw" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Draw Your Signature *</Label>
              <SignatureCanvas onSignatureChange={handleSignatureChange} />
            </div>
            
            {/* Still need typed name for record */}
            <div className="space-y-2">
              <Label htmlFor="drawn-typed-name" style={{ color: '#374151' }}>Full Legal Name *</Label>
              <Input
                id="drawn-typed-name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Enter your full legal name"
                style={{ backgroundColor: '#ffffff', color: '#1a1a1a', borderColor: '#d1d5db' }}
              />
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Your typed name will appear below your signature
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Consent checkbox */}
        <div 
          className="flex items-start space-x-3 p-4 rounded-lg border"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d' }}
        >
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked === true)}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="consent"
              className="text-sm font-medium leading-relaxed cursor-pointer"
              style={{ color: '#92400e' }}
            >
              I agree that my electronic signature on {contractTitle} is legally binding and 
              has the same legal effect as a handwritten signature. I confirm that I am 
              authorized to sign this document.
            </label>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSign}
            disabled={!canSign() || isLoading}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            {isLoading ? 'Signing...' : 'Sign Document'}
          </Button>
        </div>

        {/* Legal notice */}
        <p className="text-xs text-center" style={{ color: '#9ca3af' }}>
          By signing, you agree that your electronic signature is legally binding under the 
          Electronic Signatures in Global and National Commerce Act (E-SIGN Act) and the 
          Uniform Electronic Transactions Act (UETA).
        </p>
      </CardContent>
    </Card>
  );
};
