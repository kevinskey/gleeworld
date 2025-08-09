import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface RequestChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string;
  currentValue?: string | number | null;
  userEmail?: string | null;
}

export const RequestChangeDialog: React.FC<RequestChangeDialogProps> = ({
  open,
  onOpenChange,
  fieldLabel,
  currentValue,
  userEmail,
}) => {
  const { toast } = useToast();
  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [recipient, setRecipient] = useState("");

  const emailHref = useMemo(() => {
    const to = encodeURIComponent(recipient.trim());
    const subject = encodeURIComponent(`Profile change request — ${fieldLabel}`);
    const body = encodeURIComponent(
      `Hello Admins,\n\nI would like to request a change to my profile.\n\nField: ${fieldLabel}\nCurrent value: ${currentValue ?? "(none)"}\nRequested new value: ${requestedValue || "(please specify)"}\nReason: ${reason || "(optional)"}\n\nFrom: ${userEmail || "(user email)"}`
    );
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [recipient, fieldLabel, currentValue, requestedValue, reason, userEmail]);

  const copyDetails = async () => {
    const text = `Profile change request — ${fieldLabel}\nCurrent: ${currentValue ?? "(none)"}\nRequested: ${requestedValue || "(please specify)"}\nReason: ${reason || "(optional)"}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Request details copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request change — {fieldLabel}</DialogTitle>
          <DialogDescription>Send a request to administrators to update this protected field.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Current value</Label>
            <Input value={(currentValue ?? "").toString()} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requested-value">Requested new value</Label>
            <Input id="requested-value" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} placeholder="Enter the correct value" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Provide context to help admins approve this quickly" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient (optional)</Label>
            <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="admin@your-org.org" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={copyDetails}>Copy details</Button>
          <a href={emailHref}>
            <Button type="button">Open email draft</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
