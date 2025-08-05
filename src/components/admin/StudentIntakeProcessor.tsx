import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentIntake {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
  academic_year: string;
  major: string | null;
  dress_size: string | null;
  bust_measurement: number | null;
  waist_measurement: number | null;
  hip_measurement: number | null;
  height_feet: number | null;
  height_inches: number | null;
  shoe_size: string | null;
  intake_status: string;
  size_verified: boolean;
  created_at: string;
  assigned_dress_id: string | null;
  assigned_shoes_id: string | null;
}

interface WardrobeItem {
  id: string;
  item_name: string;
  category: string;
  size_available: string[] | null;
}

export const StudentIntakeProcessor = () => {
  const [intakes, setIntakes] = useState<StudentIntake[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [selectedIntake, setSelectedIntake] = useState<StudentIntake | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [intakeResult, wardrobeResult] = await Promise.all([
        supabase.from('gw_student_intake').select('*').order('created_at', { ascending: false }),
        supabase.from('gw_wardrobe_inventory').select('id, item_name, category, size_available')
      ]);

      if (intakeResult.error) throw intakeResult.error;
      if (wardrobeResult.error) throw wardrobeResult.error;

      setIntakes(intakeResult.data || []);
      setWardrobeItems(wardrobeResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load intake data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateIntakeStatus = async (intakeId: string, status: string, verified: boolean = false) => {
    try {
      setProcessing(true);
      const updateData: any = { 
        intake_status: status,
        processed_at: new Date().toISOString(),
      };

      if (verified) {
        updateData.size_verified = true;
        updateData.size_verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('gw_student_intake')
        .update(updateData)
        .eq('id', intakeId);

      if (error) throw error;

      // Update profile if approved
      if (status === 'approved' && selectedIntake) {
        await updateProfile(selectedIntake);
      }

      toast({
        title: "Success",
        description: `Intake ${status}`,
      });

      fetchData();
      setSelectedIntake(null);
    } catch (error) {
      console.error('Error updating intake:', error);
      toast({
        title: "Error",
        description: "Failed to update intake",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const updateProfile = async (intake: StudentIntake) => {
    try {
      const profileUpdate = {
        dress_size: intake.dress_size,
        measurements: {
          bust: intake.bust_measurement,
          waist: intake.waist_measurement,
          hip: intake.hip_measurement,
          height_feet: intake.height_feet,
          height_inches: intake.height_inches,
          shoe_size: intake.shoe_size
        },
        wardrobe_assignments: {
          dress_id: intake.assigned_dress_id,
          shoes_id: intake.assigned_shoes_id
        }
      };

      const { error } = await supabase
        .from('gw_profiles')
        .update(profileUpdate)
        .eq('user_id', intake.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const assignWardrobe = async (intakeId: string, dressId: string | null, shoesId: string | null) => {
    try {
      const { error } = await supabase
        .from('gw_student_intake')
        .update({
          assigned_dress_id: dressId,
          assigned_shoes_id: shoesId
        })
        .eq('id', intakeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Wardrobe assignments updated",
      });

      fetchData();
    } catch (error) {
      console.error('Error assigning wardrobe:', error);
      toast({
        title: "Error",
        description: "Failed to assign wardrobe",
        variant: "destructive",
      });
    }
  };

  const getStatusCounts = () => {
    return {
      pending: intakes.filter(i => i.intake_status === 'pending').length,
      verified: intakes.filter(i => i.intake_status === 'verified').length,
      approved: intakes.filter(i => i.intake_status === 'approved').length,
      rejected: intakes.filter(i => i.intake_status === 'rejected').length,
      total: intakes.length
    };
  };

  const counts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 border rounded">
          <div className="text-2xl font-bold">{counts.total}</div>
          <div className="text-sm text-muted-foreground">Total Intakes</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-2xl font-bold text-orange-600">{counts.pending}</div>
          <div className="text-sm text-muted-foreground">Pending Review</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-2xl font-bold text-blue-600">{counts.verified}</div>
          <div className="text-sm text-muted-foreground">Size Verified</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
          <div className="text-sm text-muted-foreground">Rejected</div>
        </div>
      </div>

      {/* Intake Processing Table */}
      <div className="border rounded">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Student Intake Processing</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Info</TableHead>
                <TableHead>Academic Info</TableHead>
                <TableHead>Measurements</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wardrobe</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : intakes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">No intakes to process</TableCell>
                </TableRow>
              ) : (
                intakes.map((intake) => (
                  <TableRow key={intake.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{intake.full_name}</div>
                        <div className="text-sm text-muted-foreground">{intake.email}</div>
                        <div className="text-sm text-muted-foreground">ID: {intake.student_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{intake.academic_year}</div>
                        <div className="text-sm text-muted-foreground">{intake.major}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>Dress: {intake.dress_size || '-'}</div>
                        <div>Shoes: {intake.shoe_size || '-'}</div>
                        <div>Height: {intake.height_feet ? `${intake.height_feet}'${intake.height_inches}"` : '-'}</div>
                        <div>Bust: {intake.bust_measurement || '-'}</div>
                        <div>Waist: {intake.waist_measurement || '-'}</div>
                        <div>Hip: {intake.hip_measurement || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className={`text-sm font-medium ${
                          intake.intake_status === 'pending' ? 'text-orange-600' :
                          intake.intake_status === 'verified' ? 'text-blue-600' :
                          intake.intake_status === 'approved' ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {intake.intake_status.toUpperCase()}
                        </div>
                        {intake.size_verified && (
                          <div className="text-xs text-green-600">✓ Verified</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Select 
                          value={intake.assigned_dress_id || ""} 
                          onValueChange={(value) => assignWardrobe(intake.id, value || null, intake.assigned_shoes_id)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Dress" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {wardrobeItems
                              .filter(item => item.category === 'dresses')
                              .map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={intake.assigned_shoes_id || ""} 
                          onValueChange={(value) => assignWardrobe(intake.id, intake.assigned_dress_id, value || null)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Shoes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {wardrobeItems
                              .filter(item => item.category === 'shoes')
                              .map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {intake.intake_status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateIntakeStatus(intake.id, 'verified', true)}
                              disabled={processing}
                            >
                              Verify
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateIntakeStatus(intake.id, 'approved')}
                              disabled={processing}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateIntakeStatus(intake.id, 'rejected')}
                              disabled={processing}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {intake.intake_status === 'verified' && (
                          <Button 
                            size="sm"
                            onClick={() => updateIntakeStatus(intake.id, 'approved')}
                            disabled={processing}
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};