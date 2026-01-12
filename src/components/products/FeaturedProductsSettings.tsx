import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Star, Save, Monitor, Tablet, Smartphone, LayoutGrid, 
  GalleryHorizontal, Eye, Tag, Loader2
} from 'lucide-react';

interface FeaturedSettings {
  featured_categories: string[];
  featured_display_limit: number;
  featured_title: string;
  featured_subtitle: string;
  featured_desktop_columns: number;
  featured_tablet_columns: number;
  featured_mobile_columns: number;
  featured_display_style: 'carousel' | 'grid';
  featured_show_price: boolean;
  featured_show_category: boolean;
  featured_show_quick_view: boolean;
  featured_card_aspect_ratio: 'square' | 'portrait' | 'landscape';
}

interface Category {
  id: string;
  name: string;
  product_count?: number;
}

const DEFAULT_SETTINGS: FeaturedSettings = {
  featured_categories: [],
  featured_display_limit: 8,
  featured_title: 'Featured Products',
  featured_subtitle: 'Discover our exclusive collection',
  featured_desktop_columns: 4,
  featured_tablet_columns: 3,
  featured_mobile_columns: 1,
  featured_display_style: 'carousel',
  featured_show_price: true,
  featured_show_category: true,
  featured_show_quick_view: true,
  featured_card_aspect_ratio: 'square'
};

