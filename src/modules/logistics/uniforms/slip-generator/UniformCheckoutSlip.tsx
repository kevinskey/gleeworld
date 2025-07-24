import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Printer, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface UniformAssignment {
  id: string;
  item: string;
  size: string;
  issued_date: string;
  return_due: string | null;
  returned: boolean;
  condition_notes: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  voice_part?: string;
}

interface CheckoutSlipProps {
  userId: string;
  userName: string;
  assignments: UniformAssignment[];
  issuedBy: string;
  onClose?: () => void;
}

const CheckoutSlipComponent = ({ userId, userName, assignments, issuedBy }: CheckoutSlipProps) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, voice_part')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const today = format(new Date(), 'MMMM dd, yyyy');

  return (
    <div className="checkout-slip bg-white p-8 max-w-4xl mx-auto print:shadow-none">
      <style>{`
        @media print {
          .checkout-slip {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
      
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-primary pb-4">
        <h1 className="text-2xl font-bold text-primary">Spelman College Glee Club</h1>
        <h2 className="text-xl font-semibold text-gray-700">Uniform Checkout Slip</h2>
      </div>

      {/* Member Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="mb-2">
            <span className="font-semibold">Member Name:</span> {userProfile?.full_name || userName}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Voice Part:</span> {userProfile?.voice_part || '_____________'}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Academic Year:</span> _____________
          </div>
        </div>
        <div>
          <div className="mb-2">
            <span className="font-semibold">Issue Date:</span> {today}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Issued By:</span> {issuedBy}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Email:</span> {userProfile?.email}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Assigned Items:</h3>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Item</th>
              <th className="border border-gray-300 p-2 text-left">Size</th>
              <th className="border border-gray-300 p-2 text-left">Condition</th>
              <th className="border border-gray-300 p-2 text-left">Return Due</th>
              <th className="border border-gray-300 p-2 text-center">Returned</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2">{assignment.item}</td>
                <td className="border border-gray-300 p-2">{assignment.size}</td>
                <td className="border border-gray-300 p-2">
                  {assignment.condition_notes || 'Good'}
                </td>
                <td className="border border-gray-300 p-2">
                  {assignment.return_due ? format(new Date(assignment.return_due), 'MM/dd/yyyy') : 'N/A'}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {assignment.returned ? '✓' : '☐'}
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-gray-300 p-4 text-center text-gray-500">
                  No items assigned
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Additional Notes:</h3>
        <div className="border border-gray-300 min-h-[100px] p-4">
          {assignments.some(a => a.condition_notes) && (
            <div className="space-y-2">
              {assignments.filter(a => a.condition_notes).map((assignment, index) => (
                <div key={index} className="text-sm">
                  <strong>{assignment.item}:</strong> {assignment.condition_notes}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="mb-2">
            <span className="font-semibold">Member Signature:</span>
          </div>
          <div className="border-b-2 border-gray-400 h-12 mb-2"></div>
          <div className="text-sm text-gray-600">Date: _______________</div>
        </div>
        <div>
          <div className="mb-2">
            <span className="font-semibold">Return Confirmation:</span>
          </div>
          <div className="border-b-2 border-gray-400 h-12 mb-2"></div>
          <div className="text-sm text-gray-600">Admin Signature & Date: _______________</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-sm text-gray-600 text-center">
        <p>Please return all items in good condition by the due date.</p>
        <p>Contact the Glee Club office for any questions or concerns.</p>
      </div>
    </div>
  );
};

export const UniformCheckoutSlipGenerator = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignments, setAssignments] = useState<UniformAssignment[]>([]);
  const [issuedBy, setIssuedBy] = useState('');
  const [showSlip, setShowSlip] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('gw_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        setIssuedBy(data?.full_name || 'Admin');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserAssignments = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_uniform_assignments')
        .select('*')
        .eq('user_id', userId)
        .order('issued_date', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    if (userId) {
      fetchUserAssignments(userId);
    }
  };

  const generateSlip = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a member",
        variant: "destructive"
      });
      return;
    }
    setShowSlip(true);
  };

  const printSlip = () => {
    window.print();
  };

  const generatePDF = () => {
    const selectedUser = users.find(u => u.user_id === selectedUserId);
    if (!selectedUser) return;

    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Spelman College Glee Club", 105, 20, { align: "center" });
    pdf.setFontSize(14);
    pdf.text("Uniform Checkout Slip", 105, 30, { align: "center" });
    
    // Member info
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Member: ${selectedUser.full_name}`, 20, 50);
    pdf.text(`Email: ${selectedUser.email}`, 20, 60);
    pdf.text(`Issue Date: ${format(new Date(), 'MMMM dd, yyyy')}`, 20, 70);
    pdf.text(`Issued By: ${issuedBy}`, 120, 70);
    
    // Items table header
    let y = 90;
    pdf.setFont("helvetica", "bold");
    pdf.text("Item", 20, y);
    pdf.text("Size", 80, y);
    pdf.text("Condition", 120, y);
    pdf.text("Due Date", 160, y);
    
    // Items
    pdf.setFont("helvetica", "normal");
    assignments.forEach((assignment, index) => {
      y += 10;
      pdf.text(assignment.item, 20, y);
      pdf.text(assignment.size, 80, y);
      pdf.text(assignment.condition_notes || 'Good', 120, y);
      pdf.text(assignment.return_due ? format(new Date(assignment.return_due), 'MM/dd/yyyy') : 'N/A', 160, y);
    });
    
    // Signature lines
    y += 30;
    pdf.text("Member Signature: ________________________________", 20, y);
    y += 20;
    pdf.text("Return Confirmation: ______________________________", 20, y);
    
    pdf.save(`uniform-checkout-${selectedUser.full_name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Uniform Checkout Slip Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Select Member</Label>
          <Select value={selectedUserId} onValueChange={handleUserSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a member to generate slip" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.full_name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && (
          <div className="flex gap-2">
            <Dialog open={showSlip} onOpenChange={setShowSlip}>
              <DialogTrigger asChild>
                <Button onClick={generateSlip} disabled={loading}>
                  <Printer className="h-4 w-4 mr-2" />
                  Generate Slip
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Uniform Checkout Slip</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2 print:hidden">
                    <Button onClick={printSlip} variant="outline">
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button onClick={generatePDF} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                  <CheckoutSlipComponent
                    userId={selectedUserId}
                    userName={users.find(u => u.user_id === selectedUserId)?.full_name || ''}
                    assignments={assignments}
                    issuedBy={issuedBy}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {selectedUserId && assignments.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Preview: {assignments.length} items assigned</h4>
            <div className="space-y-1">
              {assignments.slice(0, 3).map((assignment, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {assignment.item} ({assignment.size})
                </div>
              ))}
              {assignments.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  • ... and {assignments.length - 3} more items
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};