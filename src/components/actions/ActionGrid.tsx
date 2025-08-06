import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnhancedTooltip } from "@/components/ui/enhanced-tooltip";
import { useNavigate } from "react-router-dom";
import { useUnifiedActions } from "@/hooks/useUnifiedActions";
import { ActionWithPermissions, ActionFilterOptions } from "@/types/unified-actions";

interface ActionGridProps {
  filterOptions?: ActionFilterOptions;
  category?: string;
  className?: string;
  gridCols?: number;
  showCategoryHeaders?: boolean;
}

export const ActionGrid = ({ 
  filterOptions, 
  category, 
  className = "",
  gridCols = 3,
  showCategoryHeaders = true
}: ActionGridProps) => {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<ActionWithPermissions | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { 
    actions, 
    categories, 
    loading, 
    getActionsByCategory, 
    executeAction 
  } = useUnifiedActions({
    ...filterOptions,
    category
  });

  const handleActionClick = (action: ActionWithPermissions) => {
    if (!action.hasPermission) {
      return;
    }

    switch (action.type) {
      case 'navigation':
        if (action.route) {
          navigate(action.route);
        }
        break;
      case 'modal':
        setSelectedAction(action);
        setIsModalOpen(true);
        break;
      case 'function':
        executeAction(action.id);
        break;
      default:
        console.log(`Execute action: ${action.title}`);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAction(null);
  };

  if (loading) {
    return <div className="text-center p-4">Loading actions...</div>;
  }

  const renderActionGrid = (actionsToRender: ActionWithPermissions[]) => (
    <div className={`grid gap-3 lg:gap-4 ${
      gridCols === 1 ? 'grid-cols-1' :
      gridCols === 2 ? 'grid-cols-1 lg:grid-cols-2' :
      gridCols === 3 ? 'grid-cols-1 lg:grid-cols-3' :
      'grid-cols-1 lg:grid-cols-4'
    }`}>
      {actionsToRender.map((action) => {
        const IconComponent = action.icon;
        const isDisabled = !action.hasPermission;
        
        return (
          <EnhancedTooltip 
            key={action.id} 
            content={isDisabled ? "Access denied" : action.description}
          >
            <Button 
              className={`h-20 lg:h-24 flex-col space-y-2 text-xs lg:text-sm w-full relative ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              } transition-all duration-200`}
              variant={isDisabled ? "ghost" : "outline"}
              onClick={() => handleActionClick(action)}
              disabled={isDisabled}
            >
              <IconComponent className={`h-6 w-6 lg:h-7 lg:w-7 ${action.iconColor}`} />
              <span className="text-center leading-tight font-medium">
                {action.title}
              </span>
              {action.isNew && (
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  NEW
                </div>
              )}
            </Button>
          </EnhancedTooltip>
        );
      })}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {category ? (
        // Single category
        renderActionGrid(actions)
      ) : (
        // All categories
        categories.map((cat) => {
          const categoryActions = getActionsByCategory(cat.id);
          if (categoryActions.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-4">
              {showCategoryHeaders && (
                <div className="flex items-center gap-2 text-secondary-foreground">
                  <cat.icon className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">{cat.title}</h3>
                  <span className="text-sm text-muted-foreground">({categoryActions.length})</span>
                </div>
              )}
              {renderActionGrid(categoryActions)}
            </div>
          );
        })
      )}

      {/* Modal for modal-type actions */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction?.icon && (
                <selectedAction.icon className={`h-5 w-5 ${selectedAction.iconColor}`} />
              )}
              {selectedAction?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAction?.modalComponent && (
            <selectedAction.modalComponent 
              onClose={closeModal}
              onSuccess={closeModal}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};