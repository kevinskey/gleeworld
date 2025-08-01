import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddWardrobeItemDialogProps {
  onItemAdded: () => void;
}

const categories = [
  'formal', 'accessories', 'cosmetics', 'casual', 
  'performance', 'shoes', 'travel', 'special'
];

export const AddWardrobeItemDialog = ({ onItemAdded }: AddWardrobeItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    size_options: [] as string[],
    color_options: [] as string[],
    notes: ''
  });
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [loading, setLoading] = useState(false);

  const addSize = () => {
    if (newSize.trim() && !form.size_options.includes(newSize.trim())) {
      setForm(prev => ({
        ...prev,
        size_options: [...prev.size_options, newSize.trim()]
      }));
      setNewSize('');
    }
  };

  const removeSize = (size: string) => {
    setForm(prev => ({
      ...prev,
      size_options: prev.size_options.filter(s => s !== size)
    }));
  };

  const addColor = () => {
    if (newColor.trim() && !form.color_options.includes(newColor.trim())) {
      setForm(prev => ({
        ...prev,
        color_options: [...prev.color_options, newColor.trim()]
      }));
      setNewColor('');
    }
  };

  const removeColor = (color: string) => {
    setForm(prev => ({
      ...prev,
      color_options: prev.color_options.filter(c => c !== color)
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('wardrobe_items')
        .insert({
          name: form.name.trim(),
          category: form.category,
          size_options: form.size_options,
          color_options: form.color_options,
          total_quantity: 0,
          available_quantity: 0,
          notes: form.notes.trim() || null
        });

      if (error) throw error;

      toast.success('Item added successfully');
      setForm({
        name: '',
        category: '',
        size_options: [],
        color_options: [],
        notes: ''
      });
      setOpen(false);
      onItemAdded();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Wardrobe Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Black Formal Dress"
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={form.category} onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Size Options</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="Add size (e.g., XS, S, M, L)"
                onKeyDown={(e) => e.key === 'Enter' && addSize()}
              />
              <Button type="button" onClick={addSize} size="sm">Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.size_options.map(size => (
                <div key={size} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm">
                  {size}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeSize(size)} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Color Options</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Add color (e.g., Black, Navy, Red)"
                onKeyDown={(e) => e.key === 'Enter' && addColor()}
              />
              <Button type="button" onClick={addColor} size="sm">Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.color_options.map(color => (
                <div key={color} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm">
                  {color}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeColor(color)} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this item..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};