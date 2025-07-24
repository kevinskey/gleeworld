import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ExternalLink,
  Download,
  Search,
  Filter,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface LicensingEntry {
  id: string;
  music_id: string;
  license_type: string;
  publisher: string | null;
  rights_holder: string | null;
  license_number: string | null;
  proof_url: string | null;
  expires_on: string | null;
  usage_notes: string | null;
  performance_fee: number | null;
  territory_restrictions: string | null;
  is_active: boolean;
  created_at: string;
  music: {
    title: string;
    composer: string | null;
    arranger: string | null;
  };
}

interface SheetMusic {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
}

interface ExpiringLicense {
  id: string;
  music_title: string;
  license_type: string;
  expires_on: string;
  days_until_expiry: number;
}

export const LicensingTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<LicensingEntry[]>([]);
  const [availableMusic, setAvailableMusic] = useState<SheetMusic[]>([]);
  const [expiringLicenses, setExpiringLicenses] = useState<ExpiringLicense[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [newLicense, setNewLicense] = useState({
    music_id: '',
    license_type: 'public_domain',
    publisher: '',
    rights_holder: '',
    license_number: '',
    proof_url: '',
    expires_on: '',
    usage_notes: '',
    performance_fee: '',
    territory_restrictions: ''
  });

  useEffect(() => {
    fetchLicenses();
    fetchAvailableMusic();
    fetchExpiringLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_licensing_entries')
        .select(`
          *,
          music:gw_sheet_music(title, composer, arranger)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenses(data || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load licensing data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, arranger')
        .order('title');

      if (error) throw error;
      setAvailableMusic(data || []);
    } catch (error) {
      console.error('Error fetching music:', error);
    }
  };

  const fetchExpiringLicenses = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_upcoming_license_expirations', { days_ahead: 90 });

      if (error) throw error;
      setExpiringLicenses(data || []);
    } catch (error) {
      console.error('Error fetching expiring licenses:', error);
    }
  };

  const createLicense = async () => {
    if (!newLicense.music_id || !newLicense.license_type) {
      toast({
        title: 'Error',
        description: 'Music selection and license type are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_licensing_entries')
        .insert({
          music_id: newLicense.music_id,
          license_type: newLicense.license_type,
          publisher: newLicense.publisher || null,
          rights_holder: newLicense.rights_holder || null,
          license_number: newLicense.license_number || null,
          proof_url: newLicense.proof_url || null,
          expires_on: newLicense.expires_on || null,
          usage_notes: newLicense.usage_notes || null,
          performance_fee: newLicense.performance_fee ? parseFloat(newLicense.performance_fee) : null,
          territory_restrictions: newLicense.territory_restrictions || null,
          created_by: user?.id
        })
        .select(`
          *,
          music:gw_sheet_music(title, composer, arranger)
        `)
        .single();

      if (error) throw error;

      setLicenses([data, ...licenses]);
      setNewLicense({
        music_id: '',
        license_type: 'public_domain',
        publisher: '',
        rights_holder: '',
        license_number: '',
        proof_url: '',
        expires_on: '',
        usage_notes: '',
        performance_fee: '',
        territory_restrictions: ''
      });
      setCreateDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Licensing entry created successfully'
      });

      // Refresh expiring licenses
      fetchExpiringLicenses();
    } catch (error) {
      console.error('Error creating license:', error);
      toast({
        title: 'Error',
        description: 'Failed to create licensing entry',
        variant: 'destructive'
      });
    }
  };

  const toggleLicenseStatus = async (license: LicensingEntry) => {
    try {
      const { error } = await supabase
        .from('gw_licensing_entries')
        .update({ is_active: !license.is_active })
        .eq('id', license.id);

      if (error) throw error;

      setLicenses(licenses.map(l => 
        l.id === license.id 
          ? { ...l, is_active: !l.is_active }
          : l
      ));

      toast({
        title: 'Success',
        description: `License ${license.is_active ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Error updating license:', error);
      toast({
        title: 'Error',
        description: 'Failed to update license status',
        variant: 'destructive'
      });
    }
  };

  const getLicenseTypeColor = (type: string) => {
    switch (type) {
      case 'public_domain': return 'bg-green-100 text-green-800';
      case 'ascap': return 'bg-blue-100 text-blue-800';
      case 'bmi': return 'bg-purple-100 text-purple-800';
      case 'sesac': return 'bg-orange-100 text-orange-800';
      case 'custom': return 'bg-yellow-100 text-yellow-800';
      case 'self_published': return 'bg-indigo-100 text-indigo-800';
      case 'permission_required': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpiryStatus = (license: LicensingEntry) => {
    if (!license.expires_on) return null;
    
    const today = new Date();
    const expiryDate = new Date(license.expires_on);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', days: Math.abs(daysUntilExpiry), color: 'text-red-600' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', days: daysUntilExpiry, color: 'text-orange-600' };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'warning', days: daysUntilExpiry, color: 'text-yellow-600' };
    }
    
    return { status: 'active', days: daysUntilExpiry, color: 'text-green-600' };
  };

  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = !searchTerm || 
      license.music.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.music.composer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.publisher?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || license.license_type === filterType;
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && license.is_active) ||
      (filterStatus === 'inactive' && !license.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading licensing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Licensing & Usage Tracker</h2>
          <p className="text-muted-foreground">Manage music licensing and compliance</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New License Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Licensing Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <Label htmlFor="music_id">Music *</Label>
                <Select value={newLicense.music_id} onValueChange={(value) => setNewLicense({...newLicense, music_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select music" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMusic.map((music) => (
                      <SelectItem key={music.id} value={music.id}>
                        {music.title} {music.composer ? `- ${music.composer}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="license_type">License Type *</Label>
                <Select value={newLicense.license_type} onValueChange={(value) => setNewLicense({...newLicense, license_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public_domain">Public Domain</SelectItem>
                    <SelectItem value="ascap">ASCAP</SelectItem>
                    <SelectItem value="bmi">BMI</SelectItem>
                    <SelectItem value="sesac">SESAC</SelectItem>
                    <SelectItem value="custom">Custom License</SelectItem>
                    <SelectItem value="self_published">Self Published</SelectItem>
                    <SelectItem value="permission_required">Permission Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  value={newLicense.publisher}
                  onChange={(e) => setNewLicense({...newLicense, publisher: e.target.value})}
                  placeholder="e.g., Hal Leonard"
                />
              </div>
              <div>
                <Label htmlFor="rights_holder">Rights Holder</Label>
                <Input
                  id="rights_holder"
                  value={newLicense.rights_holder}
                  onChange={(e) => setNewLicense({...newLicense, rights_holder: e.target.value})}
                  placeholder="e.g., ASCAP, BMI"
                />
              </div>
              <div>
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={newLicense.license_number}
                  onChange={(e) => setNewLicense({...newLicense, license_number: e.target.value})}
                  placeholder="License/Permission ID"
                />
              </div>
              <div>
                <Label htmlFor="proof_url">Proof Document URL</Label>
                <Input
                  id="proof_url"
                  value={newLicense.proof_url}
                  onChange={(e) => setNewLicense({...newLicense, proof_url: e.target.value})}
                  placeholder="URL to licensing document"
                />
              </div>
              <div>
                <Label htmlFor="expires_on">Expiration Date</Label>
                <Input
                  id="expires_on"
                  type="date"
                  value={newLicense.expires_on}
                  onChange={(e) => setNewLicense({...newLicense, expires_on: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="performance_fee">Performance Fee</Label>
                <Input
                  id="performance_fee"
                  type="number"
                  step="0.01"
                  value={newLicense.performance_fee}
                  onChange={(e) => setNewLicense({...newLicense, performance_fee: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="territory_restrictions">Territory Restrictions</Label>
                <Input
                  id="territory_restrictions"
                  value={newLicense.territory_restrictions}
                  onChange={(e) => setNewLicense({...newLicense, territory_restrictions: e.target.value})}
                  placeholder="e.g., US only, North America"
                />
              </div>
              <div>
                <Label htmlFor="usage_notes">Usage Notes</Label>
                <Textarea
                  id="usage_notes"
                  value={newLicense.usage_notes}
                  onChange={(e) => setNewLicense({...newLicense, usage_notes: e.target.value})}
                  placeholder="Additional licensing notes..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createLicense} className="flex-1">
                  Create Entry
                </Button>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expiring Licenses Alert */}
      {expiringLicenses.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Licensing Alerts</AlertTitle>
          <AlertDescription>
            You have {expiringLicenses.length} license(s) expiring within 90 days.
            <div className="mt-2 space-y-1">
              {expiringLicenses.slice(0, 3).map((license) => (
                <div key={license.id} className="text-sm">
                  <strong>{license.music_title}</strong> - {license.license_type} expires in {license.days_until_expiry} days
                </div>
              ))}
              {expiringLicenses.length > 3 && (
                <div className="text-sm">...and {expiringLicenses.length - 3} more</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Licenses</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, composer, or publisher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All License Types</SelectItem>
                <SelectItem value="public_domain">Public Domain</SelectItem>
                <SelectItem value="ascap">ASCAP</SelectItem>
                <SelectItem value="bmi">BMI</SelectItem>
                <SelectItem value="sesac">SESAC</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="self_published">Self Published</SelectItem>
                <SelectItem value="permission_required">Permission Required</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>

          {/* Licenses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLicenses.map((license) => {
              const expiryStatus = getExpiryStatus(license);
              
              return (
                <Card key={license.id} className={`${!license.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{license.music.title}</CardTitle>
                        {license.music.composer && (
                          <p className="text-sm text-muted-foreground">by {license.music.composer}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getLicenseTypeColor(license.license_type)}>
                          {license.license_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {license.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {license.publisher && (
                      <div className="text-sm">
                        <strong>Publisher:</strong> {license.publisher}
                      </div>
                    )}
                    
                    {license.rights_holder && (
                      <div className="text-sm">
                        <strong>Rights Holder:</strong> {license.rights_holder}
                      </div>
                    )}

                    {license.license_number && (
                      <div className="text-sm">
                        <strong>License #:</strong> {license.license_number}
                      </div>
                    )}

                    {license.expires_on && expiryStatus && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={`text-sm ${expiryStatus.color}`}>
                          {expiryStatus.status === 'expired' 
                            ? `Expired ${expiryStatus.days} days ago`
                            : `Expires in ${expiryStatus.days} days`
                          }
                        </span>
                      </div>
                    )}

                    {license.performance_fee && (
                      <div className="text-sm">
                        <strong>Performance Fee:</strong> ${license.performance_fee.toFixed(2)}
                      </div>
                    )}

                    {license.territory_restrictions && (
                      <div className="text-sm">
                        <strong>Territory:</strong> {license.territory_restrictions}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      {license.proof_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={license.proof_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Proof
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleLicenseStatus(license)}
                      >
                        {license.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="expiring" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Licenses Expiring Soon</h3>
            {expiringLicenses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium">All licenses are current</p>
                  <p className="text-muted-foreground">No licenses expiring in the next 90 days</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiringLicenses.map((license) => (
                  <Card key={license.id} className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-orange-600" />
                        {license.music_title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge className={getLicenseTypeColor(license.license_type)}>
                          {license.license_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="text-sm">
                          <strong>Expires:</strong> {new Date(license.expires_on).toLocaleDateString()}
                        </div>
                        <div className={`text-sm font-medium ${
                          license.days_until_expiry <= 30 ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          {license.days_until_expiry} days remaining
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="compliance" className="mt-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Compliance Overview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Licenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{licenses.length}</div>
                  <p className="text-muted-foreground">
                    {licenses.filter(l => l.is_active).length} active
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expiring Soon</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {expiringLicenses.filter(l => l.days_until_expiry <= 30).length}
                  </div>
                  <p className="text-muted-foreground">Within 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Public Domain</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {licenses.filter(l => l.license_type === 'public_domain').length}
                  </div>
                  <p className="text-muted-foreground">No fees required</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>License Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['public_domain', 'ascap', 'bmi', 'sesac', 'custom', 'self_published', 'permission_required'].map(type => {
                    const count = licenses.filter(l => l.license_type === type).length;
                    const percentage = licenses.length > 0 ? (count / licenses.length * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getLicenseTypeColor(type)}>
                            {type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          {count} ({percentage}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reports" className="mt-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Reports & Export</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate a comprehensive compliance report for event organizers
                  </p>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download Compliance Report
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Performance Fees Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Summary of all performance fees by license type
                  </p>
                  <div className="text-2xl font-bold">
                    ${licenses
                      .filter(l => l.performance_fee)
                      .reduce((sum, l) => sum + (l.performance_fee || 0), 0)
                      .toFixed(2)}
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Fee Report
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Expiration Calendar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Calendar view of all license expiration dates
                  </p>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>License Database Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Export complete licensing database as CSV or PDF
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};