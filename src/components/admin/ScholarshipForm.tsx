import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

interface ScholarshipFormData {
  title: string;
  description: string;
  deadline?: string;
  amount?: string;
  eligibility?: string;
  link?: string;
  is_featured: boolean;
  is_active: boolean;
}

interface ScholarshipFormProps {
  scholarship?: any;
  onSubmit: () => void;
  onCancel: () => void;
}

export const ScholarshipForm = ({ scholarship, onSubmit, onCancel }: ScholarshipFormProps) => {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>(scholarship?.tags || []);
  const [newTag, setNewTag] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ScholarshipFormData>({
    defaultValues: {
      title: scholarship?.title || '',
      description: scholarship?.description || '',
      deadline: scholarship?.deadline || '',
      amount: scholarship?.amount || '',
      eligibility: scholarship?.eligibility || '',
      link: scholarship?.link || '',
      is_featured: scholarship?.is_featured || false,
      is_active: scholarship?.is_active ?? true,
    }
  });

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFormSubmit = async (data: ScholarshipFormData) => {
    setLoading(true);
    try {
      const scholarshipData = {
        ...data,
        tags,
        source: 'manual'
      };

      let error;
      if (scholarship) {
        // Update existing scholarship
        const { error: updateError } = await supabase
          .from('scholarships')
          .update(scholarshipData)
          .eq('id', scholarship.id);
        error = updateError;
      } else {
        // Create new scholarship
        const { error: insertError } = await supabase
          .from('scholarships')
          .insert(scholarshipData);
        error = insertError;
      }

      if (error) {
        throw error;
      }

      toast.success(scholarship ? 'Scholarship updated successfully!' : 'Scholarship created successfully!');
      reset();
      setTags([]);
      onSubmit();
    } catch (error: any) {
      console.error('Error saving scholarship:', error);
      toast.error('Failed to save scholarship: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{scholarship ? 'Edit Scholarship' : 'Add New Scholarship'}</CardTitle>
        <CardDescription>
          {scholarship ? 'Update scholarship information' : 'Create a new scholarship opportunity'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
              placeholder="Enter scholarship title"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description', { required: 'Description is required' })}
              placeholder="Enter scholarship description"
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                {...register('deadline')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                {...register('amount')}
                placeholder="e.g., $5,000 or Full Tuition"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eligibility">Eligibility Requirements</Label>
            <Textarea
              id="eligibility"
              {...register('eligibility')}
              placeholder="Enter eligibility requirements"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link">Application Link</Label>
            <Input
              id="link"
              type="url"
              {...register('link')}
              placeholder="https://example.com/apply"
            />
          </div>

          <div className="space-y-4">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is-featured"
                {...register('is_featured')}
              />
              <Label htmlFor="is-featured">Featured Scholarship</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                {...register('is_active')}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (scholarship ? 'Update' : 'Create')} Scholarship
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};