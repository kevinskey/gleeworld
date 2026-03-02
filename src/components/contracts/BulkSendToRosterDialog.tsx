import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface RosterMember {
  user_id: string;
  full_name: string;
  email: string;
}

interface BulkSendResult {
  email: string;
  name: string;
  success: boolean;
  error?: string;
}

interface BulkSendToRosterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: { id: string; title: string; content: string; status: string; created_at: string } | null;
  onSent?: () => void;
}

export const BulkSendToRosterDialog = ({
  isOpen,
  onClose,
  contract,
  onSent,
}: BulkSendToRosterDialogProps) => {
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BulkSendResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"select" | "sending" | "done">("select");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchRosterMembers();
      setPhase("select");
      setResults([]);
      setProgress(0);
      setCustomMessage("");
    }
  }, [isOpen]);

  const fetchRosterMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gw_tour_roster")
        .select("user_id")
        .eq("status", "confirmed");

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((r) => r.user_id);
        const { data: profiles, error: profileError } = await supabase
          .from("gw_profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        if (profileError) throw profileError;

        const members = (profiles || [])
          .filter((p) => p.email)
          .map((p) => ({
            user_id: p.user_id,
            full_name: p.full_name || p.email,
            email: p.email,
          }));

        setRosterMembers(members);
        setSelectedMembers(new Set(members.map((m) => m.user_id)));
      } else {
        setRosterMembers([]);
        setSelectedMembers(new Set());
      }
    } catch (err) {
      console.error("Error fetching roster:", err);
      toast({
        title: "Error",
        description: "Failed to load roster members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(new Set(rosterMembers.map((m) => m.user_id)));
    } else {
      setSelectedMembers(new Set());
    }
  };

  const handleBulkSend = async () => {
    if (!contract || selectedMembers.size === 0) return;

    setSending(true);
    setPhase("sending");
    setResults([]);
    setProgress(0);

    const membersToSend = rosterMembers.filter((m) => selectedMembers.has(m.user_id));
    const totalCount = membersToSend.length;
    const sendResults: BulkSendResult[] = [];

    for (let i = 0; i < membersToSend.length; i++) {
      const member = membersToSend[i];
      try {
        const { error } = await supabase.functions.invoke("send-contract-email", {
          body: {
            contractId: contract.id,
            contractTitle: contract.title,
            recipientEmail: member.email,
            recipientName: member.full_name,
            customMessage: customMessage || undefined,
            isResend: false,
          },
        });

        if (error) throw error;

        sendResults.push({ email: member.email, name: member.full_name, success: true });
      } catch (err: any) {
        console.error(`Failed to send to ${member.email}:`, err);
        sendResults.push({
          email: member.email,
          name: member.full_name,
          success: false,
          error: err.message || "Send failed",
        });
      }

      setProgress(Math.round(((i + 1) / totalCount) * 100));
      setResults([...sendResults]);
    }

    setSending(false);
    setPhase("done");

    const successCount = sendResults.filter((r) => r.success).length;
    const failCount = sendResults.filter((r) => !r.success).length;

    toast({
      title: "Bulk Send Complete",
      description: `${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0) onSent?.();
  };

  const handleClose = () => {
    if (sending) return; // Don't close while sending
    onClose();
  };

  const allSelected = rosterMembers.length > 0 && selectedMembers.size === rosterMembers.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Send to Tour Roster
          </DialogTitle>
          <DialogDescription>
            Send "{contract?.title}" to all confirmed roster members
          </DialogDescription>
        </DialogHeader>

        {phase === "select" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading roster...</span>
              </div>
            ) : rosterMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No confirmed roster members found</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-sm font-medium">
                      {selectedMembers.size} of {rosterMembers.length} selected
                    </span>
                  </div>
                  <Badge variant="secondary">{rosterMembers.length} members</Badge>
                </div>

                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-1">
                    {rosterMembers.map((member) => (
                      <label
                        key={member.user_id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMembers.has(member.user_id)}
                          onCheckedChange={() => toggleMember(member.user_id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>

                <div className="space-y-2">
                  <Label>Custom Message (optional)</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message to include with each email..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkSend}
                    disabled={selectedMembers.size === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedMembers.size} Member{selectedMembers.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {(phase === "sending" || phase === "done") && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{phase === "sending" ? "Sending..." : "Complete"}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <ScrollArea className="h-48 border rounded-md p-2">
              <div className="space-y-1">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 text-sm rounded-md"
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1">{result.name}</span>
                    {!result.success && (
                      <span className="text-xs text-red-500 truncate max-w-32">
                        {result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {phase === "done" && (
              <div className="flex justify-end">
                <Button onClick={handleClose}>Close</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
