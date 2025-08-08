import React, { Suspense, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ModularPlugin } from '@/config/modular-plugins';
import { AlertCircle, Settings, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ModularPluginContainerProps {
  plugin: ModularPlugin;
  mode?: 'preview' | 'full' | 'embed';
  onConfigure?: (pluginId: string) => void;
  onRequirePassword?: (pluginId: string) => void;
  userPermissions?: string[];
  isAdmin?: boolean;
  className?: string;
}

export const ModularPluginContainer: React.FC<ModularPluginContainerProps> = ({
  plugin,
  mode = 'embed',
  onConfigure,
  onRequirePassword,
  userPermissions = [],
  isAdmin = false,
  className = ''
}) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if user has permission to access this plugin
  const hasPermission = React.useMemo(() => {
    if (isAdmin) return true;
    if (!plugin.requiredRoles?.length && !plugin.requiredPermissions?.length) return true;
    
    const hasRequiredRole = plugin.requiredRoles?.some(role => userPermissions.includes(role));
    const hasRequiredPermission = plugin.requiredPermissions?.some(perm => userPermissions.includes(perm));
    
    return hasRequiredRole || hasRequiredPermission;
  }, [plugin, userPermissions, isAdmin]);

  // Load the appropriate component based on mode
  useEffect(() => {
    if (!hasPermission) return;

    const loadComponent = async () => {
      try {
        setLoadError(null);
        let componentLoader;

        switch (mode) {
          case 'preview':
            componentLoader = plugin.previewComponent || plugin.component;
            break;
          case 'full':
            componentLoader = plugin.fullPageComponent || plugin.component;
            break;
          default:
            componentLoader = plugin.component;
        }

        if (typeof componentLoader === 'function') {
          const result = await componentLoader();
          setComponent(() => result);
        } else {
          setComponent(() => componentLoader);
        }
      } catch (error) {
        console.error(`Failed to load plugin ${plugin.id}:`, error);
        setLoadError('Failed to load plugin component');
        toast({
          title: "Plugin Load Error",
          description: `Failed to load ${plugin.name}`,
          variant: "destructive",
        });
      }
    };

    loadComponent();
  }, [plugin, mode, hasPermission]);

  // Permission denied state
  if (!hasPermission) {
    return (
      <Card className={`border-destructive/50 ${className}`}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="font-medium mb-1">Access Denied</h3>
          <p className="text-sm text-muted-foreground">
            You don't have permission to access {plugin.name}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (!Component && !loadError) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingSpinner size="md" text={`Loading ${plugin.name}...`} />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (loadError) {
    return (
      <Card className={`border-destructive/50 ${className}`}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="font-medium mb-1">Plugin Error</h3>
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render the plugin with admin controls
  return (
    <Card className={className}>
      {mode !== 'embed' && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <plugin.icon className={`h-5 w-5 ${plugin.iconColor}`} />
              <CardTitle className="text-lg">{plugin.title}</CardTitle>
              {plugin.isNew && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
            </div>
            
            {isAdmin && (
              <div className="flex items-center gap-2">
                {plugin.lockFromChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRequirePassword?.(plugin.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                )}
                
                {plugin.adminConfigurable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onConfigure?.(plugin.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">{plugin.description}</p>
          
          {/* Plugin capabilities badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {plugin.sendEmails && (
              <Badge variant="outline" className="text-xs">
                Email
              </Badge>
            )}
            {plugin.sendNotifications && (
              <Badge variant="outline" className="text-xs">
                Notifications
              </Badge>
            )}
            {plugin.integratesWithAuth && (
              <Badge variant="outline" className="text-xs">
                Auth
              </Badge>
            )}
            {plugin.registersUsers && (
              <Badge variant="outline" className="text-xs">
                User Registration
              </Badge>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={mode === 'embed' ? 'p-0' : ''}>
        <Suspense fallback={<LoadingSpinner size="md" text="Loading..." />}>
          {Component && <Component mode={mode} plugin={plugin} />}
        </Suspense>
      </CardContent>
    </Card>
  );
};