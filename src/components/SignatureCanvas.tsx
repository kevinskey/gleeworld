
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SignatureCanvasProps {
  onSignatureChange: (signature: string | null) => void;
  disabled?: boolean;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ 
  onSignatureChange, 
  disabled = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on mobile/desktop
    if (isMobile) {
      canvas.width = Math.min(window.innerWidth - 80, 320);
      canvas.height = 160;
    } else {
      canvas.width = 400;
      canvas.height = 200;
    }

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    console.log('SignatureCanvas initialized');
  }, [isMobile]);

  const getEventCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getEventCoordinates(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    console.log('Started drawing signature');
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getEventCoordinates(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (!hasSignature) {
      setHasSignature(true);
      const signatureData = canvas.toDataURL();
      console.log('Signature captured, data length:', signatureData.length);
      onSignatureChange(signatureData);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      console.log('Stopped drawing signature');
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
    onSignatureChange(null);
    console.log('Signature cleared');
  };

  return (
    <Card>
      <CardHeader className={isMobile ? 'pb-2' : ''}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : ''}`}>
          <Check className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          <span>Your Signature</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
        <div className="border rounded-lg p-4 bg-gray-50">
          <canvas
            ref={canvasRef}
            className={`border bg-white rounded w-full mx-auto block ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'
            }`}
            style={{ touchAction: 'none', maxWidth: '100%' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        
        <div className={`flex justify-between items-center ${isMobile ? 'flex-col gap-2' : ''}`}>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
            className={isMobile ? 'w-full' : ''}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear Signature
          </Button>
          
          {hasSignature && (
            <span className={`text-sm text-green-600 flex items-center ${isMobile ? 'justify-center' : ''}`}>
              <Check className="h-4 w-4 mr-1" />
              Signature captured
            </span>
          )}
        </div>
        
        <p className={`text-sm text-gray-600 text-center ${isMobile ? 'text-xs' : ''}`}>
          Please sign in the box above using your {isMobile ? 'finger or' : 'mouse or'} touchscreen
        </p>
      </CardContent>
    </Card>
  );
};
