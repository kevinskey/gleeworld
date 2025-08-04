import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  useExecutivePermissions, 
  type AppFunction,
  type ExecutivePosition 
} from '@/hooks/useExecutivePermissions';
import { 
  Shield, 
  Users, 
  Calendar, 
  Music, 
  DollarSign, 
  MapPin, 
  Package, 
  GraduationCap, 
  Heart, 
  Camera, 
  UserPlus, 
  Crown, 
  Settings, 
  FileText,
  Globe
} from 'lucide-react';

interface PermissionsGridProps {
  selectedPosition: ExecutivePosition;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'dashboard': return Settings;
    case 'users': return Users;
    case 'events': return Calendar;
    case 'music': return Music;
    case 'communications': return Globe;
    case 'finance': return DollarSign;
    case 'tours': return MapPin;
    case 'inventory': return Package;
    case 'academic': return GraduationCap;
    case 'wellness': return Heart;
    case 'media': return Camera;
    case 'recruitment': return UserPlus;
    case 'alumnae': return Crown;
    case 'system': return Shield;
    case 'records': return FileText;
    case 'external': return Globe;
    default: return Shield;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'dashboard': return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'users': return 'bg-green-500/10 text-green-700 border-green-200';
    case 'events': return 'bg-purple-500/10 text-purple-700 border-purple-200';
    case 'music': return 'bg-pink-500/10 text-pink-700 border-pink-200';
    case 'communications': return 'bg-orange-500/10 text-orange-700 border-orange-200';
    case 'finance': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
    case 'tours': return 'bg-cyan-500/10 text-cyan-700 border-cyan-200';
    case 'inventory': return 'bg-amber-500/10 text-amber-700 border-amber-200';
    case 'academic': return 'bg-indigo-500/10 text-indigo-700 border-indigo-200';
    case 'wellness': return 'bg-rose-500/10 text-rose-700 border-rose-200';
    case 'media': return 'bg-violet-500/10 text-violet-700 border-violet-200';
    case 'recruitment': return 'bg-teal-500/10 text-teal-700 border-teal-200';
    case 'alumnae': return 'bg-gold-500/10 text-gold-700 border-gold-200';
    case 'system': return 'bg-red-500/10 text-red-700 border-red-200';
    case 'records': return 'bg-slate-500/10 text-slate-700 border-slate-200';
    case 'external': return 'bg-lime-500/10 text-lime-700 border-lime-200';
    default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
  }
};

export const PermissionsGrid = ({ selectedPosition }: PermissionsGridProps) => {
  const {
    appFunctions,
    loading,
    fetchPositionFunctions,
    updatePermission,
    getPermissionForFunction
  } = useExecutivePermissions();

  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    const loadPositionData = async () => {
      setLoadingPermissions(true);
      await fetchPositionFunctions(selectedPosition.value);
      setLoadingPermissions(false);
    };

    if (selectedPosition.value) {
      loadPositionData();
    }
  }, [selectedPosition.value]);

  const groupedFunctions = appFunctions.reduce((acc, func) => {
    if (!acc[func.category]) {
      acc[func.category] = [];
    }
    acc[func.category].push(func);
    return acc;
  }, {} as Record<string, AppFunction[]>);

  const handlePermissionChange = async (
    functionId: string,
    permissionType: 'can_access' | 'can_manage',
    checked: boolean
  ) => {
    await updatePermission(selectedPosition.value, functionId, permissionType, checked);
  };

  if (loading || loadingPermissions) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Function Permissions for {selectedPosition.label}
        </h3>
        <p className="text-muted-foreground">
          Assign access and management permissions for each app function
        </p>
      </div>

      {Object.entries(groupedFunctions).map(([category, functions]) => {
        const Icon = getCategoryIcon(category);
        const categoryColor = getCategoryColor(category);

        return (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${categoryColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="capitalize">{category.replace('_', ' ')}</span>
                  <Badge variant="secondary" className="ml-2">
                    {functions.length} functions
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                  {/* Header Row */}
                  <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b font-medium text-sm text-muted-foreground">
                    <div className="col-span-6">Function</div>
                    <div className="col-span-2">Module</div>
                    <div className="col-span-2 text-center">Can Access</div>
                    <div className="col-span-2 text-center">Can Manage</div>
                  </div>

                {/* Function Rows */}
                {functions.map((func) => {
                  const permissions = getPermissionForFunction(func.id);
                  
                  return (
                    <div key={func.id} className="md:grid md:grid-cols-12 gap-4 py-3 border-b border-border/50 hover:bg-muted/30 rounded-lg px-2">
                      {/* Mobile Layout */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 flex-1">{func.name.replace(/_/g, ' ')}</h4>
                          <Badge variant="outline" className="text-xs ml-2">
                            {func.module}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-center gap-8">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Access</span>
                            <Checkbox
                              checked={permissions.can_access}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(func.id, 'can_access', checked as boolean)
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Manage</span>
                            <Checkbox
                              checked={permissions.can_manage}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(func.id, 'can_manage', checked as boolean)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:contents">
                        <div className="col-span-6">
                          <div>
                            <h4 className="font-medium text-gray-900">{func.name.replace(/_/g, ' ')}</h4>
                            <p className="text-sm text-muted-foreground">{func.description}</p>
                          </div>
                        </div>
                        
                        <div className="col-span-2 flex items-center">
                          <Badge variant="outline" className="text-xs">
                            {func.module}
                          </Badge>
                        </div>
                        
                        <div className="col-span-2 flex items-center justify-center">
                          <Checkbox
                            checked={permissions.can_access}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(func.id, 'can_access', checked as boolean)
                            }
                          />
                        </div>
                        
                        <div className="col-span-2 flex items-center justify-center">
                          <Checkbox
                            checked={permissions.can_manage}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(func.id, 'can_manage', checked as boolean)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};