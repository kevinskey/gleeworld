import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, 
  Brain, 
  DollarSign, 
  Plus, 
  Trash2, 
  Calculator,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Calendar,
  MapPin
} from "lucide-react";

interface ShoppingItem {
  id: string;
  name: string;
  estimatedPrice: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  notes?: string;
  amazonUrl?: string;
}

interface ShoppingPlan {
  id: string;
  title: string;
  budget: number;
  timeframe: string;
  purpose: string;
  items: ShoppingItem[];
  aiSuggestions?: string[];
  totalEstimated: number;
}

export const AIShoppingPlanner = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const [plans, setPlans] = useState<ShoppingPlan[]>([]);
  
  // Form state
  const [planTitle, setPlanTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [purpose, setPurpose] = useState("");
  const [currentPlan, setCurrentPlan] = useState<ShoppingPlan | null>(null);
  
  // New item form
  const [newItem, setNewItem] = useState({
    name: "",
    estimatedPrice: "",
    priority: "medium" as const,
    category: "",
    notes: ""
  });

  const generateAIPlan = async () => {
    if (!purpose.trim() || !budget) {
      toast({
        title: "Missing Information",
        description: "Please enter what you need and your budget.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopping-planner', {
        body: {
          title: planTitle,
          budget: parseFloat(budget),
          timeframe,
          purpose,
          action: 'generate_plan'
        }
      });

      if (error) throw error;

      const newPlan: ShoppingPlan = {
        id: Date.now().toString(),
        title: planTitle,
        budget: parseFloat(budget),
        timeframe,
        purpose,
        items: data.items || [],
        aiSuggestions: data.suggestions || [],
        totalEstimated: data.totalEstimated || 0
      };

      setCurrentPlan(newPlan);
      setPlans(prev => [...prev, newPlan]);
      setActiveTab("plan");

      toast({
        title: "AI Plan Generated",
        description: "Your shopping plan has been created with AI suggestions!"
      });

    } catch (error) {
      console.error('Error generating AI plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI shopping plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addItemToPlan = () => {
    if (!newItem.name || !newItem.estimatedPrice) {
      toast({
        title: "Missing Item Information",
        description: "Please enter item name and estimated price.",
        variant: "destructive"
      });
      return;
    }

    const item: ShoppingItem = {
      id: Date.now().toString(),
      name: newItem.name,
      estimatedPrice: parseFloat(newItem.estimatedPrice),
      priority: newItem.priority,
      category: newItem.category || "Other",
      notes: newItem.notes
    };

    if (currentPlan) {
      const updatedPlan = {
        ...currentPlan,
        items: [...currentPlan.items, item],
        totalEstimated: currentPlan.totalEstimated + item.estimatedPrice
      };
      setCurrentPlan(updatedPlan);
      setPlans(prev => prev.map(p => p.id === currentPlan.id ? updatedPlan : p));
    }

    setNewItem({
      name: "",
      estimatedPrice: "",
      priority: "medium",
      category: "",
      notes: ""
    });
  };

  const removeItem = (itemId: string) => {
    if (currentPlan) {
      const itemToRemove = currentPlan.items.find(item => item.id === itemId);
      const updatedPlan = {
        ...currentPlan,
        items: currentPlan.items.filter(item => item.id !== itemId),
        totalEstimated: currentPlan.totalEstimated - (itemToRemove?.estimatedPrice || 0)
      };
      setCurrentPlan(updatedPlan);
      setPlans(prev => prev.map(p => p.id === currentPlan.id ? updatedPlan : p));
    }
  };

  const optimizePlan = async () => {
    if (!currentPlan) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shopping-planner', {
        body: {
          plan: currentPlan,
          action: 'optimize_plan'
        }
      });

      if (error) throw error;

      const optimizedPlan = {
        ...currentPlan,
        items: data.optimizedItems || currentPlan.items,
        aiSuggestions: data.suggestions || [],
        totalEstimated: data.totalEstimated || currentPlan.totalEstimated
      };

      setCurrentPlan(optimizedPlan);
      setPlans(prev => prev.map(p => p.id === currentPlan.id ? optimizedPlan : p));

      toast({
        title: "Plan Optimized",
        description: "Your shopping plan has been optimized for better budget efficiency!"
      });

    } catch (error) {
      console.error('Error optimizing plan:', error);
      toast({
        title: "Error",
        description: "Failed to optimize plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const budgetStatus = currentPlan ? {
    remaining: currentPlan.budget - currentPlan.totalEstimated,
    percentage: (currentPlan.totalEstimated / currentPlan.budget) * 100
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-brand-primary" />
            AI Shopping Planner
          </h1>
          <p className="text-muted-foreground">Smart shopping plans powered by AI</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Plan</TabsTrigger>
          <TabsTrigger value="plan">Current Plan</TabsTrigger>
          <TabsTrigger value="history">Plan History</TabsTrigger>
        </TabsList>

        {/* Create Plan Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Amazon Product Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemsList">What do you need? (one item per line)</Label>
                <Textarea
                  id="itemsList"
                  placeholder={`Wireless headphones
Office chair
USB-C cable
Coffee mug
Laptop stand`}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="500"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planTitle">List Name (optional)</Label>
                  <Input
                    id="planTitle"
                    placeholder="e.g., Office Setup"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={generateAIPlan} 
                disabled={loading || !purpose.trim()}
                className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching Amazon...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Search Amazon with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Current Plan Tab */}
        <TabsContent value="plan" className="space-y-4">
          {currentPlan ? (
            <>
              {/* Plan Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      {currentPlan.title}
                    </div>
                    <Button 
                      onClick={optimizePlan} 
                      disabled={loading}
                      variant="outline"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                      ) : (
                        <>
                          <Lightbulb className="w-4 h-4 mr-2" />
                          Optimize Plan
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="font-semibold">${currentPlan.budget.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Total</p>
                        <p className="font-semibold">${currentPlan.totalEstimated.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {budgetStatus && budgetStatus.remaining >= 0 ? (
                        <TrendingDown className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className={`font-semibold ${budgetStatus && budgetStatus.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${budgetStatus?.remaining.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Timeframe</p>
                        <p className="font-semibold">{currentPlan.timeframe}</p>
                      </div>
                    </div>
                  </div>

                  {/* Budget Progress Bar */}
                  {budgetStatus && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Budget Usage</span>
                        <span>{budgetStatus.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            budgetStatus.percentage > 100 ? 'bg-red-500' : 
                            budgetStatus.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budgetStatus.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Suggestions */}
              {currentPlan.aiSuggestions && currentPlan.aiSuggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-brand-primary" />
                      AI Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentPlan.aiSuggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-brand-primary/5 rounded-lg">
                          <Lightbulb className="w-4 h-4 text-brand-primary mt-0.5" />
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add New Item */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Item to Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemName">Item Name</Label>
                      <Input
                        id="itemName"
                        placeholder="e.g., Microphone"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itemPrice">Estimated Price ($)</Label>
                      <Input
                        id="itemPrice"
                        type="number"
                        placeholder="150"
                        value={newItem.estimatedPrice}
                        onChange={(e) => setNewItem(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itemCategory">Category</Label>
                      <Input
                        id="itemCategory"
                        placeholder="e.g., Audio Equipment"
                        value={newItem.category}
                        onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={addItemToPlan} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </CardContent>
              </Card>

              {/* Shopping Items List */}
              <Card>
                <CardHeader>
                  <CardTitle>Shopping Items ({currentPlan.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentPlan.items.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No items in your shopping plan yet.</p>
                  ) : (
                    <div className="space-y-3">
                       {currentPlan.items.map((item) => (
                         <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-2">
                               <h4 className="font-medium">{item.name}</h4>
                               <Badge variant="outline" className={getPriorityColor(item.priority)}>
                                 {item.priority}
                               </Badge>
                               <Badge variant="secondary">{item.category}</Badge>
                             </div>
                             <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                               <div className="flex items-center gap-1">
                                 <DollarSign className="w-3 h-3" />
                                 ${item.estimatedPrice.toFixed(2)}
                               </div>
                               {item.notes && (
                                 <div className="flex items-center gap-1">
                                   <MapPin className="w-3 h-3" />
                                   {item.notes}
                                 </div>
                               )}
                             </div>
                             {item.amazonUrl && (
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={() => window.open(item.amazonUrl, '_blank')}
                                 className="mr-2"
                               >
                                 View on Amazon
                               </Button>
                             )}
                           </div>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => removeItem(item.id)}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Plan</h3>
                  <p className="text-muted-foreground mb-4">Create a new shopping plan to get started</p>
                  <Button onClick={() => setActiveTab("create")}>
                    Create Your First Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan History</CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No shopping plans created yet.</p>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setCurrentPlan(plan);
                        setActiveTab("plan");
                      }}
                    >
                      <div>
                        <h4 className="font-medium">{plan.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Budget: ${plan.budget} • {plan.items.length} items • {plan.purpose}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${plan.totalEstimated.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{plan.timeframe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};