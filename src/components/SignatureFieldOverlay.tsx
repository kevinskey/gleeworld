
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { Calendar, FileSignature, Type, User, UserCheck } from "lucide-react";

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

  const handleComplete = (newValue: string | null) => {
    console.log('Field completion for field', field.id, 'with value:', newValue ? 'signature data present' : 'no value');
    
    if (newValue) {
      setFieldValue(newValue);
      onFieldComplete(field.id, newValue);
      setIsActive(false);
    }
  };

  const handleTextComplete = () => {
    if (fieldValue.trim()) {
      console.log('Text field completion for field', field.id, 'with value:', fieldValue);
      onFieldComplete(field.id, fieldValue);
      setIsActive(false);
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

  if (isActive) {
    return (
      <div 
        className="absolute bg-white border-2 border-blue-500 rounded-lg shadow-lg p-4 z-20"
        style={{
          left: `${field.x}px`,
          top: `${field.y}px`,
          minWidth: field.type === 'signature' ? '300px' : '200px',
        }}
      >
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-2">
            {getFieldIcon()}
            <span className="text-sm font-medium">{field.label}</span>
            {field.required && <span className="text-red-500">*</span>}
          </div>
        </div>

        {field.type === 'signature' && (
          <div className="space-y-3">
            <SignatureCanvas 
              onSignatureChange={handleComplete}
              disabled={false}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsActive(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {field.type === 'date' && (
          <div className="space-y-3">
            <Input
              type="date"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleTextComplete}
                disabled={!fieldValue}
              >
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
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
                variant="outline" 
                size="sm" 
                onClick={() => setIsActive(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {(field.type === 'text' || field.type === 'initials' || field.type === 'username') && (
          <div className="space-y-3">
            <Input
              type="text"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              placeholder={`Enter ${field.type}`}
              className="w-full"
              maxLength={field.type === 'initials' ? 3 : undefined}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleTextComplete}
                disabled={!fieldValue.trim()}
              >
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsActive(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`absolute cursor-pointer border-2 rounded p-2 flex items-center gap-2 text-xs font-medium transition-all hover:shadow-md z-10 ${
        isCompleted 
          ? 'bg-green-50 border-green-300 text-green-700' 
          : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
      }`}
      style={{
        left: `${field.x}px`,
        top: `${field.y}px`,
        minWidth: '120px',
      }}
      onClick={() => !isCompleted && setIsActive(true)}
    >
      {getFieldIcon()}
      <span className="truncate">
        {isCompleted ? 'Completed' : field.label}
      </span>
      {field.required && !isCompleted && <span className="text-red-500">*</span>}
    </div>
  );
};
