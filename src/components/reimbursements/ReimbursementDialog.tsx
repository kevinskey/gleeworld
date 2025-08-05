import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, DollarSign, Calendar, Building2, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReimbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ReimbursementDialog = ({ open, onOpenChange, onSuccess }: ReimbursementDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_email: '',
    amount: '',
    description: '',
    purchase_date: '',
    vendor_name: '',
    business_purpose: '',
    category: 'general',
    receipt_url: '',
    receipt_filename: ''
  });

  // Load user data when dialog opens
  useEffect(() => {
    if (open && user) {
      setFormData(prev => ({
        ...prev,
        requester_email: user.email || '',
        requester_name: '' // Will be filled from profile if available
      }));
      
      // Fetch user profile data
      fetchUserProfile();
    }
  }, [open, user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      
      if (data?.full_name) {
        setFormData(prev => ({
          ...prev,
          requester_name: data.full_name
        }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        receipt_url: data.publicUrl,
        receipt_filename: file.name
      }));

      toast({
        title: "Success",
        description: "Receipt uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('gw_reimbursement_requests')
        .insert([{
          user_id: user.id,
          requester_name: formData.requester_name,
          requester_email: formData.requester_email,
          amount: parseFloat(formData.amount),
          description: formData.description,
          purchase_date: formData.purchase_date,
          vendor_name: formData.vendor_name,
          business_purpose: formData.business_purpose,
          category: formData.category,
          receipt_url: formData.receipt_url,
          receipt_filename: formData.receipt_filename,
          status: 'pending_treasurer'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reimbursement request submitted successfully"
      });

      // Reset form
      setFormData({
        requester_name: '',
        requester_email: user.email || '',
        amount: '',
        description: '',
        purchase_date: '',
        vendor_name: '',
        business_purpose: '',
        category: 'general',
        receipt_url: '',
        receipt_filename: ''
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting reimbursement request:', error);
      toast({
        title: "Error",
        description: "Failed to submit reimbursement request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-6 h-6 text-brand-primary" />
            Reimbursement Request
          </DialogTitle>
        </DialogHeader>
        
        <Card className="border-brand-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-brand-primary">Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requester_name">Full Name *</Label>
                  <Input
                    id="requester_name"
                    value={formData.requester_name}
                    onChange={(e) => setFormData({...formData, requester_name: e.target.value})}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="requester_email">Email *</Label>
                  <Input
                    id="requester_email"
                    type="email"
                    value={formData.requester_email}
                    onChange={(e) => setFormData({...formData, requester_email: e.target.value})}
                    placeholder="your.email@spelman.edu"
                    required
                  />
                </div>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Amount *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="purchase_date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Purchase Date *
                  </Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Vendor and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor_name" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Vendor/Store *
                  </Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                    placeholder="e.g., Office Depot, Amazon, etc."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="office_supplies">Office Supplies</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="meals">Meals & Entertainment</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="materials">Materials</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detailed description of the purchase..."
                  rows={3}
                  required
                />
              </div>

              {/* Business Purpose */}
              <div>
                <Label htmlFor="business_purpose" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Business Purpose *
                </Label>
                <Textarea
                  id="business_purpose"
                  value={formData.business_purpose}
                  onChange={(e) => setFormData({...formData, business_purpose: e.target.value})}
                  placeholder="Explain how this purchase supports Glee Club activities..."
                  rows={3}
                  required
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <Label htmlFor="receipt" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Receipt Upload
                </Label>
                <div className="mt-2">
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {uploading && (
                    <p className="text-sm text-muted-foreground mt-1">Uploading...</p>
                  )}
                  {formData.receipt_filename && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{formData.receipt_filename}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || uploading}
                  className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90"
                >
                  {loading ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};