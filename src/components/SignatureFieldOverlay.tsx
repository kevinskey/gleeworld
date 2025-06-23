
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { Calendar, FileSignature, Type, User, UserCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const [isOpen, setIsOpen] = useState(false);
  const [fieldValue, setFieldValue] = useState(value || "");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleSignatureChange = (signature: string | null) => {
    console.log('Signature change for field', field.id, 'with signature data:', signature ? 'present' : 'null');
    setSignatureData(signature);
    // Don't close immediately, let user finish signing
  };

  const handleSignatureComplete = () => {
    console.log('Manual signature completion for field', field.id);
    
    if (signatureData && signatureData.trim()) {
      console.log('Valid signature data received, completing field');
      setFieldValue(signatureData);
      onFieldComplete(field.id, signatureData);
      setIsOpen(false);
    } else {
      console.log('No valid signature data to complete');
    }
  };

  const handleTextComplete = () => {
    if (fieldValue.trim()) {
      console.log('Text field completion for field', field.id, 'with value:', fieldValue);
      onFieldComplete(field.id, fieldValue);
      setIsOpen(false);
    }
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

  return (
    <>
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
      >
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <div className="flex items-center gap-2 w-full">
              {getFieldIcon()}
              <span className="truncate">
                {isCompleted ? 'Completed' : field.label}
              </span>
              {field.required && !isCompleted && <span className="text-red-500">*</span>}
            </div>
          </SheetTrigger>
          <SheetContent side={isMobile ? "bottom" : "right"} className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {getFieldIcon()}
                <span>{field.label}</span>
                {field.required && <span className="text-red-500">*</span>}
              </SheetTitle>
              <SheetDescription>
                Complete this {field.type} field to continue with your contract signing.
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6">
              {field.type === 'signature' && (
                <div className="space-y-4">
                  <SignatureCanvas 
                    onSignatureChange={handleSignatureChange}
                    disabled={false}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSignatureComplete}
                      disabled={!signatureData}
                      className="w-full"
                    >
                      Complete Signature
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
                    onBlur={handleTextComplete}
                    className="w-full"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const today = getCurrentDate();
                        setFieldValue(today);
                        onFieldComplete(field.id, today);
                        setIsOpen(false);
                      }}
                    >
                      Use Today
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
                    onBlur={handleTextComplete}
                    placeholder={`Enter ${field.type}`}
                    className="w-full"
                    maxLength={field.type === 'initials' ? 3 : undefined}
                  />
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};
