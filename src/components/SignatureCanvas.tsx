
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Check } from 'lucide-react';

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    
    setHasSignature(true);
    onSignatureChange(canvas.toDataURL());
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Check className="h-5 w-5" />
          <span>Your Signature</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 bg-gray-50">
          <canvas
            ref={canvasRef}
            className={`border bg-white rounded w-full max-w-md mx-auto block ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'
            }`}
            style={{ touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear Signature
          </Button>
          
          {hasSignature && (
            <span className="text-sm text-green-600 flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Signature captured
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          Please sign in the box above using your mouse or touchscreen
        </p>
      </CardContent>
    </Card>
  );
};
