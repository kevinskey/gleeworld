import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProductImageUpload } from '@/hooks/useProductImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Upload, Trash2, Edit, Eye, Star } from 'lucide-react';
import { ConfirmDeleteButton } from '@/components/shared/ConfirmDeleteButton';

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', '2XL'] as const;

interface SizeVariant {
  size: string;
  stock_quantity: number;
}

// Editable row in the Variants matrix. option1 = size axis, option2 =
// color axis (we cap at two axes because that covers ~all music merch
// without overengineering — gw_product_variants still has option3 if a
// later phase needs e.g. material).
interface VariantRow {
  id?: string;            // gw_product_variants.id when persisted; undefined for newly built rows
  size: string;
  color: string;
  sku: string;
  price: number;          // 0 → fall through to product price at checkout
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  short_description: string;
  sku: string;
  price: number;
  sale_price: number;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
  stock_quantity: number;
  manage_stock: boolean;
  weight: number;
  weight_oz?: number;
  length_in?: number;
  width_in?: number;
  height_in?: number;
  tags: string[];
  created_at: string;
  category?: {
    name: string;
  };
  images?: ProductImage[];
  sizes?: string[];
  sizeVariants?: SizeVariant[];
}
interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
}
interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}
export const ProductManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const {
    uploadProductImage,
    deleteProductImage,
    uploading
  } = useProductImageUpload();
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);
  const fetchProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('gw_products').select(`
          *,
          category:gw_product_categories(name),
          images:gw_product_images(*)
        `).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Fetch size variants for all products. gw_product_variants
      // uses generic option1/option2/option3 (Shopify-style) so we treat
      // option1 as the size axis here.
      const productIds = (data || []).map(p => p.id);
      let variantMap: Record<string, SizeVariant[]> = {};
      if (productIds.length > 0) {
        const { data: variants } = await supabase
          .from('gw_product_variants')
          .select('product_id, option1, inventory_quantity')
          .in('product_id', productIds);
        if (variants) {
          variants.forEach((v: any) => {
            if (!v.option1) return;
            if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
            variantMap[v.product_id].push({ size: v.option1, stock_quantity: v.inventory_quantity ?? 0 });
          });
        }
      }

      const productsWithSizes = (data || []).map(p => ({
        ...p,
        sizes: (variantMap[p.id] || []).map(v => v.size),
        sizeVariants: variantMap[p.id] || []
      }));

      setProducts(productsWithSizes);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchCategories = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('gw_product_categories').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
    }
  };
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, productId: string) => {
    const file = event.target.files?.[0];
    if (!file || !productId) return;
    const imageUrl = await uploadProductImage(file, productId);
    if (imageUrl) {
      // Add image to database
      const {
        error
      } = await supabase.from('gw_product_images').insert({
        product_id: productId,
        image_url: imageUrl,
        alt_text: file.name,
        is_primary: false,
        sort_order: 0
      });
      if (error) {
        toast({
          title: "Error",
          description: "Failed to save image record",
          variant: "destructive"
        });
      } else {
        fetchProducts(); // Refresh products to show new image
      }
    }
  };
  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      const {
        error
      } = await supabase.from('gw_products').delete().eq('id', productId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const toggleFeatured = async (productId: string, currentFeatured: boolean) => {
    try {
      const {
        error
      } = await supabase.from('gw_products').update({
        is_featured: !currentFeatured
      }).eq('id', productId);
      if (error) throw error;
      toast({
        title: "Success",
        description: `Product ${!currentFeatured ? 'added to' : 'removed from'} favorites`
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.description?.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  if (loading) {
    return <div className="flex justify-center p-8">Loading products...</div>;
  }
  return <div className="container mx-auto p-6 space-y-6 bg-muted/30">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-xl">Product Manager</h1>
          
        </div>
        <Dialog open={isCreateMode} onOpenChange={setIsCreateMode}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateMode(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
            </DialogHeader>
            <ProductForm product={null} categories={categories} onSave={() => {
            setIsCreateMode(false);
            fetchProducts();
          }} onCancel={() => setIsCreateMode(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Input placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square relative bg-muted">
              {product.images?.[0] ? <img src={product.images[0].image_url} alt={product.images[0].alt_text} className="w-full h-full object-cover" onError={e => {
            console.error('Failed to load image:', product.images?.[0]?.image_url);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }} onLoad={() => {
            console.log('Successfully loaded image:', product.images?.[0]?.image_url);
          }} /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image
                </div>}
              
              {/* Favorite Star */}
              <Button variant="ghost" size="sm" className={`absolute top-2 left-2 p-1 h-8 w-8 rounded-full transition-all ${product.is_featured ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-black/50 hover:bg-black/70 text-white'}`} onClick={() => toggleFeatured(product.id, product.is_featured)} title={product.is_featured ? "Remove from favorites" : "Add to favorites"}>
                <Star className={`h-4 w-4 ${product.is_featured ? 'fill-current' : ''}`} />
              </Button>
              
              {!product.is_active && <Badge className="absolute top-2 right-2" variant="destructive">
                  Inactive
                </Badge>}
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.short_description || product.description}
                </p>
                <div className="flex justify-between items-center">
                  <div>
                    {product.sale_price && product.sale_price < product.price ? <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">${product.sale_price}</span>
                        <span className="text-sm line-through text-muted-foreground">${product.price}</span>
                      </div> : <span className="font-bold">${product.price}</span>}
                  </div>
                  <Badge variant="outline">{product.category?.name}</Badge>
                </div>
                  <div className="space-y-2">
                  {/* Size badges with stock */}
                  {product.sizeVariants && product.sizeVariants.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_SIZES.filter(s => product.sizeVariants?.some(v => v.size === s)).map(size => {
                        const variant = product.sizeVariants?.find(v => v.size === size);
                        return (
                          <Badge key={size} variant="secondary" className="text-xs px-1.5 py-0">
                            {size}: {variant?.stock_quantity ?? 0}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="default" size="sm" onClick={() => setSelectedProduct(product)} className="flex-1">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit Product
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Product: {product.name}</DialogTitle>
                        </DialogHeader>
                        <ProductForm product={product} categories={categories} onSave={() => {
                      fetchProducts();
                    }} onCancel={() => {}} />
                      </DialogContent>
                    </Dialog>
                    <ConfirmDeleteButton
                      confirmKey="delete-product"
                      title={`Delete "${product.name}"?`}
                      description="This action cannot be undone."
                      onConfirm={() => handleDeleteProduct(product.id, product.name)}
                      ariaLabel="Delete product"
                      className="inline-flex items-center justify-center rounded-md text-sm h-9 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </ConfirmDeleteButton>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, product.id)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} title="Upload product image" />
                      <Button variant="outline" size="sm" disabled={uploading} className="w-full">
                        <Upload className="w-4 h-4 mr-1" />
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </Button>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Stock: {product.stock_quantity}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>

      {filteredProducts.length === 0 && <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-muted-foreground">No products yet</p>
            <p className="text-sm text-muted-foreground">
              Click <strong>Add New Product</strong> above to build your storefront.
            </p>
          </CardContent>
        </Card>}
    </div>;
};
interface ProductFormProps {
  product: Product | null;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}
const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    short_description: product?.short_description || '',
    sku: product?.sku || '',
    price: product?.price || 0,
    sale_price: product?.sale_price || 0,
    category_id: product?.category_id || '',
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    stock_quantity: product?.stock_quantity || 0,
    manage_stock: product?.manage_stock ?? true,
    weight: product?.weight || 0,
    weight_oz: product?.weight_oz || 0,
    length_in: product?.length_in || 0,
    width_in: product?.width_in || 0,
    height_in: product?.height_in || 0,
    tags: product?.tags?.join(', ') || '',
  });

  // Variant matrix lives in its own state (not on formData) so the
  // generator + per-row editors can mutate it cheaply without re-rendering
  // every form field. Seeded from the existing sizeVariants when editing
  // a product that only had a single (size) axis.
  const seedRows: VariantRow[] = (product?.sizeVariants || []).map(v => ({
    size: v.size,
    color: '',
    sku: '',
    price: 0,
    stock_quantity: v.stock_quantity,
  }));
  const [sizesText, setSizesText] = useState((product?.sizes || []).join(', '));
  const [colorsText, setColorsText] = useState('');
  const [variantRows, setVariantRows] = useState<VariantRow[]>(seedRows);

  const generateMatrix = () => {
    const sizes = sizesText.split(',').map(s => s.trim()).filter(Boolean);
    const colors = colorsText.split(',').map(c => c.trim()).filter(Boolean);
    // Always produce at least one row per axis, even if the other axis
    // is blank — that way "Sizes only" stores still work.
    const sizeAxis = sizes.length > 0 ? sizes : [''];
    const colorAxis = colors.length > 0 ? colors : [''];
    const rows: VariantRow[] = [];
    sizeAxis.forEach(size => {
      colorAxis.forEach(color => {
        // Preserve existing rows that match this size+color combo so the
        // admin doesn't lose their inline edits when re-generating.
        const existing = variantRows.find(r => r.size === size && r.color === color);
        rows.push(existing ?? {
          size,
          color,
          sku: '',
          price: 0,
          stock_quantity: 0,
        });
      });
    });
    setVariantRows(rows);
  };
  const [saving, setSaving] = useState(false);
  const {
    toast
  } = useToast();
  const {
    uploadProductImage,
    deleteProductImage
  } = useProductImageUpload();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const productData: Record<string, any> = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      // Remove empty SKU to avoid unique constraint violations
      if (!productData.sku || productData.sku.trim() === '') {
        delete productData.sku;
      }

      let productId = product?.id;

      if (product) {
        const { error } = await supabase.from('gw_products').update(productData).eq('id', product.id);
        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase.from('gw_products').insert(productData).select('id').single();
        if (error) throw error;
        productId = newProduct.id;
      }

      // Sync variant matrix — gw_product_variants stores size on option1
      // and color on option2 (generic option1/2/3 follow Shopify's
      // convention). We blow away existing rows and re-insert because the
      // matrix is small (S/M/L × Black/White = 6 rows typical) and the
      // alternative is a fiddly diff.
      if (productId) {
        await supabase.from('gw_product_variants').delete().eq('product_id', productId);
        const rowsToInsert = variantRows
          .filter(r => r.size || r.color) // skip the all-empty placeholder row
          .map(r => {
            const titleParts = [r.size, r.color].filter(Boolean);
            return {
              product_id: productId!,
              title: titleParts.length > 0
                ? `${formData.name} - ${titleParts.join(' / ')}`
                : formData.name,
              option1: r.size || null,
              option2: r.color || null,
              price: r.price > 0 ? r.price : formData.price,
              inventory_quantity: r.stock_quantity ?? 0,
              sku: r.sku?.trim() || null,
            };
          });
        if (rowsToInsert.length > 0) {
          const { error: variantError } = await supabase
            .from('gw_product_variants')
            .insert(rowsToInsert);
          if (variantError) console.error('Error saving variants:', variantError);
        }
      }

      toast({
        title: "Success",
        description: `Product ${product ? 'updated' : 'created'} successfully`
      });
      onSave();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  return <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} required />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={formData.sku} onChange={e => setFormData({
              ...formData,
              sku: e.target.value
            })} />
            </div>
          </div>

          <div>
            <Label htmlFor="short_description">Short Description</Label>
            <Input id="short_description" value={formData.short_description} onChange={e => setFormData({
            ...formData,
            short_description: e.target.value
          })} />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={e => setFormData({
            ...formData,
            description: e.target.value
          })} rows={4} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category_id} onValueChange={value => setFormData({
              ...formData,
              category_id: value
            })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" value={formData.tags} onChange={e => setFormData({
              ...formData,
              tags: e.target.value
            })} placeholder="tag1, tag2, tag3" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch checked={formData.is_active} onCheckedChange={checked => setFormData({
              ...formData,
              is_active: checked
            })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={formData.is_featured} onCheckedChange={checked => setFormData({
              ...formData,
              is_featured: checked
            })} />
              <Label>Featured</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Regular Price ($) *</Label>
              <Input id="price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({
              ...formData,
              price: parseFloat(e.target.value) || 0
            })} required />
            </div>
            <div>
              <Label htmlFor="sale_price">Sale Price ($)</Label>
              <Input id="sale_price" type="number" step="0.01" value={formData.sale_price} onChange={e => setFormData({
              ...formData,
              sale_price: parseFloat(e.target.value) || 0
            })} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={formData.manage_stock} onCheckedChange={checked => setFormData({
            ...formData,
            manage_stock: checked
          })} />
            <Label>Manage Stock</Label>
          </div>

          {formData.manage_stock && <div>
              <Label htmlFor="stock_quantity">Stock Quantity (base — variants override)</Label>
              <Input id="stock_quantity" type="number" value={formData.stock_quantity} onChange={e => setFormData({
            ...formData,
            stock_quantity: parseInt(e.target.value) || 0
          })} />
            </div>}

          {/* Shipping dimensions — needed for EasyPost rate quotes at
              checkout. Weight in oz + dims in inches matches what every
              US carrier expects. */}
          <div className="pt-2 border-t">
            <Label className="block mb-2 text-sm font-semibold">Shipping dimensions (for live rate quotes)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="weight_oz" className="text-xs">Weight (oz)</Label>
                <Input id="weight_oz" type="number" step="0.1" value={formData.weight_oz} onChange={e => setFormData({ ...formData, weight_oz: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="length_in" className="text-xs">Length (in)</Label>
                <Input id="length_in" type="number" step="0.1" value={formData.length_in} onChange={e => setFormData({ ...formData, length_in: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="width_in" className="text-xs">Width (in)</Label>
                <Input id="width_in" type="number" step="0.1" value={formData.width_in} onChange={e => setFormData({ ...formData, width_in: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="height_in" className="text-xs">Height (in)</Label>
                <Input id="height_in" type="number" step="0.1" value={formData.height_in} onChange={e => setFormData({ ...formData, height_in: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Build a variant matrix</Label>
            <p className="text-xs text-muted-foreground">
              Enter the sizes and colors you carry. Click <strong>Generate matrix</strong> to
              create one variant per combination, then edit price, SKU, and stock per row.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sizes_text" className="text-xs">Sizes (comma separated)</Label>
              <Input id="sizes_text" placeholder="S, M, L, XL, 2XL" value={sizesText} onChange={e => setSizesText(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="colors_text" className="text-xs">Colors (comma separated)</Label>
              <Input id="colors_text" placeholder="Black, White, Heather Grey" value={colorsText} onChange={e => setColorsText(e.target.value)} />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={generateMatrix}>
            Generate matrix
          </Button>

          {variantRows.length > 0 && (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="text-left p-2">Size</th>
                    <th className="text-left p-2">Color</th>
                    <th className="text-left p-2">SKU</th>
                    <th className="text-left p-2 w-24">Price ($)</th>
                    <th className="text-left p-2 w-20">Stock</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {variantRows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-1">
                        <Input className="h-8" value={row.size} onChange={e => {
                          const next = [...variantRows]; next[idx] = { ...row, size: e.target.value }; setVariantRows(next);
                        }} />
                      </td>
                      <td className="p-1">
                        <Input className="h-8" value={row.color} onChange={e => {
                          const next = [...variantRows]; next[idx] = { ...row, color: e.target.value }; setVariantRows(next);
                        }} />
                      </td>
                      <td className="p-1">
                        <Input className="h-8" placeholder="optional" value={row.sku} onChange={e => {
                          const next = [...variantRows]; next[idx] = { ...row, sku: e.target.value }; setVariantRows(next);
                        }} />
                      </td>
                      <td className="p-1">
                        <Input className="h-8" type="number" step="0.01" placeholder={String(formData.price || 0)} value={row.price || ''} onChange={e => {
                          const next = [...variantRows]; next[idx] = { ...row, price: parseFloat(e.target.value) || 0 }; setVariantRows(next);
                        }} />
                      </td>
                      <td className="p-1">
                        <Input className="h-8" type="number" min="0" value={row.stock_quantity} onChange={e => {
                          const next = [...variantRows]; next[idx] = { ...row, stock_quantity: parseInt(e.target.value) || 0 }; setVariantRows(next);
                        }} />
                      </td>
                      <td className="p-1 text-center">
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setVariantRows(variantRows.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-muted/30 border-t">
                <Button type="button" variant="ghost" size="sm" onClick={() => setVariantRows([...variantRows, { size: '', color: '', sku: '', price: 0, stock_quantity: 0 }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add row
                </Button>
                <span className="ml-2 text-xs text-muted-foreground">
                  Leave a Price blank to fall through to the base product price.
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          {product && <div>
              <Label>Product Images</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {product.images?.map(image => <div key={image.id} className="relative group">
                    <img src={image.image_url} alt={image.alt_text} className="w-full aspect-square object-cover rounded border" />
                    <Button variant="destructive" size="sm" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={async () => {
                if (await deleteProductImage(image.image_url)) {
                  await supabase.from('gw_product_images').delete().eq('id', image.id);
                  onSave(); // Refresh
                }
              }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>)}
              </div>
            </div>}

          <div>
            <Label>Upload New Image</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input type="file" accept="image/*" onChange={e => {
              if (product) {
                // Handle upload for existing product
              }
            }} className="hidden" id="image-upload" />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
              </label>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>;
};