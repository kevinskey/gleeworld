import React from 'react';
import { Input } from '@/components/ui/input';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  placeholder = "Enter phone number",
  disabled = false
}) => {
  const formatPhoneNumber = (input: string) => {
    // Remove all non-numeric characters
    const cleaned = input.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length >= 10) {
      const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
      }
    }
    
    return cleaned;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <Input
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={14} // (XXX) XXX-XXXX
    />
  );
};

export default PhoneNumberInput;