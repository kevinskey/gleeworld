import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Edit, 
  Send, 
  FileSignature,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Contract {
  id: string;
  title: string;
  performer_name: string;
  performer_email: string;
  event_name: string;
  event_date: string;
  event_location: string;
  fee_amount: number;
  status: 'draft' | 'sent' | 'signed' | 'completed';
  created_at: string;
  updated_at: string;
  contract_type: 'performer' | 'venue' | 'vendor';
  content?: string;
}

interface ContractManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const ContractManager = ({ user }: ContractManagerProps) => {
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: '1',
      title: 'Solo Performance Contract - Spring Gala',
      performer_name: 'Maria Johnson',
      performer_email: 'maria.johnson@example.com',
      event_name: 'Spring Gala 2024',
      event_date: '2024-04-15',
      event_location: 'Atlanta Convention Center',
      fee_amount: 2500,
      status: 'draft',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      contract_type: 'performer'
    },
    {
      id: '2',
      title: 'Featured Artist Contract - Homecoming',
      performer_name: 'Dr. Angela Davis',
      performer_email: 'angela.davis@music.edu',
      event_name: 'Homecoming Concert',
      event_date: '2024-10-20',
      event_location: 'Spelman College Auditorium',
      fee_amount: 5000,
      status: 'sent',
      created_at: '2024-01-10T14:30:00Z',
      updated_at: '2024-01-12T09:15:00Z',
      contract_type: 'performer'
    }
  ]);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newContract, setNewContract] = useState<{
    title: string;
    performer_name: string;
    performer_email: string;
    event_name: string;
    event_date: string;
    event_location: string;
    fee_amount: number;
    contract_type: 'performer' | 'venue' | 'vendor';
    content: string;
  }>({
    title: '',
    performer_name: '',
    performer_email: '',
    event_name: '',
    event_date: '',
    event_location: '',
    fee_amount: 0,
    contract_type: 'performer',
    content: ''
  });

  const { toast } = useToast();

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Contract['status']) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'signed':
        return <FileSignature className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const generateContractContent = (contract: typeof newContract) => {
    return `
PERFORMER AGREEMENT

This agreement is entered into between the Spelman College Glee Club and ${contract.performer_name} for the event "${contract.event_name}".

Event Details:
- Event: ${contract.event_name}
- Date: ${new Date(contract.event_date).toLocaleDateString()}
- Location: ${contract.event_location}
- Performance Fee: $${contract.fee_amount.toLocaleString()}

Terms and Conditions:
1. The performer agrees to provide a professional musical performance as agreed upon.
2. Payment will be made within 30 days of the completed performance.
3. The performer is responsible for their own travel and accommodation arrangements.
4. This contract is subject to the standard terms and conditions of the Spelman College Glee Club.

Performer Information:
- Name: ${contract.performer_name}
- Email: ${contract.performer_email}

By signing below, both parties agree to the terms outlined in this contract.

_____________________                    _____________________
Performer Signature                      Tour Manager Signature

Date: _______________                     Date: _______________
    `.trim();
  };

  const createContract = () => {
    if (!newContract.title || !newContract.performer_name || !newContract.performer_email) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const contract: Contract = {
      id: Date.now().toString(),
      ...newContract,
      content: generateContractContent(newContract),
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setContracts(prev => [contract, ...prev]);
    setIsCreating(false);
    setNewContract({
      title: '',
      performer_name: '',
      performer_email: '',
      event_name: '',
      event_date: '',
      event_location: '',
      fee_amount: 0,
      contract_type: 'performer',
      content: ''
    });

    toast({
      title: "Contract created",
      description: "The contract has been created successfully.",
    });
  };

  const sendContract = (contractId: string) => {
    setContracts(prev => prev.map(contract => 
      contract.id === contractId 
        ? { ...contract, status: 'sent', updated_at: new Date().toISOString() }
        : contract
    ));

    toast({
      title: "Contract sent",
      description: "The contract has been sent to the performer.",
    });
  };

  const statusCounts = {
    all: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    sent: contracts.filter(c => c.status === 'sent').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    completed: contracts.filter(c => c.status === 'completed').length
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Performer Contracts</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage contracts for guest performers and collaborators
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Performer Contract</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contract Title</label>
                  <Input
                    placeholder="e.g., Solo Performance Contract"
                    value={newContract.title}
                    onChange={(e) => setNewContract(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contract Type</label>
                  <Select 
                    value={newContract.contract_type} 
                    onValueChange={(value: 'performer' | 'venue' | 'vendor') => 
                      setNewContract(prev => ({ ...prev, contract_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performer">Performer</SelectItem>
                      <SelectItem value="venue">Venue</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Performer Name</label>
                  <Input
                    placeholder="Full name"
                    value={newContract.performer_name}
                    onChange={(e) => setNewContract(prev => ({ ...prev, performer_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Performer Email</label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newContract.performer_email}
                    onChange={(e) => setNewContract(prev => ({ ...prev, performer_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Name</label>
                  <Input
                    placeholder="e.g., Spring Gala 2024"
                    value={newContract.event_name}
                    onChange={(e) => setNewContract(prev => ({ ...prev, event_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Date</label>
                  <Input
                    type="date"
                    value={newContract.event_date}
                    onChange={(e) => setNewContract(prev => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Location</label>
                  <Input
                    placeholder="Venue or address"
                    value={newContract.event_location}
                    onChange={(e) => setNewContract(prev => ({ ...prev, event_location: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Performance Fee ($)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newContract.fee_amount || ''}
                    onChange={(e) => setNewContract(prev => ({ ...prev, fee_amount: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Terms (Optional)</label>
                <Textarea
                  placeholder="Any additional terms or requirements..."
                  value={newContract.content}
                  onChange={(e) => setNewContract(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={createContract}>
                  Create Contract
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status} className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {status === 'all' ? 'Total' : status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contracts List */}
      <div className="grid gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{contract.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {contract.performer_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(contract.event_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${contract.fee_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <Badge className={`${getStatusColor(contract.status)} gap-1`}>
                  {getStatusIcon(contract.status)}
                  {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Event Details</h4>
                <p className="text-sm text-muted-foreground">
                  {contract.event_name} at {contract.event_location}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(contract.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {contract.status === 'draft' && (
                    <Button size="sm" onClick={() => sendContract(contract.id)}>
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  )}
                  {contract.status === 'sent' && (
                    <Button variant="outline" size="sm">
                      <Clock className="h-4 w-4 mr-1" />
                      Pending
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contracts created yet</h3>
              <p className="text-muted-foreground">
                Create your first performer contract to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};