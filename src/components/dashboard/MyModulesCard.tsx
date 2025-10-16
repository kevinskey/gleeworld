import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid3x3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MyModulesCardProps {
  modules: any[];
  onModuleClick: (moduleId: string) => void;
}

export const MyModulesCard = ({ modules, onModuleClick }: MyModulesCardProps) => {
  const navigate = useNavigate();

  if (modules.length === 0) {
    return (
      <Card className="bg-background/95 backdrop-blur-sm">
        <CardHeader className="pt-4 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            My Modules
          </CardTitle>
          <CardDescription>Your assigned modules will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No modules assigned yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur-sm">
      <CardHeader className="pt-4 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          My Modules
        </CardTitle>
        <CardDescription>All your assigned modules</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Button
                key={module.id}
                variant="outline"
                className="h-auto flex-col gap-2 p-4 hover:bg-accent/50"
                onClick={() => {
                  if (module.id === 'librarian') {
                    navigate('/librarian-dashboard');
                  } else {
                    onModuleClick(module.id);
                  }
                }}
              >
                {IconComponent && (
                  <div className={`p-2 rounded-lg bg-${module.iconColor}-100 dark:bg-${module.iconColor}-900/20`}>
                    <IconComponent className={`h-5 w-5 text-${module.iconColor}-600 dark:text-${module.iconColor}-400`} />
                  </div>
                )}
                <span className="text-xs font-medium text-center line-clamp-2">
                  {module.title}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
