
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, Calendar, Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SubmitForApprovalButton } from "@/components/admin/budget/SubmitForApprovalButton";

interface EventWithBudget {
  id: string;
  title: string;
  event_name: string;
  event_type: string;
  event_date_start: string;
  location?: string;
  expected_headcount?: number;
  total_expenses?: number;
  total_income?: number;
  net_total?: number;
  budget_status?: string;
  line_items_count?: number;
}

export const BudgetsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgetEvents, setBudgetEvents] = useState<EventWithBudget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgetEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch events that have budgets (where user has access)
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, title, event_name, event_type, event_date_start, location, 
          expected_headcount, total_expenses, total_income, net_total, budget_status
        `)
        .or(`created_by.eq.${user.id},event_lead_id.eq.${user.id}`)
        .in('event_type', ['social', 'meeting', 'workshop', 'audition', 'sectionals', 'other'])
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Get line items count for each event
      const eventsWithCounts = await Promise.all(
        (events || []).map(async (event) => {
          const { count } = await supabase
            .from('event_line_items')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          return {
            ...event,
            line_items_count: count || 0
          };
        })
      );

      setBudgetEvents(eventsWithCounts);
    } catch (err) {
      console.error('Error fetching budget events:', err);
      toast({
        title: "Error",
        description: "Failed to load budget events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetEvents();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBudgetStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'draft': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'pending_approval': 'bg-blue-100 text-blue-800 border-blue-300',
      'submitted': 'bg-blue-100 text-blue-800 border-blue-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || colors.draft;
  };

  const getBudgetStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getBudgetStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Draft',
      'pending_approval': 'Pending Approval',
      'submitted': 'Submitted',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return labels[status] || 'Draft';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (budgetEvents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Budget Worksheets</h3>
          <p className="text-muted-foreground mb-4">
            Create events that require budgets to start managing finances.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {budgetEvents.map((event) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {event.event_name || event.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getBudgetStatusIcon(event.budget_status || 'draft')}
                  <Badge className={getBudgetStatusColor(event.budget_status || 'draft')}>
                    {getBudgetStatusLabel(event.budget_status || 'draft')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(event.event_date_start).toLocaleDateString()}
              </span>
            </div>
            
            {event.expected_headcount && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{event.expected_headcount} attendees</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{event.line_items_count} line items</span>
            </div>
            
            {/* Budget Summary */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses:</span>
                <span className="text-red-600">
                  {formatCurrency(event.total_expenses || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income:</span>
                <span className="text-green-600">
                  {formatCurrency(event.total_income || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Net Total:</span>
                <span className={`${(event.net_total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(event.net_total || 0)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <SubmitForApprovalButton
                eventId={event.id}
                currentStatus={event.budget_status || 'draft'}
                onStatusUpdate={fetchBudgetEvents}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Manage Budget
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
