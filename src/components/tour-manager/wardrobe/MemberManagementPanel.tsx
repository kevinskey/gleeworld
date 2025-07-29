import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Ruler, Package, ClipboardCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MemberProfile {
  id: string;
  user_id: string;
  formal_dress_size?: string;
  polo_size?: string;
  tshirt_size?: string;
  lipstick_shade?: string;
  pearl_status: string;
  bust_measurement?: number;
  waist_measurement?: number;
  hips_measurement?: number;
  inseam_measurement?: number;
  height_measurement?: number;
  measurements_taken_date?: string;
  measurements_taken_by?: string;
  full_name?: string;
  email?: string;
  voice_part?: string;
}

const pearlStatusColors = {
  unassigned: 'bg-gray-100 text-gray-800',
  assigned: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  replaced: 'bg-blue-100 text-blue-800'
};

export const MemberManagementPanel = () => {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [showMeasurementsDialog, setShowMeasurementsDialog] = useState(false);
  const [measurements, setMeasurements] = useState({
    bust_measurement: '',
    waist_measurement: '',
    hips_measurement: '',
    inseam_measurement: '',
    height_measurement: ''
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_member_wardrobe_profiles')
        .select('*')
        .order('profiles(full_name)', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeMeasurements = async () => {
    if (!selectedMember) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('gw_member_wardrobe_profiles')
        .update({
          bust_measurement: parseFloat(measurements.bust_measurement) || null,
          waist_measurement: parseFloat(measurements.waist_measurement) || null,
          hips_measurement: parseFloat(measurements.hips_measurement) || null,
          inseam_measurement: parseFloat(measurements.inseam_measurement) || null,
          height_measurement: parseFloat(measurements.height_measurement) || null,
          measurements_taken_date: new Date().toISOString().split('T')[0],
          measurements_taken_by: user.id
        })
        .eq('id', selectedMember.id);

      if (error) throw error;

      toast.success('Measurements saved successfully');
      setShowMeasurementsDialog(false);
      setSelectedMember(null);
      setMeasurements({
        bust_measurement: '',
        waist_measurement: '',
        hips_measurement: '',
        inseam_measurement: '',
        height_measurement: ''
      });
      fetchMembers();
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast.error('Failed to save measurements');
    }
  };

  const openMeasurementsDialog = (member: MemberProfile) => {
    setSelectedMember(member);
    setMeasurements({
      bust_measurement: member.bust_measurement?.toString() || '',
      waist_measurement: member.waist_measurement?.toString() || '',
      hips_measurement: member.hips_measurement?.toString() || '',
      inseam_measurement: member.inseam_measurement?.toString() || '',
      height_measurement: member.height_measurement?.toString() || ''
    });
    setShowMeasurementsDialog(true);
  };

  const filteredMembers = members.filter(member => 
    member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map(member => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{member.full_name || 'Unknown'}</CardTitle>
                  <p className="text-sm text-muted-foreground">{member.voice_part}</p>
                </div>
                <Badge className={pearlStatusColors[member.pearl_status as keyof typeof pearlStatusColors]}>
                  {member.pearl_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sizes */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Dress:</span>
                    <span className="ml-1">{member.formal_dress_size || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Polo:</span>
                    <span className="ml-1">{member.polo_size || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="font-medium">T-Shirt:</span>
                    <span className="ml-1">{member.tshirt_size || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Lipstick:</span>
                    <span className="ml-1">{member.lipstick_shade || 'Not set'}</span>
                  </div>
                </div>

                {/* Measurements Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Measurements:</span>
                  {member.measurements_taken_date ? (
                    <span className="text-green-600">
                      Taken {new Date(member.measurements_taken_date).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-orange-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not taken
                    </span>
                  )}
                </div>

                {/* Measurements Details */}
                {member.measurements_taken_date && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {member.bust_measurement && <div>Bust: {member.bust_measurement}"</div>}
                    {member.waist_measurement && <div>Waist: {member.waist_measurement}"</div>}
                    {member.hips_measurement && <div>Hips: {member.hips_measurement}"</div>}
                    {member.height_measurement && <div>Height: {member.height_measurement}"</div>}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openMeasurementsDialog(member)}
                    className="text-xs"
                  >
                    <Ruler className="h-3 w-3 mr-1" />
                    Measurements
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    Assign Outfit
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    Check In/Out
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Report Issue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Measurements Dialog */}
      <Dialog open={showMeasurementsDialog} onOpenChange={setShowMeasurementsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Take Measurements - {selectedMember?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bust Measurement (inches)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurements.bust_measurement}
                onChange={(e) => setMeasurements({...measurements, bust_measurement: e.target.value})}
                placeholder="e.g., 34.5"
              />
            </div>
            <div>
              <Label>Waist Measurement (inches)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurements.waist_measurement}
                onChange={(e) => setMeasurements({...measurements, waist_measurement: e.target.value})}
                placeholder="e.g., 28.0"
              />
            </div>
            <div>
              <Label>Hips Measurement (inches)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurements.hips_measurement}
                onChange={(e) => setMeasurements({...measurements, hips_measurement: e.target.value})}
                placeholder="e.g., 38.5"
              />
            </div>
            <div>
              <Label>Inseam Measurement (inches)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurements.inseam_measurement}
                onChange={(e) => setMeasurements({...measurements, inseam_measurement: e.target.value})}
                placeholder="e.g., 30.0"
              />
            </div>
            <div>
              <Label>Height (inches)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurements.height_measurement}
                onChange={(e) => setMeasurements({...measurements, height_measurement: e.target.value})}
                placeholder="e.g., 65.5"
              />
            </div>
            <Button onClick={handleTakeMeasurements} className="w-full">
              Save Measurements
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No members found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Member profiles will appear here once they're added to the system
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};