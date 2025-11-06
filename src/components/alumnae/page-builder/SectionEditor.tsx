import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, Image, Type, FormInput, Star, BookOpen, Layout } from 'lucide-react';
import { SectionItemsManager } from './SectionItemsManager';

interface SectionEditorProps {
  section: any;
  onSave: (section: any) => void;
  onCancel: () => void;
}

export const SectionEditor = ({ section, onSave, onCancel }: SectionEditorProps) => {
  const [formData, setFormData] = useState(section);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {formData.id ? 'Edit Section' : 'Create Section'}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Section
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          {formData.id && <TabsTrigger value="content">Content Items</TabsTrigger>}
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Section Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Section Title</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter section title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section_type">Section Type</Label>
                  <Select
                    value={formData.section_type}
                    onValueChange={(value) => setFormData({ ...formData, section_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hero">Hero / Banner</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="media">Media Gallery</SelectItem>
                      <SelectItem value="form">Form</SelectItem>
                      <SelectItem value="spotlight">Spotlight</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="layout_type">Layout</Label>
                  <Select
                    value={formData.layout_type}
                    onValueChange={(value) => setFormData({ ...formData, layout_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Column</SelectItem>
                      <SelectItem value="two-column">Two Columns</SelectItem>
                      <SelectItem value="three-column">Three Columns</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="row_height">Row Height</Label>
                <Input
                  id="row_height"
                  value={formData.row_height || ''}
                  onChange={(e) => setFormData({ ...formData, row_height: e.target.value })}
                  placeholder="e.g., 400px, 50vh, auto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="background_color">Background Color</Label>
                <Input
                  id="background_color"
                  type="color"
                  value={formData.background_color || '#ffffff'}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="background_image">Background Image URL</Label>
                <Input
                  id="background_image"
                  value={formData.background_image || ''}
                  onChange={(e) => setFormData({ ...formData, background_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active (visible on page)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {formData.id && (
          <TabsContent value="content">
            <SectionItemsManager sectionId={formData.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