export const FeaturedProductsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FeaturedSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([fetchSettings(), fetchCategories()]);
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings({
          featured_categories: data.featured_categories || [],
          featured_display_limit: data.featured_display_limit || 8,
          featured_title: data.featured_title || 'Featured Products',
          featured_subtitle: data.featured_subtitle || 'Discover our exclusive collection',
          featured_desktop_columns: data.featured_desktop_columns || 4,
          featured_tablet_columns: data.featured_tablet_columns || 3,
          featured_mobile_columns: data.featured_mobile_columns || 1,
          featured_display_style: (data.featured_display_style as 'carousel' | 'grid') || 'carousel',
          featured_show_price: data.featured_show_price ?? true,
          featured_show_category: data.featured_show_category ?? true,
          featured_show_quick_view: data.featured_show_quick_view ?? true,
          featured_card_aspect_ratio: (data.featured_card_aspect_ratio as 'square' | 'portrait' | 'landscape') || 'square'
        });
      }
    } catch (error: any) {
      console.error('Error fetching featured settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Fetch categories with product counts
      const { data: categoriesData, error: catError } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');

      if (catError) throw catError;

      // Get product counts per category
      const { data: productsData } = await supabase
        .from('products')
        .select('category_id')
        .eq('is_active', true);

      const countMap: Record<string, number> = {};
      productsData?.forEach(p => {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        }
      });

      setCategories((categoriesData || []).map(c => ({
        ...c,
        product_count: countMap[c.id] || 0
      })));
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('gw_store_settings')
        .upsert({
          id: 1,
          ...settings
        });

      if (error) throw error;
      toast({ title: "Success", description: "Featured products settings saved" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSettings(prev => ({
      ...prev,
      featured_categories: prev.featured_categories.includes(categoryId)
        ? prev.featured_categories.filter(id => id !== categoryId)
        : [...prev.featured_categories, categoryId]
    }));
  };

  const selectAllCategories = () => {
    setSettings(prev => ({
      ...prev,
      featured_categories: categories.map(c => c.id)
    }));
  };

  const clearAllCategories = () => {
    setSettings(prev => ({
      ...prev,
      featured_categories: []
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Featured Products Display
          </CardTitle>
          <CardDescription>
            Configure how featured products appear on your storefront
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Section Title</Label>
              <Input
                value={settings.featured_title}
                onChange={(e) => setSettings({...settings, featured_title: e.target.value})}
                placeholder="Featured Products"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={settings.featured_subtitle}
                onChange={(e) => setSettings({...settings, featured_subtitle: e.target.value})}
                placeholder="Discover our exclusive collection"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Display Limit</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={settings.featured_display_limit}
              onChange={(e) => setSettings({...settings, featured_display_limit: parseInt(e.target.value) || 8})}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">Maximum number of products to show</p>
          </div>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Featured Categories
          </CardTitle>
          <CardDescription>
            Select which product categories to display in the featured section. 
            Leave empty to show all featured products regardless of category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={selectAllCategories}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearAllCategories}>
              Clear All
            </Button>
            {settings.featured_categories.length > 0 && (
              <Badge variant="secondary">
                {settings.featured_categories.length} selected
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(category => (
              <div
                key={category.id}
                className={`
                  flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${settings.featured_categories.includes(category.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'}
                `}
                onClick={() => toggleCategory(category.id)}
              >
                <Checkbox
                  checked={settings.featured_categories.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                />
                <div className="flex-1">
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {category.product_count} products
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {categories.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No categories found. Create categories in the Categories tab first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Display Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Display Style
          </CardTitle>
          <CardDescription>Choose how products are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Layout Type</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={settings.featured_display_style === 'carousel' ? 'default' : 'outline'}
                className="flex items-center gap-2"
                onClick={() => setSettings({...settings, featured_display_style: 'carousel'})}
              >
                <GalleryHorizontal className="w-4 h-4" />
                Carousel
              </Button>
              <Button
                type="button"
                variant={settings.featured_display_style === 'grid' ? 'default' : 'outline'}
                className="flex items-center gap-2"
                onClick={() => setSettings({...settings, featured_display_style: 'grid'})}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Card Aspect Ratio</Label>
            <Select 
              value={settings.featured_card_aspect_ratio} 
              onValueChange={(v: 'square' | 'portrait' | 'landscape') => 
                setSettings({...settings, featured_card_aspect_ratio: v})
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">Square (1:1)</SelectItem>
                <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                <SelectItem value="landscape">Landscape (4:3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Columns */}
      <Card>
        <CardHeader>
          <CardTitle>Responsive Grid (Grid mode only)</CardTitle>
          <CardDescription>Set the number of columns for each device size</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Desktop */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Monitor className="w-5 h-5" />
                Desktop (1024px+)
              </div>
              <Select 
                value={String(settings.featured_desktop_columns)} 
                onValueChange={(v) => setSettings({...settings, featured_desktop_columns: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 columns</SelectItem>
                  <SelectItem value="3">3 columns</SelectItem>
                  <SelectItem value="4">4 columns</SelectItem>
                  <SelectItem value="5">5 columns</SelectItem>
                  <SelectItem value="6">6 columns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tablet */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Tablet className="w-5 h-5" />
                Tablet (768px - 1023px)
              </div>
              <Select 
                value={String(settings.featured_tablet_columns)} 
                onValueChange={(v) => setSettings({...settings, featured_tablet_columns: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 column</SelectItem>
                  <SelectItem value="2">2 columns</SelectItem>
                  <SelectItem value="3">3 columns</SelectItem>
                  <SelectItem value="4">4 columns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="w-5 h-5" />
                Mobile (under 768px)
              </div>
              <Select 
                value={String(settings.featured_mobile_columns)} 
                onValueChange={(v) => setSettings({...settings, featured_mobile_columns: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 column</SelectItem>
                  <SelectItem value="2">2 columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Display Options
          </CardTitle>
          <CardDescription>Toggle visibility of product card elements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Price</Label>
              <p className="text-sm text-muted-foreground">Display product prices on cards</p>
            </div>
            <Switch
              checked={settings.featured_show_price}
              onCheckedChange={(checked) => setSettings({...settings, featured_show_price: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Category Badge</Label>
              <p className="text-sm text-muted-foreground">Display category badge on product cards</p>
            </div>
            <Switch
              checked={settings.featured_show_category}
              onCheckedChange={(checked) => setSettings({...settings, featured_show_category: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Quick View Button</Label>
              <p className="text-sm text-muted-foreground">Show quick view overlay on hover</p>
            </div>
            <Switch
              checked={settings.featured_show_quick_view}
              onCheckedChange={(checked) => setSettings({...settings, featured_show_quick_view: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Featured Settings'}
        </Button>
      </div>
    </div>
  );
};
