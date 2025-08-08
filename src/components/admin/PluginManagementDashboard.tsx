import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  MODULAR_PLUGINS, 
  PLUGIN_CATEGORIES, 
  getPluginsByCategory,
  getPluginsRequiringPassword 
} from '@/config/modular-plugins';
import { 
  Settings, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  AlertTriangle,
  Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';

export const PluginManagementDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

  // Filter plugins based on category and search
  const filteredPlugins = MODULAR_PLUGINS.filter(plugin => {
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePasswordProtectedAction = (pluginId: string) => {
    setSelectedPlugin(pluginId);
    setShowPasswordDialog(true);
  };

  const verifyPasswordAndProceed = () => {
    // In a real app, this would verify against a secure admin password
    if (adminPassword === 'GleeAdmin2024!') {
      toast({
        title: "Access Granted",
        description: "You can now modify this protected plugin",
      });
      setShowPasswordDialog(false);
      setAdminPassword('');
      // Proceed with the protected action
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect admin password",
        variant: "destructive",
      });
    }
  };

  const togglePluginStatus = (pluginId: string) => {
    const plugin = MODULAR_PLUGINS.find(p => p.id === pluginId);
    if (plugin?.lockFromChanges) {
      handlePasswordProtectedAction(pluginId);
      return;
    }
    
    toast({
      title: "Plugin Updated",
      description: `Plugin ${plugin?.name} has been ${plugin?.isActive ? 'disabled' : 'enabled'}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Plugin Management Dashboard</h2>
        <p className="text-muted-foreground">
          Control and configure modular plugins across the GleeWorld platform
        </p>
      </div>

      {/* Security Warning */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Security Notice</h3>
              <p className="text-sm text-amber-800 mt-1">
                Plugins marked with a lock require admin password verification before modification.
                This protects critical functionality like user authentication and public-facing features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search plugins..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sm:max-w-xs"
        />
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {Object.values(PLUGIN_CATEGORIES).map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{MODULAR_PLUGINS.length}</div>
            <p className="text-sm text-muted-foreground">Total Plugins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {MODULAR_PLUGINS.filter(p => p.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Active Plugins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">
              {getPluginsRequiringPassword().length}
            </div>
            <p className="text-sm text-muted-foreground">Password Protected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {MODULAR_PLUGINS.filter(p => p.adminConfigurable).length}
            </div>
            <p className="text-sm text-muted-foreground">Configurable</p>
          </CardContent>
        </Card>
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map(plugin => (
          <Card key={plugin.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <plugin.icon className={`h-5 w-5 ${plugin.iconColor}`} />
                  <CardTitle className="text-lg">{plugin.name}</CardTitle>
                </div>
                
                <div className="flex items-center gap-1">
                  {plugin.lockFromChanges && (
                    <Lock className="h-4 w-4 text-amber-600" />
                  )}
                  {plugin.isNew && (
                    <Badge variant="secondary" className="text-xs">New</Badge>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">{plugin.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Status Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plugin.isActive}
                    onCheckedChange={() => togglePluginStatus(plugin.id)}
                  />
                  {plugin.isActive ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
              
              {/* Capabilities */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Capabilities</span>
                <div className="flex flex-wrap gap-1">
                  {plugin.sendEmails && (
                    <Badge variant="outline" className="text-xs">Email</Badge>
                  )}
                  {plugin.sendNotifications && (
                    <Badge variant="outline" className="text-xs">Notifications</Badge>
                  )}
                  {plugin.integratesWithAuth && (
                    <Badge variant="outline" className="text-xs">Auth</Badge>
                  )}
                  {plugin.registersUsers && (
                    <Badge variant="outline" className="text-xs">User Reg</Badge>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => plugin.lockFromChanges ? 
                    handlePasswordProtectedAction(plugin.id) : 
                    toast({ title: "Plugin Settings", description: `Configuring ${plugin.name}` })
                  }
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
                
                {plugin.lockFromChanges && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePasswordProtectedAction(plugin.id)}
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Password Required</DialogTitle>
            <DialogDescription>
              This plugin is password-protected to prevent unauthorized changes.
              Enter the admin password to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && verifyPasswordAndProceed()}
            />
            
            <div className="flex gap-2">
              <Button onClick={verifyPasswordAndProceed} className="flex-1">
                Verify & Continue
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordDialog(false);
                  setAdminPassword('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};