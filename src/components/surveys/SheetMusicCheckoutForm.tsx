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
import { Music, ChevronDown, ChevronUp, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const SheetMusicCheckoutForm = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingCheckout, setExistingCheckout] = useState<any>(null);

  const [folderReturned, setFolderReturned] = useState(false);
  const [musicReturned, setMusicReturned] = useState(false);
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
        .from('sheet_music_checkouts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('semester', 'Fall 2025')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingCheckout(data);
        setFolderReturned(data.folder_returned || false);
        setMusicReturned(data.music_returned || false);
        setMissingItems(data.missing_items || '');
        setConditionNotes(data.condition_notes || '');
      }
    } catch (error) {
      console.error('Error fetching sheet music checkout:', error);
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
        folder_returned: folderReturned,
        music_returned: musicReturned,
        missing_items: missingItems || null,
        condition_notes: conditionNotes || null,
        updated_at: new Date().toISOString(),
      };

      if (existingCheckout) {
        const { error } = await supabase
          .from('sheet_music_checkouts')
          .update(checkoutData)
          .eq('id', existingCheckout.id);

        if (error) throw error;
        toast.success('Sheet music checkout updated!');
      } else {
        const { data, error } = await supabase
          .from('sheet_music_checkouts')
          .insert(checkoutData)
          .select()
          .single();

        if (error) throw error;
        setExistingCheckout(data);
        toast.success('Sheet music checkout submitted!');
      }

      fetchExistingCheckout();
    } catch (error: any) {
      console.error('Error submitting sheet music checkout:', error);
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
                <Music className="h-5 w-5 text-blue-500" />
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Sheet Music & Folder Return
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
                    Madison & Alexandra sign-off
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
                  id="folder-returned"
                  checked={folderReturned}
                  onCheckedChange={(checked) => setFolderReturned(checked === true)}
                  disabled={isApproved}
                />
                <Label htmlFor="folder-returned" className="text-sm">Music folder returned</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="music-returned"
                  checked={musicReturned}
                  onCheckedChange={(checked) => setMusicReturned(checked === true)}
                  disabled={isApproved}
                />
                <Label htmlFor="music-returned" className="text-sm">All sheet music returned</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="missing-items" className="text-sm">Missing Items (if any)</Label>
              <Textarea
                id="missing-items"
                placeholder="List any missing sheet music or materials..."
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
                placeholder="Note any damage or wear..."
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
