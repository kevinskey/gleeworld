import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecurityConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmationText?: string;
  warningLevel?: 'medium' | 'high' | 'critical';
  onConfirm: (reason?: string) => Promise<void>;
  requireReason?: boolean;
}

export const SecurityConfirmationDialog: React.FC<SecurityConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmationText = 'CONFIRM',
  warningLevel = 'medium',
  onConfirm,
  requireReason = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      return;
    }
    
    if (inputValue.toUpperCase() !== confirmationText.toUpperCase()) {
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(reason.trim() || undefined);
      onOpenChange(false);
      setInputValue('');
      setReason('');
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setIsProcessing(false);
    }
  };

  const isValid = inputValue.toUpperCase() === confirmationText.toUpperCase() && 
                  (!requireReason || reason.trim().length > 0);

  const getWarningColor = () => {
    switch (warningLevel) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      default: return 'text-yellow-600';
    }
  };

  const getIcon = () => {
    return warningLevel === 'critical' ? (
      <AlertTriangle className={`h-6 w-6 ${getWarningColor()}`} />
    ) : (
      <Shield className={`h-6 w-6 ${getWarningColor()}`} />
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {requireReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for this action *</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for this security-sensitive action"
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-bold">{confirmationText}</span> to confirm:
            </Label>
            <Input
              id="confirmation"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationText}
              className="w-full"
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid || isProcessing}
            className={`${
              warningLevel === 'critical' 
                ? 'bg-red-600 hover:bg-red-700' 
                : warningLevel === 'high'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-yellow-600 hover:bg-yellow-700'
            } text-white`}
          >
            {isProcessing ? 'Processing...' : 'Confirm Action'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};