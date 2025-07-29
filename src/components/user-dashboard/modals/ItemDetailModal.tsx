import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Package, DollarSign, Bell, AlertCircle } from "lucide-react";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    title: string;
    content?: string;
    type: 'notification' | 'checkout' | 'dues';
    subType?: string;
    dueDate?: string;
    amount?: number;
    actionRequired?: boolean;
  };
}

export const ItemDetailModal = ({ isOpen, onClose, item }: ItemDetailModalProps) => {
  const getIcon = () => {
    switch (item.type) {
      case 'notification': return <Bell className="h-5 w-5" />;
      case 'checkout': return <Package className="h-5 w-5" />;
      case 'dues': return <DollarSign className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getActionButton = () => {
    switch (item.type) {
      case 'checkout':
        return (
          <Button className="w-full">
            View Return Instructions
          </Button>
        );
      case 'dues':
        return (
          <Button className="w-full">
            Pay Now
          </Button>
        );
      case 'notification':
        return item.actionRequired ? (
          <Button className="w-full">
            Take Action
          </Button>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {getIcon()}
              {item.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {item.subType && (
            <Badge variant="secondary" className="w-fit">
              {item.subType}
            </Badge>
          )}
          
          {item.content && (
            <div className="text-sm text-muted-foreground">
              {item.content}
            </div>
          )}
          
          {item.dueDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </div>
          )}
          
          {item.amount && (
            <div className="text-lg font-bold text-foreground">
              ${item.amount.toFixed(2)}
            </div>
          )}
          
          {getActionButton()}
        </div>
      </DialogContent>
    </Dialog>
  );
};