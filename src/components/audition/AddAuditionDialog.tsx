import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AuditionDialog } from './AuditionDialog';
// Legacy wrapper for backward compatibility
export const AddAuditionDialog = ({ open, onOpenChange, onAddAudition }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAudition: (auditionData: any) => Promise<any>;
}) => {
  return (
    <AuditionDialog
      open={open}
      onOpenChange={onOpenChange}
      onAddAudition={onAddAudition}
    />
  );
};