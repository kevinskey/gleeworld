import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DASHBOARD_MODULES, DashboardModule } from "@/constants/permissions";
import { useUsernamePermissionsAdmin } from "@/hooks/useUsernamePermissions";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Plus, 
  Search, 
  Trash2, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Star,
  Settings,
  Youtube,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export const UsernamePermissionsManager = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedModule, setSelectedModule] = useState<DashboardModule | ''>('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const { 
    allPermissions, 
    loading, 
    grantPermission, 
    revokePermission, 
    getUserPermissions,
    fetchAllPermissions 
  } = useUsernamePermissionsAdmin();
  
  const { toast } = useToast();

  // Fetch all users for search
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .order('full_name', { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (err: any) {
        console.error('Error fetching users:', err);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
      }
    };

    fetchUsers();
  }, [toast]);

  // Search users by email or name
  const handleUserSearch = (query: string) => {
    setSearchEmail(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(query.toLowerCase()))
    );
    setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
  };

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    setSearchEmail(user.email);
    setSearchResults([]);
  };

  const handleGrantPermission = async () => {
    if (!selectedUser || !selectedModule) {
      toast({
        title: "Error",
        description: "Please select a user and module",
        variant: "destructive",
      });
      return;
    }

    const success = await grantPermission(
      selectedUser.email,
      selectedModule,
      expirationDate?.toISOString(),
      notes
    );

    if (success) {
      // Reset form
      setSelectedModule('');
      setExpirationDate(undefined);
      setNotes('');
    }
  };

  const handleRevokePermission = async (userEmail: string, moduleName: string) => {
    await revokePermission(userEmail, moduleName);
  };

  const getModuleIcon = (moduleName: string) => {
    switch (moduleName) {
      case 'hero_management':
        return Star;
      case 'dashboard_settings':
        return Settings;
      case 'youtube_management':
        return Youtube;
      case 'send_notifications':
        return Bell;
      case 'send_emails':
        return Mail;
      case 'manage_permissions':
        return Shield;
      default:
        return Settings;
    }
  };

  const getModuleColor = (moduleName: string) => {
    switch (moduleName) {
      case 'hero_management':
        return 'bg-yellow-100 text-yellow-800';
      case 'dashboard_settings':
        return 'bg-blue-100 text-blue-800';
      case 'youtube_management':
        return 'bg-red-100 text-red-800';
      case 'send_notifications':
        return 'bg-purple-100 text-purple-800';
      case 'send_emails':
        return 'bg-green-100 text-green-800';
      case 'manage_permissions':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Username Permissions Manager</h2>
        <p className="text-muted-foreground">
          Grant specific module access to users based on their email address
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grant Permission Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Grant Module Access
            </CardTitle>
            <CardDescription>
              Give specific users access to dashboard modules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="userSearch">Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="userSearch"
                  placeholder="Search by email or name..."
                  value={searchEmail}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-md bg-white shadow-sm max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.full_name || user.email}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className="p-3 bg-blue-50 rounded-md border">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">{selectedUser.full_name || selectedUser.email}</p>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto">{selectedUser.role}</Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Module Selection */}
            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Select value={selectedModule} onValueChange={(value) => setSelectedModule(value as DashboardModule)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module to grant access to" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DASHBOARD_MODULES).map(([key, module]) => {
                    const IconComponent = getModuleIcon(key);
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{module.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, "PPP") : "No expiration"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={(date) => {
                      setExpirationDate(date);
                      setShowCalendar(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {expirationDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpirationDate(undefined)}
                  className="text-sm text-muted-foreground"
                >
                  Clear expiration
                </Button>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this permission..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGrantPermission}
              disabled={!selectedUser || !selectedModule}
              className="w-full"
            >
              <Shield className="mr-2 h-4 w-4" />
              Grant Access
            </Button>
          </CardContent>
        </Card>

        {/* Current Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Active Permissions
            </CardTitle>
            <CardDescription>
              Currently granted username-based permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading permissions...</p>
              </div>
            ) : allPermissions.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No username permissions granted yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allPermissions.map((permission) => {
                  const IconComponent = getModuleIcon(permission.module_name);
                  const moduleData = DASHBOARD_MODULES[permission.module_name as DashboardModule];
                  const isExpired = permission.expires_at && new Date(permission.expires_at) < new Date();
                  
                  return (
                    <div
                      key={permission.id}
                      className={`p-3 border rounded-lg ${isExpired ? 'bg-red-50 border-red-200' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-md ${getModuleColor(permission.module_name)}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{permission.user_email}</p>
                            <p className="text-sm text-muted-foreground">{moduleData?.name || permission.module_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Granted {format(new Date(permission.granted_at), 'MMM dd, yyyy')}
                              </span>
                              {permission.expires_at && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className={`text-xs ${isExpired ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {isExpired ? 'Expired' : 'Expires'} {format(new Date(permission.expires_at), 'MMM dd, yyyy')}
                                  </span>
                                </>
                              )}
                            </div>
                            {permission.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                "{permission.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokePermission(permission.user_email, permission.module_name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Available Modules</CardTitle>
          <CardDescription>
            Reference guide for all available dashboard modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(DASHBOARD_MODULES).map(([key, module]) => {
              const IconComponent = getModuleIcon(key);
              return (
                <div key={key} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-md ${getModuleColor(key)}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <h4 className="font-medium">{module.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {module.permission}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};