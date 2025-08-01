import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { ItemDetailModal } from "../modals/ItemDetailModal";

export const TasksSection = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Real data - to be fetched from Supabase
  const [checkedOutItems, setCheckedOutItems] = useState([]);

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'uniform': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'music': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'equipment': return 'bg-green-100 text-green-800 border-green-200';
      case 'accessory': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'cosmetic': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleItemStatus = (itemId: string) => {
    // Only executive board members can change status through their dashboard
    // This function is kept for potential future use but disabled for regular users
    return;
  };

  const getStatusColor = (status: string) => {
    return status === 'checked_out' 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <div className="w-full">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Checked Out Items */}
        <Card className="bg-gradient-to-r from-accent/5 via-secondary/5 to-primary/5 border-accent/20 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
              <Package className="h-4 w-4" />
              Checked Out Items
              <Badge variant="secondary" className="text-xs">
                {checkedOutItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-44">
              <div className="space-y-2">
                {checkedOutItems.length === 0 ? (
                  <div className="text-center py-4">
                    <Package className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">No items checked out</p>
                  </div>
                ) : (
                  checkedOutItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`border rounded-lg p-2 backdrop-blur-sm cursor-pointer hover:shadow-md transition-all ${getItemTypeColor(item.type)} bg-opacity-50 hover:bg-opacity-70`}
                      onClick={() => setSelectedItem({
                        id: item.id,
                        title: item.title,
                        type: 'checkout' as const,
                        subType: item.type,
                        dueDate: item.dueDate,
                        content: `Return this ${item.type} by the due date to avoid late fees.`
                      })}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h5 className="font-medium text-sm line-clamp-1 flex-1 mr-2">{item.title}</h5>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(item.status)}`}
                        >
                          {item.status === 'checked_out' ? 'Out' : 'In'}
                        </Badge>
                      </div>
                      <div className="text-xs flex items-center gap-1 opacity-80">
                        <Clock className="h-3 w-3" />
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Layout - Collapsible */}
      <div className="md:hidden">
        <Card className="bg-gradient-to-r from-accent/5 via-secondary/5 to-primary/5 border-accent/20 shadow-lg">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            <CardTitle className="flex items-center justify-between text-secondary-foreground text-lg">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Checked Out Items
                <Badge variant="secondary" className="text-xs">
                  {checkedOutItems.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          
          {!isCollapsed && (
            <CardContent className="space-y-4 transition-all duration-300 ease-out animate-accordion-down">
              {/* Checked Out Items */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Checked Out Items ({checkedOutItems.length})
                </h4>
                <div className="space-y-2">
                  {checkedOutItems.length === 0 ? (
                    <div className="text-center py-2">
                      <Package className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">No items checked out</p>
                    </div>
                  ) : (
                    checkedOutItems.map((item) => (
                      <div 
                        key={item.id} 
                        className={`border rounded-lg p-2 cursor-pointer hover:shadow-md transition-all ${getItemTypeColor(item.type)} bg-opacity-50 hover:bg-opacity-70`}
                        onClick={() => setSelectedItem({
                          id: item.id,
                          title: item.title,
                          type: 'checkout' as const,
                          subType: item.type,
                          dueDate: item.dueDate,
                          content: `Return this ${item.type} by the due date to avoid late fees.`
                        })}
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-sm line-clamp-1 flex-1 mr-2">{item.title}</h5>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(item.status)}`}
                          >
                            {item.status === 'checked_out' ? 'Out' : 'In'}
                          </Badge>
                        </div>
                        <div className="text-xs flex items-center gap-1 mt-1 opacity-80">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <ItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem || { id: '', title: '', type: 'notification' as const }}
      />
    </div>
  );
};