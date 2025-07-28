import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, LogIn, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface CheckInData {
  item_name: string;
  item_type: string;
  item_condition: string;
  action_type: string;
  checked_to_user_id?: string;
  notes: string;
}

interface CheckInRecord {
  id: string;
  item_name: string;
  item_type: string;
  action_type: string;
  created_at: string;
  checked_by: string;
}

export const CheckInOutTool = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInRecord[]>([]);

  const form = useForm<CheckInData>({
    defaultValues: {
      item_name: "",
      item_type: "dress",
      item_condition: "good",
      action_type: "check_out",
      notes: "",
    },
  });

  useEffect(() => {
    fetchRecentCheckIns();
  }, [user]);

  const fetchRecentCheckIns = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gw_executive_board_checkins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentCheckIns(data || []);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    }
  };

  const onSubmit = async (data: CheckInData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('gw_executive_board_checkins')
        .insert({
          item_name: data.item_name,
          item_type: data.item_type,
          item_condition: data.item_condition,
          action_type: data.action_type,
          checked_by: user.id,
          notes: data.notes,
        });

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_executive_board_action', {
        p_action_type: 'item_checkin',
        p_action_description: `${data.action_type === 'check_out' ? 'Checked out' : 'Checked in'} ${data.item_name}`,
        p_related_entity_type: 'checkin',
      });

      toast.success(`Item ${data.action_type === 'check_out' ? 'checked out' : 'checked in'} successfully!`);
      form.reset();
      setOpen(false);
      fetchRecentCheckIns();
    } catch (error) {
      console.error('Error processing check-in:', error);
      toast.error("Failed to process check-in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Check-In/Check-Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentCheckIns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Activity</h4>
            {recentCheckIns.map((record) => (
              <div key={record.id} className="flex items-center justify-between text-sm">
                <span>{record.item_name}</span>
                <div className="flex items-center gap-2">
                  {record.action_type === 'check_out' ? (
                    <LogOut className="h-3 w-3 text-orange-500" />
                  ) : (
                    <LogIn className="h-3 w-3 text-green-500" />
                  )}
                  <span className="text-muted-foreground">
                    {format(new Date(record.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Check In/Out Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Check In/Out Item</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="action_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="check_out">Check Out</SelectItem>
                          <SelectItem value="check_in">Check In</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="item_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter item name..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="item_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dress">Dress</SelectItem>
                          <SelectItem value="folder">Folder</SelectItem>
                          <SelectItem value="merchandise">Merchandise</SelectItem>
                          <SelectItem value="gear">Gear</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="item_condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processing..." : "Submit"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};