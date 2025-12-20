import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Trash2, Eye, Monitor, Tablet, Smartphone, Megaphone, ShoppingCart, Link2, Loader2, Sparkles, Plus, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AdvertisingHero {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  ipad_image_url: string | null;
  link_url: string | null;
  link_target: string | null;
  is_active: boolean;
  amazon_affiliate_tag: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string;
  ipad_image_url: string;
  link_url: string;
  link_target: string;
  is_active: boolean;
  amazon_affiliate_tag: string;
}

const emptyFormData: FormData = {
  title: "",
  description: "",
  image_url: "",
  mobile_image_url: "",
  ipad_image_url: "",
  link_url: "",
  link_target: "_self",
  is_active: true,
  amazon_affiliate_tag: ""
};

export const AdvertisingHeroManager = () => {
  const [heroes, setHeroes] = useState<AdvertisingHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [fetchingProduct, setFetchingProduct] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingHero, setEditingHero] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { toast } = useToast();

  const isAmazonUrl = (url: string) => /amazon\.(com|co\.uk|ca|de|fr|es|it|in|jp|com\.au|com\.br|com\.mx)/i.test(url);

  useEffect(() => {
    fetchHeroes();
  }, []);

  const fetchHeroes = async () => {
    try {
      const { data, error } = await supabase
        .from('advertising_hero')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHeroes((data || []) as AdvertisingHero[]);
    } catch (error) {
      console.error('Error fetching advertising heroes:', error);
      toast({
        title: "Error",
        description: "Failed to load advertising heroes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAmazonProduct = async (heroId: string) => {
    if (!formData.link_url || !isAmazonUrl(formData.link_url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Amazon product URL first",
        variant: "destructive"
      });
      return;
    }

    setFetchingProduct(heroId);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-amazon-product', {
        body: { amazonUrl: formData.link_url }
      });

      if (error) throw error;

      if (data?.success && data?.product) {
        const product = data.product;
        
        setFormData(prev => ({
          ...prev,
          title: product.title || prev.title,
          description: product.description || prev.description,
          image_url: product.imageUrl || prev.image_url,
          link_url: product.affiliateUrl || prev.link_url
        }));

        if (product.requiresManualEntry) {
          toast({
            title: "Partial Success",
            description: "ASIN extracted. Please enter title and description manually, then upload an image.",
          });
        } else {
          toast({
            title: "Product Loaded!",
            description: `"${product.title}" has been loaded with affiliate link`,
          });
        }
      } else {
        throw new Error(data?.error || 'Failed to fetch product');
      }
    } catch (error) {
      console.error('Error fetching Amazon product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch product data",
        variant: "destructive"
      });
    } finally {
      setFetchingProduct(null);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: 'desktop' | 'mobile' | 'ipad') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `advertising-hero-${imageType}-${Date.now()}.${fileExt}`;
      const filePath = `hero-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      if (imageType === 'desktop') {
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
      } else if (imageType === 'mobile') {
        setFormData(prev => ({ ...prev, mobile_image_url: publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, ipad_image_url: publicUrl }));
      }

      toast({
        title: "Success",
        description: `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} image uploaded`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    }
  };

  const startEditing = (hero: AdvertisingHero) => {
    setEditingHero(hero.id);
    setExpandedId(hero.id);
    setIsAddingNew(false);
    setFormData({
      title: hero.title || "",
      description: hero.description || "",
      image_url: hero.image_url || "",
      mobile_image_url: hero.mobile_image_url || "",
      ipad_image_url: hero.ipad_image_url || "",
      link_url: hero.link_url || "",
      link_target: hero.link_target || "_self",
      is_active: hero.is_active,
      amazon_affiliate_tag: hero.amazon_affiliate_tag || ""
    });
  };

  const startAddingNew = () => {
    setIsAddingNew(true);
    setEditingHero(null);
    setExpandedId(null);
    setFormData(emptyFormData);
  };

  const cancelEditing = () => {
    setEditingHero(null);
    setIsAddingNew(false);
    setFormData(emptyFormData);
  };

  const handleSave = async (heroId?: string) => {
    if (!formData.image_url) {
      toast({
        title: "Error",
        description: "Please provide at least a desktop image URL",
        variant: "destructive"
      });
      return;
    }

    setSaving(heroId || 'new');
    try {
      let finalLinkUrl = formData.link_url || null;
      if (finalLinkUrl && formData.amazon_affiliate_tag) {
        if (isAmazonUrl(finalLinkUrl)) {
          const url = new URL(finalLinkUrl);
          url.searchParams.set('tag', formData.amazon_affiliate_tag);
          finalLinkUrl = url.toString();
        }
      }

      const payload = {
        title: formData.title || null,
        description: formData.description || null,
        image_url: formData.image_url,
        mobile_image_url: formData.mobile_image_url || null,
        ipad_image_url: formData.ipad_image_url || null,
        link_url: finalLinkUrl,
        link_target: formData.link_target,
        is_active: formData.is_active,
        amazon_affiliate_tag: formData.amazon_affiliate_tag || null
      };

      if (heroId) {
        const { error } = await supabase
          .from('advertising_hero')
          .update(payload)
          .eq('id', heroId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('advertising_hero')
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: heroId ? "Ad hero updated" : "New ad hero created"
      });

      setEditingHero(null);
      setIsAddingNew(false);
      setFormData(emptyFormData);
      fetchHeroes();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save advertising hero",
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (heroId: string) => {
    if (!confirm('Are you sure you want to delete this ad hero?')) return;

    try {
      const { error } = await supabase
        .from('advertising_hero')
        .delete()
        .eq('id', heroId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ad hero deleted"
      });
      fetchHeroes();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete ad hero",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (hero: AdvertisingHero) => {
    try {
      const { error } = await supabase
        .from('advertising_hero')
        .update({ is_active: !hero.is_active })
        .eq('id', hero.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Ad ${!hero.is_active ? 'activated' : 'deactivated'}`
      });
      fetchHeroes();
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const renderForm = (heroId?: string) => (
    <div className="space-y-6 p-4 bg-muted/30 rounded-lg">
      {/* Preview */}
      {formData.image_url && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Label>
          <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden border">
            <img
              src={formData.image_url}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {formData.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white text-xl font-bold">{formData.title}</h3>
                {formData.description && (
                  <p className="text-white/80 text-sm">{formData.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Toggle */}
      <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
        <div>
          <Label className="font-medium">Active</Label>
          <p className="text-sm text-muted-foreground">Show in rotation on dashboard</p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
      </div>

      {/* Title & Description */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter hero title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link_url">Link URL (optional)</Label>
          <Input
            id="link_url"
            value={formData.link_url}
            onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter hero description"
          rows={2}
        />
      </div>

      {/* Amazon Affiliate Section */}
      <div className="p-4 border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
            <Label className="font-semibold text-orange-800 dark:text-orange-400">Amazon Affiliate</Label>
          </div>
          {formData.link_url && isAmazonUrl(formData.link_url) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAmazonProduct(heroId || 'new')}
              disabled={fetchingProduct !== null}
              className="bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800"
            >
              {fetchingProduct === (heroId || 'new') ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Fetch Product Info
                </>
              )}
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amazon_tag">Your Amazon Affiliate Tag</Label>
          <Input
            id="amazon_tag"
            value={formData.amazon_affiliate_tag}
            onChange={(e) => setFormData(prev => ({ ...prev, amazon_affiliate_tag: e.target.value }))}
            placeholder="e.g., gleeworld-20"
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Enter your affiliate tag, then paste an Amazon URL above and click "Fetch Product Info" to auto-fill.
          </p>
        </div>
        
        {formData.link_url && isAmazonUrl(formData.link_url) && (
          <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded text-sm text-green-800 dark:text-green-400">
            <Link2 className="h-4 w-4" />
            <span>Amazon link detected! {formData.amazon_affiliate_tag ? 'Affiliate tag will be added.' : 'Add your affiliate tag above.'}</span>
          </div>
        )}
      </div>

      {/* Link Target */}
      {formData.link_url && (
        <div className="space-y-2">
          <Label>Link Behavior</Label>
          <Select
            value={formData.link_target}
            onValueChange={(value) => setFormData(prev => ({ ...prev, link_target: value }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_self">Open in same tab</SelectItem>
              <SelectItem value="external">Open in new tab</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Image Uploads */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Images</Label>
        
        {/* Desktop */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Desktop Image (Required)</Label>
          </div>
          <div className="flex gap-3">
            <Input
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="Image URL or upload"
              className="flex-1"
            />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'desktop')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {formData.image_url && (
            <img src={formData.image_url} alt="Desktop" className="h-20 rounded object-cover" />
          )}
        </div>

        {/* Tablet */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Tablet className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">iPad/Tablet Image (Optional)</Label>
          </div>
          <div className="flex gap-3">
            <Input
              value={formData.ipad_image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, ipad_image_url: e.target.value }))}
              placeholder="Image URL or upload"
              className="flex-1"
            />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'ipad')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {formData.ipad_image_url && (
            <img src={formData.ipad_image_url} alt="iPad" className="h-20 rounded object-cover" />
          )}
        </div>

        {/* Mobile */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Mobile Image (Optional)</Label>
          </div>
          <div className="flex gap-3">
            <Input
              value={formData.mobile_image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, mobile_image_url: e.target.value }))}
              placeholder="Image URL or upload"
              className="flex-1"
            />
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'mobile')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {formData.mobile_image_url && (
            <img src={formData.mobile_image_url} alt="Mobile" className="h-20 rounded object-cover" />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={() => handleSave(heroId)}
          disabled={saving !== null}
          className="flex-1"
        >
          {saving === (heroId || 'new') ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {heroId ? 'Update' : 'Create'} Ad Hero
        </Button>
        <Button variant="outline" onClick={cancelEditing}>
          Cancel
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCount = heroes.filter(h => h.is_active).length;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Rotating Ad Heroes</CardTitle>
              <CardDescription>
                Manage multiple ads that rotate at the top of the dashboard (8s intervals)
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{activeCount} active</Badge>
            <Button onClick={startAddingNew} disabled={isAddingNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Ad
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Add New Form */}
        {isAddingNew && (
          <Card className="border-2 border-green-500/30 bg-green-50/30 dark:bg-green-950/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                Create New Ad Hero
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderForm()}
            </CardContent>
          </Card>
        )}

        {/* Existing Heroes List */}
        {heroes.length === 0 && !isAddingNew ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No ad heroes yet. Click "Add New Ad" to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {heroes.map((hero) => (
              <Collapsible
                key={hero.id}
                open={expandedId === hero.id}
                onOpenChange={() => setExpandedId(expandedId === hero.id ? null : hero.id)}
              >
                <Card className={`border ${hero.is_active ? 'border-green-500/30' : 'border-muted'}`}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      {/* Thumbnail */}
                      <div className="w-24 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                        {hero.image_url && (
                          <img src={hero.image_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{hero.title || 'Untitled Ad'}</h3>
                          {hero.is_active ? (
                            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {hero.description && (
                          <p className="text-sm text-muted-foreground truncate">{hero.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={hero.is_active}
                          onCheckedChange={() => toggleActive(hero)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(hero)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(hero.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {expandedId === hero.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    {editingHero === hero.id ? (
                      <div className="border-t">
                        {renderForm(hero.id)}
                      </div>
                    ) : (
                      <div className="border-t p-4">
                        <div className="aspect-[3/1] rounded-lg overflow-hidden mb-4">
                          <img src={hero.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <Button onClick={() => startEditing(hero)} className="w-full">
                          Edit This Ad
                        </Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
