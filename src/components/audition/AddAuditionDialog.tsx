import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAvailableAuditionSlots } from '@/hooks/useAvailableAuditionSlots';

interface AddAuditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAudition: (auditionData: {
    first_name: string;
    last_name: string;
    email: string;
    audition_date: string;
    audition_time: string;
    status?: 'pending' | 'approved' | 'rejected';
    additional_info?: string;
    is_soloist?: boolean;
    phone?: string;
    user_id?: string;
    personality_description?: string;
  }) => Promise<any>;
}

export const AddAuditionDialog = ({ open, onOpenChange, onAddAudition }: AddAuditionDialogProps) => {
  const { toast } = useToast();
  const { availableDates, timeSlots } = useAvailableAuditionSlots(null);
  
  const [formData, setFormData] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    audition_date: string;
    audition_time: string;
    additional_info: string;
    is_soloist: boolean;
    status: 'pending' | 'approved' | 'rejected';
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    audition_date: '',
    audition_time: '',
    additional_info: '',
    is_soloist: false,
    status: 'pending'
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.audition_date || !formData.audition_time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await onAddAudition({
        ...formData,
        personality_description: formData.additional_info
      });
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        audition_date: '',
        audition_time: '',
        additional_info: '',
        is_soloist: false,
        status: 'pending'
      });
      setSelectedDate(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding audition:', error);
    }
  };

  const handleDateChange = (dateStr: string) => {
    setFormData(prev => ({ ...prev, audition_date: dateStr, audition_time: '' }));
    const date = new Date(dateStr);
    setSelectedDate(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Audition</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="audition_date">Audition Date *</Label>
              <Select value={formData.audition_date} onValueChange={handleDateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map((date) => (
                    <SelectItem key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                      {date.toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audition_time">Time Slot *</Label>
              <Select 
                value={formData.audition_time} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, audition_time: value }))}
                disabled={!selectedDate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: 'pending' | 'approved' | 'rejected') => 
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="is_soloist"
              checked={formData.is_soloist}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_soloist: !!checked }))
              }
            />
            <Label htmlFor="is_soloist">Solo Audition</Label>
          </div>

          <div>
            <Label htmlFor="additional_info">Additional Notes</Label>
            <Textarea
              id="additional_info"
              value={formData.additional_info}
              onChange={(e) => setFormData(prev => ({ ...prev, additional_info: e.target.value }))}
              placeholder="Any additional information about the audition..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Add Audition
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};