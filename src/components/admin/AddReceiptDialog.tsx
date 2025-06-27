
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Upload, X } from "lucide-react";

interface AddReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<any>;
  onUploadImage: (file: File) => Promise<string | null>;
}

interface Event {
  id: string;
  title: string;
}

export const AddReceiptDialog = ({ open, onOpenChange, onSubmit, onUploadImage }: AddReceiptDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const { templates } = useContractTemplates();
  const [events, setEvents] = useState<Event[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch events for the dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title')
        .order('title');
      
      setEvents(data || []);
    };

    if (open) {
      fetchEvents();
    }
  }, [open]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const imageUrl = await onUploadImage(file);
      if (imageUrl) {
        setValue('receipt_image_url', imageUrl);
        setImagePreview(imageUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setValue('receipt_image_url', '');
    setImagePreview(null);
  };

  const onFormSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      // Convert amount to number
      data.amount = parseFloat(data.amount);
      
      // Handle template and event associations
      if (data.template_id === '') data.template_id = null;
      if (data.event_id === '') data.event_id = null;

      await onSubmit(data);
      reset();
      setImagePreview(null);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'office_supplies',
    'travel',
    'equipment',
    'catering',
    'venue',
    'marketing',
    'professional_services',
    'other'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Receipt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receipt_number">Receipt Number</Label>
              <Input
                id="receipt_number"
                {...register('receipt_number')}
                placeholder="Optional receipt number"
              />
            </div>

            <div>
              <Label htmlFor="vendor_name">Vendor Name *</Label>
              <Input
                id="vendor_name"
                {...register('vendor_name', { required: 'Vendor name is required' })}
                placeholder="e.g., Office Depot, Amazon"
              />
              {errors.vendor_name && (
                <p className="text-sm text-red-600 mt-1">{errors.vendor_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              {...register('description', { required: 'Description is required' })}
              placeholder="Brief description of the purchase"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input
                id="purchase_date"
                type="date"
                {...register('purchase_date', { required: 'Purchase date is required' })}
              />
              {errors.purchase_date && (
                <p className="text-sm text-red-600 mt-1">{errors.purchase_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select onValueChange={(value) => setValue('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template_id">Associated Template</Label>
              <Select onValueChange={(value) => setValue('template_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event_id">Associated Event</Label>
              <Select onValueChange={(value) => setValue('event_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No event</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="receipt_image">Receipt Image</Label>
            <div className="space-y-2">
              <Input
                id="receipt_image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-600">Uploading...</p>}
              {imagePreview && (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Receipt preview" 
                    className="w-32 h-32 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes about this receipt"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setImagePreview(null);
                onOpenChange(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Receipt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
