import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shirt, ChevronDown, ChevronUp, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const DRESS_CONDITIONS = [
  { value: 'excellent', label: 'Excellent - Like new' },
  { value: 'good', label: 'Good - Minor wear' },
  { value: 'fair', label: 'Fair - Visible wear' },
  { value: 'needs_repair', label: 'Needs Repair' },
  { value: 'damaged', label: 'Damaged' },
];

export const DressCheckoutForm = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingCheckout, setExistingCheckout] = useState<any>(null);

  const [dressReturned, setDressReturned] = useState(false);
  const [dressCondition, setDressCondition] = useState('');
  const [accessoriesReturned, setAccessoriesReturned] = useState(false);
  const [missingItems, setMissingItems] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchExistingCheckout();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchExistingCheckout = async () => {
    try {
      const { data, error } = await supabase
        .from('dress_checkouts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingCheckout(data);
        setDressReturned(data.dress_returned || false);
        setDressCondition(data.dress_condition || '');
        setAccessoriesReturned(data.accessories_returned || false);
        setMissingItems(data.missing_items || '');
        setConditionNotes(data.condition_notes || '');
      }
    } catch (error) {
      console.error('Error fetching dress checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const checkoutData = {
        user_id: user.id,
        semester: 'Fall 2025',
        dress_returned: dressReturned,
        dress_condition: dressCondition || null,
        accessories_returned: accessoriesReturned,
        missing_items: missingItems || null,
        condition_notes: conditionNotes || null,
        updated_at: new Date().toISOString(),
      };

      if (existingCheckout) {
        const { error } = await supabase
          .from('dress_checkouts')
          .update(checkoutData)
          .eq('id', existingCheckout.id);

        if (error) throw error;
        toast.success('Dress checkout updated!');
      } else {
        const { data, error } = await supabase
          .from('dress_checkouts')
          .insert(checkoutData)
          .select()
          .single();

        if (error) throw error;
        setExistingCheckout(data);
        toast.success('Dress checkout submitted!');
      }

      fetchExistingCheckout();
    } catch (error: any) {
      console.error('Error submitting dress checkout:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || loading) return null;

  const isApproved = existingCheckout?.status === 'approved';
  const hasIssues = existingCheckout?.status === 'issues_noted';
  const isPending = existingCheckout?.status === 'pending';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/80 backdrop-blur-sm border border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shirt className="h-5 w-5 text-pink-500" />
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Dress & Accessories Return
                    {isApproved && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400 gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </Badge>
                    )}
                    {hasIssues && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Issues Noted
                      </Badge>
                    )}
                    {isPending && existingCheckout && (
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
                        Pending Review
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Drew & Soleil sign-off
                  </CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {existingCheckout?.signed_off_by && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Signed off by <strong>{existingCheckout.signed_off_by_name}</strong> on{' '}
                  {new Date(existingCheckout.signed_off_at).toLocaleDateString()}
                </p>
                {existingCheckout.sign_off_notes && (
                  <p className="text-sm text-muted-foreground mt-1">{existingCheckout.sign_off_notes}</p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dress-returned"
                  checked={dressReturned}
                  onCheckedChange={(checked) => setDressReturned(checked === true)}
                  disabled={isApproved}
                />
                <Label htmlFor="dress-returned" className="text-sm">Dress returned</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="accessories-returned"
                  checked={accessoriesReturned}
                  onCheckedChange={(checked) => setAccessoriesReturned(checked === true)}
                  disabled={isApproved}
                />
                <Label htmlFor="accessories-returned" className="text-sm">All accessories returned (belt, gloves, etc.)</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dress-condition" className="text-sm">Dress Condition</Label>
              <Select value={dressCondition} onValueChange={setDressCondition} disabled={isApproved}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {DRESS_CONDITIONS.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="missing-items" className="text-sm">Missing Items (if any)</Label>
              <Textarea
                id="missing-items"
                placeholder="List any missing accessories or items..."
                value={missingItems}
                onChange={(e) => setMissingItems(e.target.value)}
                className="min-h-[60px] text-sm"
                disabled={isApproved}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition-notes" className="text-sm">Condition Notes</Label>
              <Textarea
                id="condition-notes"
                placeholder="Note any stains, tears, or repairs needed..."
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                className="min-h-[60px] text-sm"
                disabled={isApproved}
              />
            </div>

            {!isApproved && (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="w-full"
                size="sm"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingCheckout ? 'Update Submission' : 'Submit for Review'}
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
