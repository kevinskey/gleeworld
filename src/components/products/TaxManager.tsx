import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Calculator, Plus, Pencil, Trash2, Search, RefreshCw
} from 'lucide-react';

interface TaxRegion {
  id: string;
  region_key: string;
  region_name: string;
  rate: number;
  shipping_taxable: boolean;
  digital_taxable: boolean;
  is_active: boolean;
  created_at: string;
}

export const TaxManager = () => {
  const [taxRegions, setTaxRegions] = useState<TaxRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<TaxRegion | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    region_key: '',
    region_name: '',
    rate: 0,
    shipping_taxable: false,
    digital_taxable: true,
    is_active: true
  });

  useEffect(() => {
    fetchTaxRegions();
  }, []);

  const fetchTaxRegions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_tax_regions')
        .select('*')
        .order('region_name', { ascending: true });

      if (error) throw error;
      setTaxRegions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch tax regions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingRegion) {
        const { error } = await supabase
          .from('gw_tax_regions')
          .update(formData)
          .eq('id', editingRegion.id);

        if (error) throw error;
        toast({ title: "Success", description: "Tax region updated" });
      } else {
        const { error } = await supabase
          .from('gw_tax_regions')
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Success", description: "Tax region created" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTaxRegions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax region?')) return;

    try {
      const { error } = await supabase
        .from('gw_tax_regions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Tax region deleted" });
      fetchTaxRegions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_tax_regions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchTaxRegions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      region_key: '',
      region_name: '',
      rate: 0,
      shipping_taxable: false,
      digital_taxable: true,
      is_active: true
    });
    setEditingRegion(null);
  };

  const openEditDialog = (region: TaxRegion) => {
    setEditingRegion(region);
    setFormData({
      region_key: region.region_key,
      region_name: region.region_name,
      rate: region.rate,
      shipping_taxable: region.shipping_taxable,
      digital_taxable: region.digital_taxable,
      is_active: region.is_active
    });
    setIsDialogOpen(true);
  };

  const filteredRegions = taxRegions.filter(r => 
    r.region_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.region_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tax regions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchTaxRegions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Region
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRegion ? 'Edit Tax Region' : 'Create Tax Region'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Region Key (e.g., US-GA)</Label>
                <Input
                  value={formData.region_key}
                  onChange={(e) => setFormData({...formData, region_key: e.target.value.toUpperCase()})}
                  placeholder="US-GA"
                />
              </div>
              <div className="space-y-2">
                <Label>Region Name</Label>
                <Input
                  value={formData.region_name}
                  onChange={(e) => setFormData({...formData, region_name: e.target.value})}
                  placeholder="Georgia"
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.rate * 100}
                  onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value) / 100 || 0})}
                  placeholder="7.00"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Tax Shipping</Label>
                <Switch
                  checked={formData.shipping_taxable}
                  onCheckedChange={(checked) => setFormData({...formData, shipping_taxable: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Tax Digital Products</Label>
                <Switch
                  checked={formData.digital_taxable}
                  onCheckedChange={(checked) => setFormData({...formData, digital_taxable: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingRegion ? 'Update' : 'Create'} Tax Region
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region Key</TableHead>
                <TableHead>Region Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Tax Shipping</TableHead>
                <TableHead>Tax Digital</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading tax regions...
                  </TableCell>
                </TableRow>
              ) : filteredRegions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tax regions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-mono">{region.region_key}</TableCell>
                    <TableCell>{region.region_name}</TableCell>
                    <TableCell>{(region.rate * 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      {region.shipping_taxable ? '✓' : '—'}
                    </TableCell>
                    <TableCell>
                      {region.digital_taxable ? '✓' : '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={region.is_active}
                        onCheckedChange={() => toggleActive(region.id, region.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(region)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(region.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
