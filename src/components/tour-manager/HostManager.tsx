import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Search, Plus, Star, Calendar, MapPin, Mail, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Host {
  id: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  organization_name?: string;
  organization_type?: string;
  website_url?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  venue_name?: string;
  venue_capacity?: number;
  venue_type?: string;
  priority_level?: number;
  notes?: string;
  total_performances?: number;
  last_performance_date?: string;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface HostManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const HostManager = ({ user }: HostManagerProps) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [filteredHosts, setFilteredHosts] = useState<Host[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  // New host form state
  const [newHost, setNewHost] = useState({
    contact_name: '',
    organization_name: '',
    organization_type: 'venue',
    contact_email: '',
    contact_phone: '',
    website_url: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    priority_level: 3,
    notes: '',
    source: 'manual_entry' as const
  });

  useEffect(() => {
    fetchHosts();
  }, []);

  useEffect(() => {
    filterHosts();
  }, [hosts, searchTerm, filterType, filterPriority]);

  const fetchHosts = async () => {
    try {
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setHosts(data || []);
    } catch (error) {
      console.error('Error fetching hosts:', error);
      toast.error('Failed to load hosts');
    } finally {
      setLoading(false);
    }
  };

  const filterHosts = () => {
    let filtered = hosts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(host => 
        host.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        host.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        host.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        host.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        host.venue_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(host => host.organization_type === filterType);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      const priorityNumber = filterPriority === 'high' ? 1 : filterPriority === 'medium' ? 3 : 5;
      filtered = filtered.filter(host => host.priority_level === priorityNumber);
    }

    setFilteredHosts(filtered);
  };

  const handleAddHost = async () => {
    try {
      const { data, error } = await supabase
        .from('hosts')
        .insert([newHost])
        .select()
        .single();

      if (error) throw error;

      setHosts(prev => [data, ...prev]);
      setShowAddDialog(false);
      setNewHost({
        contact_name: '',
        organization_name: '',
        organization_type: 'venue',
        contact_email: '',
        contact_phone: '',
        website_url: '',
        street_address: '',
        city: '',
        state: '',
        zip_code: '',
        priority_level: 3,
        notes: '',
        source: 'manual_entry'
      });
      toast.success('Host added successfully');
    } catch (error) {
      console.error('Error adding host:', error);
      toast.error('Failed to add host');
    }
  };

  const getPriorityColor = (priority: number | undefined) => {
    if (!priority) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    if (priority <= 2) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'; // high
    if (priority <= 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'; // medium
    return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'; // low
  };

  const getPriorityLabel = (priority: number | undefined) => {
    if (!priority) return 'Unknown';
    if (priority <= 2) return 'High';
    if (priority <= 4) return 'Medium';
    return 'Low';
  };

  const getTypeColor = (type: string | undefined) => {
    if (!type) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    switch (type) {
      case 'venue': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'organization': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'church': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300';
      case 'school': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'corporate': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{hosts.length}</p>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Total Hosts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {hosts.filter(h => h.priority_level && h.priority_level <= 2).length}
                </p>
                <p className="text-xs text-green-600/80 dark:text-green-400/80">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {hosts.filter(h => h.total_performances && h.total_performances > 0).length}
                </p>
                <p className="text-xs text-purple-600/80 dark:text-purple-400/80">Active Hosts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {hosts.reduce((sum, h) => sum + (h.total_performances || 0), 0)}
                </p>
                <p className="text-xs text-orange-600/80 dark:text-orange-400/80">Total Performances</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hosts by organization, contact, email, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="venue">Venues</SelectItem>
            <SelectItem value="organization">Organizations</SelectItem>
            <SelectItem value="church">Churches</SelectItem>
            <SelectItem value="school">Schools</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Host
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Host</DialogTitle>
              <DialogDescription>
                Add a new performance host to your database
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organization_name">Organization Name *</Label>
                <Input
                  id="organization_name"
                  value={newHost.organization_name}
                  onChange={(e) => setNewHost(prev => ({ ...prev, organization_name: e.target.value }))}
                  placeholder="Enter organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Organization Type</Label>
                <Select value={newHost.organization_type} onValueChange={(value) => setNewHost(prev => ({ ...prev, organization_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venue">Venue</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="church">Church</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={newHost.contact_name}
                  onChange={(e) => setNewHost(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Enter contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={newHost.contact_email}
                  onChange={(e) => setNewHost(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="Enter contact email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={newHost.contact_phone}
                  onChange={(e) => setNewHost(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="Enter contact phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  value={newHost.website_url}
                  onChange={(e) => setNewHost(prev => ({ ...prev, website_url: e.target.value }))}
                  placeholder="Enter website URL"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street_address">Address</Label>
                <Input
                  id="street_address"
                  value={newHost.street_address}
                  onChange={(e) => setNewHost(prev => ({ ...prev, street_address: e.target.value }))}
                  placeholder="Enter street address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newHost.city}
                  onChange={(e) => setNewHost(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={newHost.state}
                  onChange={(e) => setNewHost(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Enter state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  value={newHost.zip_code}
                  onChange={(e) => setNewHost(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="Enter ZIP code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority_level">Priority Level</Label>
                <Select value={newHost.priority_level.toString()} onValueChange={(value) => setNewHost(prev => ({ ...prev, priority_level: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">High Priority</SelectItem>
                    <SelectItem value="3">Medium Priority</SelectItem>
                    <SelectItem value="5">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newHost.notes}
                  onChange={(e) => setNewHost(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes or preferences"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHost} disabled={!newHost.contact_name}>
                Add Host
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hosts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHosts.map((host) => (
          <Card key={host.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedHost(host)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{host.organization_name || host.venue_name || 'Unnamed Organization'}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {host.organization_type && (
                      <Badge className={getTypeColor(host.organization_type)}>
                        {host.organization_type}
                      </Badge>
                    )}
                    <Badge className={getPriorityColor(host.priority_level)}>
                      {getPriorityLabel(host.priority_level)} priority
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {host.contact_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {host.contact_name}
                </div>
              )}
              {host.contact_email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {host.contact_email}
                </div>
              )}
              {host.city && host.state && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {host.city}, {host.state}
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Performances:</span>
                <span className="font-medium">{host.total_performances || 0}</span>
              </div>
              {host.last_performance_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last performance:</span>
                  <span className="font-medium">
                    {new Date(host.last_performance_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredHosts.length === 0 && (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No hosts found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};