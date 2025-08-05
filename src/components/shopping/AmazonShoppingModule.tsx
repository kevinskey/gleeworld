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
  MapPin,
  Package,
  Star,
  ExternalLink,
  RefreshCw
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
  purpose: string;
  items: ShoppingItem[];
  aiSuggestions?: string[];
  totalEstimated: number;
  createdAt: string;
}

export const AmazonShoppingModule = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [plans, setPlans] = useState<ShoppingPlan[]>([]);
  const [results, setResults] = useState<any>(null);
  
  // Form state
  const [planTitle, setPlanTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [itemsList, setItemsList] = useState("");
  const [currentPlan, setCurrentPlan] = useState<ShoppingPlan | null>(null);

  const searchAmazon = async () => {
    if (!itemsList.trim() || !budget) {
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
          title: planTitle || 'Amazon Search Results',
          budget: parseFloat(budget),
          purpose: itemsList,
          action: 'generate_plan'
        }
      });

      if (error) throw error;

      setResults(data);
      setActiveTab("results");

      toast({
        title: "Amazon Search Complete",
        description: `Found ${data.items?.length || 0} products for your search!`
      });

    } catch (error) {
      console.error('Error searching Amazon:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search Amazon. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setResults(null);
    setPlanTitle("");
    setBudget("");
    setItemsList("");
    setCurrentPlan(null);
    setActiveTab("search");
    
    toast({
      title: "Session Cleared",
      description: "All unsaved information has been cleared. You can start fresh!"
    });
  };

  const savePlan = () => {
    if (!results) return;

    const newPlan: ShoppingPlan = {
      id: Date.now().toString(),
      title: planTitle || 'Amazon Shopping List',
      budget: parseFloat(budget),
      purpose: itemsList,
      items: results.items || [],
      aiSuggestions: results.suggestions || [],
      totalEstimated: results.totalEstimated || 0,
      createdAt: new Date().toLocaleDateString()
    };

    setPlans(prev => [newPlan, ...prev]);
    setCurrentPlan(newPlan);
    setActiveTab("saved");

    toast({
      title: "Plan Saved",
      description: "Your Amazon shopping plan has been saved!"
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const budgetStatus = results ? {
    remaining: parseFloat(budget) - (results.totalEstimated || 0),
    percentage: ((results.totalEstimated || 0) / parseFloat(budget)) * 100
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm">
                <Package className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Amazon Shopping Assistant
            </h1>
            <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              AI-powered product discovery and smart shopping planning for your Amazon purchases
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">AI-Powered</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Budget Tracking</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">Best Deals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Plans</p>
                <p className="text-2xl font-bold text-blue-900">{plans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 rounded-xl shadow-md">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Avg. Savings</p>
                <p className="text-2xl font-bold text-green-900">15%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500 rounded-xl shadow-md">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">AI Searches</p>
                <p className="text-2xl font-bold text-purple-900">{results ? '1' : '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500 rounded-xl shadow-md">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700">Top Rated</p>
                <p className="text-2xl font-bold text-orange-900">4.5★</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="search">Amazon Search</TabsTrigger>
            <TabsTrigger value="results">Search Results</TabsTrigger>
            <TabsTrigger value="saved">Saved Plans</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {(results || itemsList || budget || planTitle) && (
          <Button
            onClick={clearAll}
            variant="outline"
            className="ml-4 hover-scale animate-fade-in"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* Amazon Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Amazon Product Search
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
                  value={itemsList}
                  onChange={(e) => setItemsList(e.target.value)}
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
                  <Label htmlFor="planTitle">Shopping List Name (optional)</Label>
                  <Input
                    id="planTitle"
                    placeholder="e.g., Office Setup"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={searchAmazon} 
                disabled={loading || !itemsList.trim()}
                className="w-full"
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

        {/* Search Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {results ? (
            <>
              {/* Budget Overview */}
              {budgetStatus && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Budget Overview
                      </div>
                      <Button onClick={savePlan} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Save Plan
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-semibold">${budget}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Total</p>
                          <p className="font-semibold">${results.totalEstimated?.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {budgetStatus.remaining >= 0 ? (
                          <TrendingDown className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Remaining</p>
                          <p className={`font-semibold ${budgetStatus.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${budgetStatus.remaining.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Budget Progress Bar */}
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
                  </CardContent>
                </Card>
              )}

              {/* AI Suggestions */}
              {results.suggestions && results.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      AI Shopping Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.suggestions.map((suggestion: string, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                          <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Product Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Amazon Products ({results.items?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.items?.map((item: ShoppingItem) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-lg">{item.name}</h4>
                           <span className="text-2xl font-bold text-primary">
                             ${item.estimatedPrice.toFixed(2)}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority} priority
                          </Badge>
                          <Badge variant="secondary">{item.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{item.notes}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(item.amazonUrl, '_blank')}
                          className="w-full"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on Amazon
                        </Button>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Search Results</h3>
                  <p className="text-muted-foreground mb-4">Search for Amazon products to see results here</p>
                  <Button onClick={() => setActiveTab("search")}>
                    Start Shopping
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Saved Plans Tab */}
        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Shopping Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Saved Plans</h3>
                  <p className="text-muted-foreground mb-4">Save your Amazon searches to access them later</p>
                  <Button onClick={() => setActiveTab("search")}>
                    Create First Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setCurrentPlan(plan)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{plan.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>${plan.totalEstimated.toFixed(2)} total</span>
                          <span>{plan.items.length} items</span>
                          <span>{plan.createdAt}</span>
                        </div>
                      </div>
                      <Badge variant="outline">
                        Budget: ${plan.budget}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};