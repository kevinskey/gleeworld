import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, ShirtIcon, CheckCircle, Clock, AlertTriangle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CheckoutRecord {
  id: string;
  status: string;
  notes?: string | null;
  submitted_at: string;
  signed_off_by?: string | null;
  signed_off_at?: string | null;
  approver_name?: string;
}

interface MemberCheckoutStatusProps {
  userId: string;
}

export const MemberCheckoutStatus: React.FC<MemberCheckoutStatusProps> = ({ userId }) => {
  const [sheetMusicCheckout, setSheetMusicCheckout] = useState<CheckoutRecord | null>(null);
  const [dressCheckout, setDressCheckout] = useState<CheckoutRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCheckouts = async () => {
      try {
        // Fetch sheet music checkout
        const { data: sheetData } = await supabase
          .from("sheet_music_checkouts")
          .select("*")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sheetData) {
          let approverName = null;
          if (sheetData.signed_off_by) {
            const { data: approver } = await supabase
              .from("gw_profiles")
              .select("full_name")
              .eq("user_id", sheetData.signed_off_by)
              .maybeSingle();
            approverName = approver?.full_name;
          }
          setSheetMusicCheckout({ ...sheetData, approver_name: approverName });
        }

        // Fetch dress checkout
        const { data: dressData } = await supabase
          .from("dress_checkouts")
          .select("*")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dressData) {
          let approverName = null;
          if (dressData.signed_off_by) {
            const { data: approver } = await supabase
              .from("gw_profiles")
              .select("full_name")
              .eq("user_id", dressData.signed_off_by)
              .maybeSingle();
            approverName = approver?.full_name;
          }
          setDressCheckout({ ...dressData, approver_name: approverName });
        }
      } catch (err) {
        console.error("Error fetching checkout status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckouts();
  }, [userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "issues_noted":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Issues Noted</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-muted-foreground">
          Loading checkout status...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Folder className="h-4 w-4" />
          End of Semester Checkouts
        </CardTitle>
      </CardHeader>
      <CardContent className="py-0 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sheet Music Checkout */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <Folder className="h-4 w-4 text-primary" />
                Sheet Music/Folder
              </span>
              {sheetMusicCheckout ? getStatusBadge(sheetMusicCheckout.status) : (
                <Badge variant="outline">Not Submitted</Badge>
              )}
            </div>
            {sheetMusicCheckout && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Submitted: {format(new Date(sheetMusicCheckout.submitted_at), "MMM d, yyyy")}</p>
                {sheetMusicCheckout.signed_off_at && (
                  <p className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Signed off by: {sheetMusicCheckout.approver_name || "Admin"}
                  </p>
                )}
                {sheetMusicCheckout.notes && (
                  <p className="italic">Notes: {sheetMusicCheckout.notes}</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sign-off: Madison / Alexandra (Librarian/Music)
            </p>
          </div>

          {/* Dress Checkout */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-2">
                <ShirtIcon className="h-4 w-4 text-primary" />
                Dress Return
              </span>
              {dressCheckout ? getStatusBadge(dressCheckout.status) : (
                <Badge variant="outline">Not Submitted</Badge>
              )}
            </div>
            {dressCheckout && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Submitted: {format(new Date(dressCheckout.submitted_at), "MMM d, yyyy")}</p>
                {dressCheckout.signed_off_at && (
                  <p className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Signed off by: {dressCheckout.approver_name || "Admin"}
                  </p>
                )}
                {dressCheckout.notes && (
                  <p className="italic">Notes: {dressCheckout.notes}</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sign-off: Drew / Soleil (Wardrobe)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
