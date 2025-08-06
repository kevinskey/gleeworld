import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedModules } from "@/hooks/useUnifiedModules";
import { UNIFIED_MODULE_CATEGORIES } from "@/config/unified-modules";

interface ExecBoardModularHubProps {
  className?: string;
}

export const ExecBoardModularHub = ({ className }: ExecBoardModularHubProps) => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [modulePreferences, setModulePreferences] = useState<Record<string, boolean>>({});

  // Check if user is executive board member
  const isExecBoard = profile?.is_exec_board && profile?.verified;
  const execRole = profile?.exec_board_role;

  // Use unified modules with executive position filtering
  const { 
    modules: availableModules, 
    loading,
    getAccessibleModules 
  } = useUnifiedModules({
    execPosition: execRole,
    userRole: profile?.role,
    isAdmin: profile?.is_admin || profile?.is_super_admin
  });

  const accessibleModules = getAccessibleModules();

  useEffect(() => {
    if (isExecBoard && user) {
      loadUserModulePreferences();
    }
  }, [isExecBoard, user]);

  const loadUserModulePreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_executive_module_preferences')
        .select('module_id, is_enabled')
        .eq('user_id', user?.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const prefs = data.reduce((acc, pref) => ({
          ...acc,
          [pref.module_id]: pref.is_enabled
        }), {});
        setModulePreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading module preferences:', error);
    }
  };

  const saveModulePreference = async (moduleId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_executive_module_preferences')
        .upsert({
          user_id: user?.id,
          module_id: moduleId,
          is_enabled: isEnabled,
        });

      if (error) throw error;

      setModulePreferences(prev => ({
        ...prev,
        [moduleId]: isEnabled
      }));

      toast({
        title: "Preferences Updated",
        description: `Module ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error saving module preference:', error);
      toast({
        title: "Error",
        description: "Failed to save module preferences",
        variant: "destructive",
      });
    }
  };

  // Get enabled modules based on both accessibility and user preferences
  const enabledModules = accessibleModules.filter(module => 
    modulePreferences[module.id] !== false // Default to true if no preference set
  );

  // Group modules by category
  const modulesByCategory = enabledModules.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, typeof enabledModules>);

  if (!isExecBoard) {
    return null; // Don't render if not an executive board member
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <span>Loading executive modules...</span>
      </div>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-purple-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-purple-600" />
            <div>
              <CardTitle className="text-lg">Executive Board Hub</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-purple-700 border-purple-300">
                  {execRole?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {enabledModules.length} modules active
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfigMode(!isConfigMode)}
            className="text-purple-600 hover:text-purple-700"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isConfigMode ? (
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground mb-3">Module Configuration</h3>
            <div className="grid gap-3">
              {accessibleModules.map((module) => (
                <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <module.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{module.title}</div>
                      <div className="text-xs text-muted-foreground">{module.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={module.id}
                      checked={modulePreferences[module.id] !== false}
                      onCheckedChange={(checked) => saveModulePreference(module.id, checked)}
                    />
                    <Label htmlFor={module.id} className="text-xs">
                      {modulePreferences[module.id] !== false ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 mb-4">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="communications" className="text-xs">Comm</TabsTrigger>
              <TabsTrigger value="finances" className="text-xs">Finance</TabsTrigger>
              <TabsTrigger value="tours" className="text-xs">Tours</TabsTrigger>
              <TabsTrigger value="member-management" className="text-xs">Members</TabsTrigger>
              <TabsTrigger value="musical-leadership" className="text-xs">Music</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {enabledModules.slice(0, 4).map((module) => {
                  const ModuleComponent = module.component;
                  return (
                    <Card key={module.id} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <module.icon className="h-4 w-4 text-purple-600" />
                        <h4 className="font-medium text-sm">{module.title}</h4>
                      </div>
                      <ModuleComponent preview={true} execRole={execRole} />
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                {categoryModules.map((module) => {
                  const ModuleComponent = module.component;
                  return (
                    <Card key={module.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <module.icon className="h-5 w-5 text-purple-600" />
                          <CardTitle className="text-base">{module.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ModuleComponent preview={false} execRole={execRole} />
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};