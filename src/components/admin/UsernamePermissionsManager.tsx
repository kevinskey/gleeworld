import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUsernamePermissionsAdmin } from '@/hooks/useUsernamePermissions';
import { useUnifiedModulesSimple } from '@/hooks/useUnifiedModules';
import { Loader2, Plus, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export const UsernamePermissionsManager = () => {
  const { allPermissions, loading, grantPermission, revokePermission, fetchAllPermissions } = useUsernamePermissionsAdmin();
  const { modules } = useUnifiedModulesSimple();
  const [isGranting, setIsGranting] = useState(false);
  const [formData, setFormData] = useState({
    userEmail: 'onnestypelle@spelman.edu',
    moduleName: 'calendar-management',
    notes: 'Access granted for calendar editing and event management'
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
        undefined, // no expiration
        formData.notes || undefined
      );

      if (success) {
        setFormData({ userEmail: '', moduleName: '', notes: '' });
        toast.success(`Access granted to ${formData.userEmail} for ${formData.moduleName}`);
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      toast.error('Failed to grant permission');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokePermission = async (userEmail: string, moduleName: string) => {
    const success = await revokePermission(userEmail, moduleName);
    if (success) {
      toast.success(`Access revoked for ${userEmail}`);
    }
  };

  // Quick grant for auditions module
  const handleQuickAuditionsGrant = async () => {
    if (!formData.userEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsGranting(true);
    try {
      const success = await grantPermission(
        formData.userEmail,
        'auditions',
        undefined,
        'Quick access grant for auditions module'
      );

      if (success) {
        setFormData(prev => ({ ...prev, userEmail: '', notes: '' }));
        toast.success(`Auditions access granted to ${formData.userEmail}`);
      }
    } catch (error) {
      console.error('Error granting auditions permission:', error);
      toast.error('Failed to grant auditions access');
    } finally {
      setIsGranting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading permissions...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Grant Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Grant Username Permissions
          </CardTitle>
          <CardDescription>
            Grant specific users access to modules by email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGrantPermission} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail">User Email *</Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="user@spelman.edu"
                  value={formData.userEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleName">Module *</Label>
                <Select
                  value={formData.moduleName}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, moduleName: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module.name} value={module.name}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this permission grant..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isGranting}>
                {isGranting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Granting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Grant Permission
                  </>
                )}
              </Button>

              {/* Quick Auditions Grant */}
              <Button 
                type="button" 
                variant="outline"
                onClick={handleQuickAuditionsGrant}
                disabled={isGranting || !formData.userEmail}
              >
                Quick Auditions Access
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Current Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Username Permissions</CardTitle>
          <CardDescription>
            Users who have been granted specific module access by email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allPermissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No username permissions have been granted yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Email</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Granted Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPermissions.map((permission) => {
                    const module = modules.find(m => m.name === permission.module_name);
                    return (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">
                          {permission.user_email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {module?.title || permission.module_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(permission.granted_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {permission.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokePermission(permission.user_email, permission.module_name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};