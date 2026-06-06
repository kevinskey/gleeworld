import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUsernamePermissionsAdmin } from '@/hooks/useUsernamePermissions';
import { useUnifiedModulesSimple } from '@/hooks/useUnifiedModules';
import { Loader2, Plus, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export const UsernamePermissionsManager = () => {
  const { allPermissions, loading, grantPermission, revokePermission, fetchAllPermissions } = useUsernamePermissionsAdmin();
  const { modules } = useUnifiedModulesSimple();
  const [isGranting, setIsGranting] = useState(false);
  const [formData, setFormData] = useState({
    userEmail: '',
    moduleName: '',
    notes: ''
  });

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userEmail || !formData.moduleName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGranting(true);
    try {
      const success = await grantPermission(
        formData.userEmail,
        formData.moduleName,
        undefined,
        formData.notes || undefined
      );

      if (success) {
        setFormData({ userEmail: '', moduleName: '', notes: '' });
        toast.success(`Access granted to ${formData.userEmail}`);
      } else {
        toast.error('Failed to grant permission');
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokePermission = async (userEmail: string, moduleName: string) => {
    const success = await revokePermission(userEmail, moduleName);
    if (success) toast.success(`Access revoked for ${userEmail}`);
  };

  const handleQuickAuditionsGrant = async () => {
    if (!formData.userEmail) {
      toast.error('Please enter an email address');
      return;
    }
    setIsGranting(true);
    try {
      const success = await grantPermission(formData.userEmail, 'auditions', undefined, 'Quick auditions grant');
      if (success) {
        setFormData(prev => ({ ...prev, userEmail: '', notes: '' }));
        toast.success(`Auditions access granted`);
      }
    } catch (error) {
      toast.error('Failed to grant auditions access');
    } finally {
      setIsGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grant form */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Username Permissions
          </h3>
          <p className="text-xs text-muted-foreground">Grant module access by email address</p>
        </div>

        <form onSubmit={handleGrantPermission} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="userEmail" className="text-xs">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="user@riversidechoir.example"
                value={formData.userEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="moduleName" className="text-xs">Module *</Label>
              <Select
                value={formData.moduleName}
                onValueChange={(value) => setFormData(prev => ({ ...prev, moduleName: value }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.name} value={module.name}>{module.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={isGranting} className="h-8 text-xs">
              {isGranting ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Granting...</> : <><Plus className="h-3.5 w-3.5 mr-1" />Grant</>}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleQuickAuditionsGrant} disabled={isGranting || !formData.userEmail} className="h-8 text-xs">
              Quick Auditions
            </Button>
          </div>
        </form>
      </div>

      {/* Active permissions list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Active Permissions ({allPermissions.length})</h4>

        {allPermissions.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No permissions granted yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {allPermissions.map((permission) => {
              const module = modules.find(m => m.name === permission.module_name);
              return (
                <div key={permission.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">{permission.user_email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {module?.title || permission.module_name}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(permission.granted_at).toLocaleDateString()}
                      </span>
                    </div>
                    {permission.notes && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{permission.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokePermission(permission.user_email, permission.module_name)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
