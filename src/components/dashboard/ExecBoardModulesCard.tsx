import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleRegistry } from "@/utils/moduleRegistry";
import { EXECUTIVE_MODULE_IDS } from "@/config/executive-modules";
import { useNavigate, useLocation } from "react-router-dom";

interface Module {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
}

interface ExecBoardModulesCardProps {
  userId: string;
}

export const ExecBoardModulesCard = ({ userId }: ExecBoardModulesCardProps) => {
  const [execModules, setExecModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExecBoard, setIsExecBoard] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchExecBoardModules();
  }, [userId]);

  const fetchExecBoardModules = async () => {
    try {
      setLoading(true);
      
      if (!userId) {
        setExecModules([]);
        return;
      }
      
      // Check if user is exec board member
      const { data: profile, error: profileError } = await supabase
        .from('gw_profiles')
        .select('is_exec_board')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const isExec = profile?.is_exec_board || false;
      setIsExecBoard(isExec);

      if (!isExec) {
        setExecModules([]);
        return;
      }

      // Executive modules are derived from position; do not include manually assigned modules
      // TODO: Map exec positions to modules when data is available
      setExecModules([]);
      return;
    } catch (error) {
      console.error('Error fetching exec board modules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            My Executive Board Modules
          </CardTitle>
          <CardDescription>Modules assigned to you as an executive board member</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isExecBoard) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            My Executive Board Modules
          </CardTitle>
          <CardDescription>Modules assigned to you as an executive board member</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are not currently an executive board member
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          My Executive Board Modules
          <Badge variant="default" className="ml-2">
            {execModules.length}
          </Badge>
        </CardTitle>
        <CardDescription>Modules assigned to you as an executive board member</CardDescription>
      </CardHeader>
      <CardContent>
        {execModules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No executive board modules assigned yet
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {execModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div
                  key={module.id}
                  role="button"
                  onClick={() => {
                    const params = new URLSearchParams(location.search);
                    params.set('module', module.id);
                    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  {IconComponent && (
                    <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                      <IconComponent className={`h-5 w-5 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-xs font-medium line-clamp-2 text-card-foreground">{module.title}</p>
                    {module.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                        {module.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
