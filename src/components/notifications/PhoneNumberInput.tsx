
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Phone, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhoneNumberInputProps {
  value?: string;
  onChange: (phone: string) => void;
  onSave?: (phone: string) => Promise<boolean>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value = '',
  onChange,
  onSave,
  label = 'Phone Number',
  placeholder = '+1 (555) 123-4567',
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s|-|\(|\)/g, ''));
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      return '+1' + cleaned;
    }
    return cleaned;
  };

  const handleSave = async () => {
    if (!tempValue.trim()) {
      toast({
        title: "Error",
        description: "Phone number cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(tempValue);
    
    if (!validatePhoneNumber(formattedPhone)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number with country code",
        variant: "destructive",
      });
      return;
    }

    if (onSave) {
      setSaving(true);
      try {
        const success = await onSave(formattedPhone);
        if (success) {
          onChange(formattedPhone);
          setIsEditing(false);
          toast({
            title: "Success",
            description: "Phone number updated successfully",
          });
        }
      } catch (error) {
        console.error('Error saving phone number:', error);
      } finally {
        setSaving(false);
      }
    } else {
      onChange(formattedPhone);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">{label}</Label>
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder={placeholder}
            value={isEditing ? tempValue : value}
            onChange={(e) => {
              if (isEditing) {
                setTempValue(e.target.value);
              } else {
                onChange(e.target.value);
              }
            }}
            onFocus={() => {
              if (!disabled) {
                setIsEditing(true);
                setTempValue(value);
              }
            }}
            disabled={disabled || saving}
            className="pl-10"
          />
        </div>
        
        {isEditing && (
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={saving}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Include country code (e.g., +1 for US numbers)
      </p>
    </div>
  );
};

export default PhoneNumberInput;
