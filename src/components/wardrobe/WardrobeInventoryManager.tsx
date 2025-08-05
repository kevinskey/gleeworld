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
      case "new": return "bg-green-100 text-green-800";
      case "good": return "bg-blue-100 text-blue-800";
      case "fair": return "bg-yellow-100 text-yellow-800";
      case "poor": return "bg-orange-100 text-orange-800";
      case "damaged": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStockStatus = (item: WardrobeItem) => {
    const threshold = item.low_stock_threshold || 5;
    if (item.quantity_available <= 0) {
      return { status: "out-of-stock", color: "bg-red-100 text-red-800" };
    } else if (item.quantity_available <= threshold) {
      return { status: "low-stock", color: "bg-orange-100 text-orange-800" };
    }
    return { status: "in-stock", color: "bg-green-100 text-green-800" };
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
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Add a new item to the wardrobe inventory
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                <div className="flex justify-end gap-2">
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
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading inventory...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sizes</TableHead>
                    <TableHead>Colors</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    const stockStatus = getStockStatus(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4" />
                            <span className="capitalize">{item.category.replace('-', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          {item.size_available ? item.size_available.join(", ") : "-"}
                        </TableCell>
                        <TableCell>
                          {item.color_available ? item.color_available.join(", ") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={stockStatus.color}>
                              {item.quantity_available}/{item.quantity_total}
                            </Badge>
                            {stockStatus.status === "low-stock" && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                            {stockStatus.status === "out-of-stock" && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getConditionColor(item.condition)}>
                            {item.condition}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
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