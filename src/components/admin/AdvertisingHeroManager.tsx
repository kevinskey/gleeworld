import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Trash2, Eye, Monitor, Tablet, Smartphone, Megaphone, ShoppingCart, Link2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  created_at: string;
  updated_at: string;
}

export const AdvertisingHeroManager = () => {
  const [hero, setHero] = useState<AdvertisingHero | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    mobile_image_url: "",
    ipad_image_url: "",
    link_url: "",
    link_target: "_self",
    is_active: true,
    amazon_affiliate_tag: ""
  });

  const isAmazonUrl = (url: string) => /amazon\.(com|co\.uk|ca|de|fr|es|it|in|jp|com\.au|com\.br|com\.mx)/i.test(url);

  const fetchAmazonProduct = async () => {
    if (!formData.link_url || !isAmazonUrl(formData.link_url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Amazon product URL first",
        variant: "destructive"
      });
      return;
    }

    setFetchingProduct(true);
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
      setFetchingProduct(false);
    }
  };

  useEffect(() => {
    fetchHero();
  }, []);

  const fetchHero = async () => {
    try {
      // Fetch without the is_active filter since admins need to see all
      const { data, error } = await supabase
        .from('advertising_hero')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const heroData = data[0] as AdvertisingHero;
        setHero(heroData);
        setFormData({
          title: heroData.title || "",
          description: heroData.description || "",
          image_url: heroData.image_url || "",
          mobile_image_url: heroData.mobile_image_url || "",
          ipad_image_url: heroData.ipad_image_url || "",
          link_url: heroData.link_url || "",
          link_target: heroData.link_target || "_self",
          is_active: heroData.is_active,
          amazon_affiliate_tag: (heroData as any).amazon_affiliate_tag || ""
        });
      }
    } catch (error) {
      console.error('Error fetching advertising hero:', error);
      toast({
        title: "Error",
        description: "Failed to load advertising hero",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const handleSave = async () => {
    if (!formData.image_url) {
      toast({
        title: "Error",
        description: "Please provide at least a desktop image URL",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Build final link URL with Amazon affiliate tag if applicable
      let finalLinkUrl = formData.link_url || null;
      if (finalLinkUrl && formData.amazon_affiliate_tag) {
        const isAmazonUrl = /amazon\.(com|co\.uk|ca|de|fr|es|it|in|jp|com\.au|com\.br|com\.mx)/i.test(finalLinkUrl);
        if (isAmazonUrl) {
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

      if (hero) {
        // Update existing
        const { error } = await supabase
          .from('advertising_hero')
          .update(payload)
          .eq('id', hero.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('advertising_hero')
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Advertising hero saved successfully"
      });

      fetchHero();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save advertising hero",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hero) return;

    if (!confirm('Are you sure you want to delete this advertising hero?')) return;

    try {
      const { error } = await supabase
        .from('advertising_hero')
        .delete()
        .eq('id', hero.id);

      if (error) throw error;

      setHero(null);
      setFormData({
        title: "",
        description: "",
        image_url: "",
        mobile_image_url: "",
        ipad_image_url: "",
        link_url: "",
        link_target: "_self",
        is_active: true,
        amazon_affiliate_tag: ""
      });

      toast({
        title: "Success",
        description: "Advertising hero deleted"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete advertising hero",
        variant: "destructive"
      });
    }
  };

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

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Advertising Hero Banner</CardTitle>
            <CardDescription>
              This prominent banner appears at the very top of everyone's dashboard
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
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
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="font-medium">Show on Dashboard</Label>
            <p className="text-sm text-muted-foreground">When enabled, this hero appears at the top of the dashboard</p>
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
                onClick={fetchAmazonProduct}
                disabled={fetchingProduct}
                className="bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800"
              >
                {fetchingProduct ? (
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
              Enter your affiliate tag, then paste an Amazon URL above and click "Fetch Product Info" to auto-fill title, description, and image.
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
              <Label className="font-medium">Tablet Image (Optional)</Label>
            </div>
            <div className="flex gap-3">
              <Input
                value={formData.ipad_image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, ipad_image_url: e.target.value }))}
                placeholder="Uses desktop image if empty"
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
              <img src={formData.ipad_image_url} alt="Tablet" className="h-16 rounded object-cover" />
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
                placeholder="Uses desktop image if empty"
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
              <img src={formData.mobile_image_url} alt="Mobile" className="h-16 rounded object-cover" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Advertising Hero"}
          </Button>
          {hero && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
