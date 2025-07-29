import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, DollarSign, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { ItemDetailModal } from "../modals/ItemDetailModal";

export const TasksSection = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Mock data for checked out items and dues - replace with real data
  const checkedOutItems = [
    { id: '1', title: 'Black Concert Dress', dueDate: '2024-02-15', type: 'uniform' },
    { id: '2', title: 'Music Folder - Spring Concert', dueDate: '2024-02-20', type: 'music' },
  ];

  const duesInfo = {
    totalDue: 150.00,
    dueDate: '2024-03-01',
    items: [
      { description: 'Membership Dues', amount: 100.00 },
      { description: 'Concert Attire Fee', amount: 50.00 },
    ]
  };

  const totalTaskCount = checkedOutItems.length + (duesInfo.totalDue > 0 ? 1 : 0);

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'uniform': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'music': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'equipment': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDuesStatusColor = () => {
    const today = new Date();
    const dueDate = new Date(duesInfo.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return 'bg-red-50 border-red-200 text-red-900'; // Overdue
    } else if (daysUntilDue <= 7) {
      return 'bg-orange-50 border-orange-200 text-orange-900'; // Due soon
    } else {
      return 'bg-yellow-50 border-yellow-200 text-yellow-900'; // Due later
    }
  };

  return (
    <div className="w-full">
      {/* Desktop Layout */}
      <div className="hidden md:flex gap-4 w-full">
        {/* Checked Out Items Column */}
        <Card className="bg-gradient-to-r from-accent/5 via-secondary/5 to-primary/5 border-accent/20 shadow-lg h-64 flex-1">
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
                        <h5 className="font-medium text-sm line-clamp-1">{item.title}</h5>
                        <Badge variant="secondary" className={`text-xs ${getItemTypeColor(item.type)}`}>
                          {item.type}
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

        {/* Dues Column */}
        <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 border-primary/20 shadow-lg h-64 flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-secondary-foreground text-base">
              <DollarSign className="h-4 w-4" />
              Outstanding Dues
              {duesInfo.totalDue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Due
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-44">
              {duesInfo.totalDue === 0 ? (
                <div className="text-center py-4">
                  <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <p className="text-sm text-green-600">All dues paid!</p>
                </div>
              ) : (
                <div 
                  className={`space-y-2 cursor-pointer hover:shadow-md p-3 rounded-lg transition-all border ${getDuesStatusColor()}`}
                  onClick={() => setSelectedItem({
                    id: 'dues-payment',
                    title: 'Outstanding Dues Payment',
                    type: 'dues' as const,
                    amount: duesInfo.totalDue,
                    dueDate: duesInfo.dueDate,
                    content: `Payment required for: ${duesInfo.items.map(item => item.description).join(', ')}`
                  })}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">${duesInfo.totalDue.toFixed(2)}</span>
                    <span className="text-sm opacity-80">Due: {new Date(duesInfo.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="space-y-1">
                    {duesInfo.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="opacity-80">{item.description}</span>
                        <span className="font-medium">${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                Tasks & Dues
                <Badge variant="secondary" className="text-xs">
                  {totalTaskCount}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          
          {!isCollapsed && (
            <CardContent className="space-y-4">
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
                          <h5 className="font-medium text-sm line-clamp-1">{item.title}</h5>
                          <Badge variant="secondary" className={`text-xs ${getItemTypeColor(item.type)}`}>
                            {item.type}
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

              {/* Dues */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Outstanding Dues
                  {duesInfo.totalDue > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Due
                    </Badge>
                  )}
                </h4>
                {duesInfo.totalDue === 0 ? (
                  <div className="text-center py-2">
                    <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-1" />
                    <p className="text-sm text-green-600">All dues paid!</p>
                  </div>
                ) : (
                  <div 
                    className={`border rounded-lg p-2 cursor-pointer hover:shadow-md transition-all ${getDuesStatusColor()}`}
                    onClick={() => setSelectedItem({
                      id: 'dues-payment',
                      title: 'Outstanding Dues Payment',
                      type: 'dues' as const,
                      amount: duesInfo.totalDue,
                      dueDate: duesInfo.dueDate,
                      content: `Payment required for: ${duesInfo.items.map(item => item.description).join(', ')}`
                    })}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold">${duesInfo.totalDue.toFixed(2)}</span>
                      <span className="text-xs opacity-80">Due: {new Date(duesInfo.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-1">
                      {duesInfo.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="opacity-80">{item.description}</span>
                          <span className="font-medium">${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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