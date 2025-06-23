
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { Calendar, FileSignature, Type, User, UserCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'date' | 'text' | 'initials' | 'username';
  page: number;
  x: number;
  y: number;
  required: boolean;
}

interface SignatureFieldOverlayProps {
  field: SignatureField;
  onFieldComplete: (fieldId: number, value: string) => void;
  isCompleted: boolean;
  value?: string;
}

export const SignatureFieldOverlay = ({ 
  field, 
  onFieldComplete, 
  isCompleted, 
  value 
}: SignatureFieldOverlayProps) => {
  const [isActive, setIsActive] = useState(false);
  const [fieldValue, setFieldValue] = useState(value || "");
  const isMobile = useIsMobile();

  const handleSignatureComplete = (signatureData: string | null) => {
    console.log('Signature completion for field', field.id, 'with signature data:', signatureData ? 'present' : 'null');
    
    if (signatureData && signatureData.trim()) {
      console.log('Valid signature data received, completing field');
      setFieldValue(signatureData);
      onFieldComplete(field.id, signatureData);
      setIsActive(false);
    } else {
      console.log('No valid signature data received');
    }
  };

  const handleTextComplete = () => {
    if (fieldValue.trim()) {
      console.log('Text field completion for field', field.id, 'with value:', fieldValue);
      onFieldComplete(field.id, fieldValue);
      setIsActive(false);
    }
  };

  const handleCancel = () => {
    console.log('Canceling field input for field', field.id);
    setIsActive(false);
  };

  const getFieldIcon = () => {
    switch (field.type) {
      case 'signature': return <FileSignature className="h-4 w-4" />;
      case 'initials': return <User className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      case 'text': return <Type className="h-4 w-4" />;
      case 'username': return <UserCheck className="h-4 w-4" />;
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString();
  };

  // Handle overlay click - only close if clicking the dark background
  const handleOverlayClick = (e: React.MouseEvent) => {
    console.log('Overlay clicked, target:', e.target === e.currentTarget ? 'background' : 'content');
    // Only close if the click target is the overlay itself (dark background)
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Prevent any events from bubbling up from modal content
  const preventEventBubbling = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  if (isActive) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        onClick={handleOverlayClick}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={preventEventBubbling}
          onTouchStart={preventEventBubbling}
          onTouchEnd={preventEventBubbling}
        >
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {getFieldIcon()}
                <span className="text-lg font-medium">{field.label}</span>
                {field.required && <span className="text-red-500">*</span>}
              </div>
            </div>

            {field.type === 'signature' && (
              <div className="space-y-4">
                <div 
                  onClick={preventEventBubbling}
                  onTouchStart={preventEventBubbling}
                  onTouchEnd={preventEventBubbling}
                  style={{ isolation: 'isolate' }}
                >
                  <SignatureCanvas 
                    onSignatureChange={handleSignatureComplete}
                    disabled={false}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {field.type === 'date' && (
              <div className="space-y-4">
                <Input
                  type="date"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className="w-full"
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const today = getCurrentDate();
                      setFieldValue(today);
                      onFieldComplete(field.id, today);
                      setIsActive(false);
                    }}
                  >
                    Use Today
                  </Button>
                  <Button 
                    onClick={handleTextComplete}
                    disabled={!fieldValue}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {(field.type === 'text' || field.type === 'initials' || field.type === 'username') && (
              <div className="space-y-4">
                <Input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder={`Enter ${field.type}`}
                  className="w-full"
                  maxLength={field.type === 'initials' ? 3 : undefined}
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleTextComplete}
                    disabled={!fieldValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute cursor-pointer border-2 rounded p-2 flex items-center gap-2 text-xs font-medium transition-all hover:shadow-md z-10 ${
        isCompleted 
          ? 'bg-green-50 border-green-300 text-green-700' 
          : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
      } ${isMobile ? 'text-xs px-2 py-1' : ''}`}
      style={{
        left: `${field.x}px`,
        top: `${field.y}px`,
        minWidth: isMobile ? '100px' : '120px',
      }}
      onClick={() => {
        console.log('Field clicked:', field.id, 'type:', field.type, 'completed:', isCompleted);
        if (!isCompleted) {
          setIsActive(true);
        }
      }}
    >
      {getFieldIcon()}
      <span className="truncate">
        {isCompleted ? 'Completed' : field.label}
      </span>
      {field.required && !isCompleted && <span className="text-red-500">*</span>}
    </div>
  );
};
