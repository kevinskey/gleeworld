import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus,
  Edit,
  Trash2,
  Package,
  Shirt,
  Gem,
  Palette,
  Download,
  Upload,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WardrobeItem {
  id: string;
  category: string;
  item_name: string;
  size_available: string[] | null;
  color_available: string[] | null;
  quantity_total: number;
  quantity_available: number;
  quantity_checked_out: number;
  condition: string;
  low_stock_threshold: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface WardrobeInventoryManagerProps {
  searchTerm: string;
}

export const WardrobeInventoryManager = ({ searchTerm }: WardrobeInventoryManagerProps) => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const categories = [
    { value: "dresses", label: "Dresses", icon: Shirt },
    { value: "pearls", label: "Pearls", icon: Gem },
    { value: "lipstick", label: "Lipstick", icon: Palette },
    { value: "polos", label: "Polo Shirts", icon: Shirt },
    { value: "t-shirts", label: "T-Shirts", icon: Shirt },
    { value: "garment-bags", label: "Garment Bags", icon: Package },
  ];

  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "N/A"];
  const colors = ["Black", "White", "Blue", "Red", "Pink", "Gold", "Silver", "Navy", "Burgundy"];
  const conditions = ["new", "good", "fair", "poor", "damaged"];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_wardrobe_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || Package;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "good": return "bg-blue-50 text-blue-700 border-blue-200";
      case "fair": return "bg-amber-50 text-amber-700 border-amber-200";
      case "poor": return "bg-orange-50 text-orange-700 border-orange-200";
      case "damaged": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStockStatus = (item: WardrobeItem) => {
    const threshold = item.low_stock_threshold || 5;
    if (item.quantity_available <= 0) {
      return { status: "Out of Stock", color: "bg-red-50 text-red-700 border-red-200" };
    } else if (item.quantity_available <= threshold) {
      return { status: "Low Stock", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    return { status: "In Stock", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const sizesInput = formData.get('sizes') as string;
      const colorsInput = formData.get('colors') as string;
      
      const newItem = {
        category: formData.get('category') as string,
        item_name: formData.get('item_name') as string,
        size_available: sizesInput ? sizesInput.split(',').map(s => s.trim()) : null,
        color_available: colorsInput ? colorsInput.split(',').map(c => c.trim()) : null,
        quantity_total: parseInt(formData.get('quantity_total') as string) || 0,
        quantity_available: parseInt(formData.get('quantity_available') as string) || 0,
        quantity_checked_out: 0,
        condition: formData.get('condition') as string,
        low_stock_threshold: parseInt(formData.get('low_stock_threshold') as string) || 5,
        notes: formData.get('notes') as string || null,
      };

      const { error } = await supabase
        .from('gw_wardrobe_inventory')
        .insert(newItem);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item added to inventory",
      });
      
      setIsAddDialogOpen(false);
      fetchInventory();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-3xl font-bold tracking-tight">Wardrobe Inventory</h2>
            <p className="text-sm lg:text-base text-muted-foreground">Manage dresses, accessories, and garment bags</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm lg:size-lg w-full lg:w-auto">
                <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
                Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg lg:text-2xl">Add New Inventory Item</DialogTitle>
                <DialogDescription className="text-sm lg:text-base">
                  Add a new item to the wardrobe inventory with detailed specifications
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="item_name">Item Name</Label>
                    <Input name="item_name" required />
                  </div>
                  <div>
                    <Label htmlFor="sizes">Available Sizes (comma-separated)</Label>
                    <Input name="sizes" placeholder="S, M, L, XL" />
                  </div>
                  <div>
                    <Label htmlFor="colors">Available Colors (comma-separated)</Label>
                    <Input name="colors" placeholder="Black, White, Blue" />
                  </div>
                  <div>
                    <Label htmlFor="quantity_total">Total Quantity</Label>
                    <Input name="quantity_total" type="number" min="0" required />
                  </div>
                  <div>
                    <Label htmlFor="quantity_available">Available Quantity</Label>
                    <Input name="quantity_available" type="number" min="0" required />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select name="condition" defaultValue="new">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map(condition => (
                          <SelectItem key={condition} value={condition}>
                            {condition.charAt(0).toUpperCase() + condition.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                    <Input name="low_stock_threshold" type="number" min="0" defaultValue="5" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea name="notes" placeholder="Additional notes..." />
                </div>
                <div className="flex flex-col lg:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Item
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter and Actions Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 lg:p-6 bg-muted/30 rounded-lg border">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 w-full sm:w-auto">
            <Button variant="outline" className="shadow-sm text-sm lg:text-base">
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button variant="outline" className="shadow-sm text-sm lg:text-base">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export Data</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="shadow-sm border-0 bg-background">
        <CardHeader className="pb-2 lg:pb-4 px-4 lg:px-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3 text-lg lg:text-xl">
            <div className="flex items-center gap-2 lg:gap-3">
              <Package className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              <span>Inventory Items</span>
            </div>
            <Badge variant="secondary" className="px-2 lg:px-3 py-1 text-xs lg:text-sm w-fit">
              {filteredItems.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 animate-pulse" />
              <p className="text-lg">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No items found</h3>
              <p>No items match your current search and filter criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="hidden lg:table-header-group">
                  <TableRow className="border-b">
                    <TableHead className="font-semibold text-foreground pl-4 lg:pl-6">Category & Item</TableHead>
                    <TableHead className="font-semibold text-foreground">Specifications</TableHead>
                    <TableHead className="font-semibold text-foreground">Stock</TableHead>
                    <TableHead className="font-semibold text-foreground">Condition</TableHead>
                    <TableHead className="font-semibold text-foreground pr-4 lg:pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    const stockStatus = getStockStatus(item);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        {/* Mobile Card Layout */}
                        <TableCell className="lg:hidden p-4 border-b" colSpan={5}>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-muted/50">
                                <CategoryIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground text-sm">{item.item_name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {item.category.replace('-', ' ')}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Mobile specs */}
                            {(item.size_available && item.size_available.length > 0) || (item.color_available && item.color_available.length > 0) ? (
                              <div className="space-y-2">
                                {item.size_available && item.size_available.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground w-12">Sizes:</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {item.size_available.slice(0, 3).map((size, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                                          {size}
                                        </Badge>
                                      ))}
                                      {item.size_available.length > 3 && (
                                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                                          +{item.size_available.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {item.color_available && item.color_available.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground w-12">Colors:</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {item.color_available.slice(0, 2).map((color, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                                          {color}
                                        </Badge>
                                      ))}
                                      {item.color_available.length > 2 && (
                                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                                          +{item.color_available.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null}
                            
                            {/* Mobile stock and condition */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={`${stockStatus.color} border font-medium px-2 py-1 text-xs`}>
                                  {stockStatus.status}
                                </Badge>
                                <div className="text-xs">
                                  <span className="font-medium">{item.quantity_available}</span>
                                  <span className="text-muted-foreground">/{item.quantity_total}</span>
                                </div>
                                {(stockStatus.status === "Low Stock" || stockStatus.status === "Out of Stock") && (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                              <Badge className={`${getConditionColor(item.condition)} border font-medium px-2 py-1 text-xs capitalize`}>
                                {item.condition}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Desktop Table Layout */}
                        <TableCell className="hidden lg:table-cell pl-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-muted/50">
                              <CategoryIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{item.item_name}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {item.category.replace('-', ' ')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-1">
                            {item.size_available && item.size_available.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Sizes:</span>
                                <div className="flex gap-1">
                                  {item.size_available.slice(0, 3).map((size, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                                      {size}
                                    </Badge>
                                  ))}
                                  {item.size_available.length > 3 && (
                                    <Badge variant="outline" className="text-xs px-2 py-0">
                                      +{item.size_available.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            {item.color_available && item.color_available.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Colors:</span>
                                <div className="flex gap-1">
                                  {item.color_available.slice(0, 2).map((color, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                                      {color}
                                    </Badge>
                                  ))}
                                  {item.color_available.length > 2 && (
                                    <Badge variant="outline" className="text-xs px-2 py-0">
                                      +{item.color_available.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-3">
                            <Badge className={`${stockStatus.color} border font-medium px-3 py-1`}>
                              {stockStatus.status}
                            </Badge>
                            <div className="text-sm">
                              <p className="font-medium">{item.quantity_available} available</p>
                              <p className="text-muted-foreground">of {item.quantity_total} total</p>
                            </div>
                            {(stockStatus.status === "Low Stock" || stockStatus.status === "Out of Stock") && (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge className={`${getConditionColor(item.condition)} border font-medium px-3 py-1 capitalize`}>
                            {item.condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell pr-6">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};