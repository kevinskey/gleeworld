import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const AlumnaeFormBuilder = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    form_name: '',
    form_description: '',
    submission_email: '',
    success_message: 'Thank you for your submission!',
    form_schema: [] as any[],
  });

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    const { data } = await supabase
      .from('alumnae_forms')
      .select('*')
      .order('created_at', { ascending: false });
    
    setForms(data || []);
  };

  const handleAddField = () => {
    setFormData({
      ...formData,
      form_schema: [
        ...formData.form_schema,
        {
          id: `field_${Date.now()}`,
          type: 'text',
          label: 'New Field',
          required: false,
          placeholder: '',
        },
      ],
    });
  };

  const handleSaveForm = async () => {
    try {
      if (selectedForm) {
        const { error } = await supabase
          .from('alumnae_forms')
          .update({
            form_name: formData.form_name,
            form_description: formData.form_description,
            submission_email: formData.submission_email,
            success_message: formData.success_message,
            form_schema: formData.form_schema,
          })
          .eq('id', selectedForm.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('alumnae_forms')
          .insert([formData]);

        if (error) throw error;
      }

      toast.success('Form saved');
      fetchForms();
      resetForm();
    } catch (error: any) {
      toast.error('Failed to save form: ' + error.message);
    }
  };

  const resetForm = () => {
    setSelectedForm(null);
    setFormData({
      form_name: '',
      form_description: '',
      submission_email: '',
      success_message: 'Thank you for your submission!',
      form_schema: [],
    });
  };

  const handleLoadForm = (form: any) => {
    setSelectedForm(form);
    setFormData({
      form_name: form.form_name,
      form_description: form.form_description || '',
      submission_email: form.submission_email || '',
      success_message: form.success_message,
      form_schema: form.form_schema || [],
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Form
              </Button>
              {forms.map((form) => (
                <Button
                  key={form.id}
                  variant={selectedForm?.id === form.id ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => handleLoadForm(form)}
                >
                  {form.form_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedForm ? 'Edit Form' : 'Create Form'}</CardTitle>
              <Button onClick={handleSaveForm}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Form Name</Label>
              <Input
                value={formData.form_name}
                onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.form_description}
                onChange={(e) => setFormData({ ...formData, form_description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Submission Email</Label>
              <Input
                type="email"
                value={formData.submission_email}
                onChange={(e) => setFormData({ ...formData, submission_email: e.target.value })}
                placeholder="notifications@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Success Message</Label>
              <Input
                value={formData.success_message}
                onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Form Fields</Label>
                <Button size="sm" onClick={handleAddField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>

              {formData.form_schema.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => {
                            const schema = [...formData.form_schema];
                            schema[index].label = e.target.value;
                            setFormData({ ...formData, form_schema: schema });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => {
                            const schema = [...formData.form_schema];
                            schema[index].type = value;
                            setFormData({ ...formData, form_schema: schema });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="tel">Phone</SelectItem>
                            <SelectItem value="textarea">Text Area</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const schema = formData.form_schema.filter((_, i) => i !== index);
                          setFormData({ ...formData, form_schema: schema });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
