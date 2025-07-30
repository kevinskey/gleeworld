import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, Users, Link, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AnnotationSharingDialogProps {
  markedScoreId: string;
  musicTitle: string;
  children: React.ReactNode;
}

interface Share {
  id: string;
  shared_with: string;
  permission_type: string;
  message?: string;
  shared_at: string;
  is_active: boolean;
  shared_with_profile?: {
    full_name: string;
    email: string;
  };
}

interface PublicShare {
  id: string;
  share_token: string;
  title: string;
  description?: string;
  permission_type: string;
  is_public: boolean;
  view_count: number;
  created_at: string;
}

export const AnnotationSharingDialog = ({ markedScoreId, musicTitle, children }: AnnotationSharingDialogProps) => {
  const { user } = useAuth();
  const [shares, setShares] = useState<Share[]>([]);
  const [publicShares, setPublicShares] = useState<PublicShare[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Direct sharing form
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [shareMessage, setShareMessage] = useState("");
  
  // Public sharing form
  const [publicShareTitle, setPublicShareTitle] = useState("");
  const [publicShareDescription, setPublicShareDescription] = useState("");
  const [publicSharePermission, setPublicSharePermission] = useState<"view" | "edit">("view");
  const [isPublicShare, setIsPublicShare] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShares();
      fetchPublicShares();
    }
  }, [isOpen, markedScoreId]);

  const fetchShares = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_annotation_shares')
        .select(`
          id,
          shared_with,
          permission_type,
          message,
          shared_at,
          is_active
        `)
        .eq('marked_score_id', markedScoreId)
        .eq('is_active', true);

      if (error) throw error;

      // Fetch profile data separately to avoid join issues
      const shareData = data || [];
      const userIds = shareData.map(share => share.shared_with);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        const profileMap = profiles?.reduce((acc, profile) => {
          acc[profile.user_id] = profile;
          return acc;
        }, {} as Record<string, { full_name: string; email: string }>) || {};

        const sharesWithProfiles = shareData.map(share => ({
          ...share,
          shared_with_profile: profileMap[share.shared_with]
        }));

        setShares(sharesWithProfiles);
      } else {
        setShares(shareData);
      }
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  const fetchPublicShares = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_annotation_public_shares')
        .select('*')
        .eq('marked_score_id', markedScoreId)
        .eq('is_active', true);

      if (error) throw error;
      setPublicShares(data || []);
    } catch (error) {
      console.error('Error fetching public shares:', error);
    }
  };

  const handleDirectShare = async () => {
    if (!shareEmail || !user) return;

    setIsLoading(true);
    try {
      // First, find the user by email
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id')
        .eq('email', shareEmail)
        .single();

      if (profileError || !profileData) {
        toast.error("User not found with that email address");
        return;
      }

      // Create the share
      const { error } = await supabase
        .from('gw_annotation_shares')
        .insert({
          marked_score_id: markedScoreId,
          shared_by: user.id,
          shared_with: profileData.user_id,
          permission_type: sharePermission,
          message: shareMessage || null
        });

      if (error) throw error;

      toast.success("Annotation shared successfully!");
      setShareEmail("");
      setShareMessage("");
      fetchShares();
    } catch (error) {
      console.error('Error sharing annotation:', error);
      toast.error("Failed to share annotation");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublicShare = async () => {
    if (!publicShareTitle || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_annotation_public_shares')
        .insert({
          marked_score_id: markedScoreId,
          shared_by: user.id,
          title: publicShareTitle,
          description: publicShareDescription || null,
          permission_type: publicSharePermission,
          is_public: isPublicShare
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Public share link created!");
      setPublicShareTitle("");
      setPublicShareDescription("");
      fetchPublicShares();
    } catch (error) {
      console.error('Error creating public share:', error);
      toast.error("Failed to create public share");
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/shared-annotation/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const revokeShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('gw_annotation_shares')
        .update({ is_active: false })
        .eq('id', shareId);

      if (error) throw error;

      toast.success("Share revoked");
      fetchShares();
    } catch (error) {
      console.error('Error revoking share:', error);
      toast.error("Failed to revoke share");
    }
  };

  const revokePublicShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('gw_annotation_public_shares')
        .update({ is_active: false })
        .eq('id', shareId);

      if (error) throw error;

      toast.success("Public share revoked");
      fetchPublicShares();
    } catch (error) {
      console.error('Error revoking public share:', error);
      toast.error("Failed to revoke public share");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Annotation - {musicTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Direct User Sharing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Share with Specific Users
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shareEmail">User Email</Label>
                <Input
                  id="shareEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sharePermission">Permission</Label>
                <Select value={sharePermission} onValueChange={(value: "view" | "edit") => setSharePermission(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="shareMessage">Message (optional)</Label>
              <Textarea
                id="shareMessage"
                placeholder="Add a note for the recipient..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={2}
              />
            </div>
            
            <Button onClick={handleDirectShare} disabled={isLoading || !shareEmail}>
              Share with User
            </Button>

            {/* Existing Direct Shares */}
            {shares.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Current Shares</h4>
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {share.shared_with_profile?.full_name || share.shared_with_profile?.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {share.permission_type} access • Shared {new Date(share.shared_at).toLocaleDateString()}
                      </div>
                      {share.message && (
                        <div className="text-sm text-muted-foreground italic mt-1">
                          "{share.message}"
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeShare(share.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Public Link Sharing */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Link className="h-4 w-4" />
              Create Share Links
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publicShareTitle">Link Title</Label>
                <Input
                  id="publicShareTitle"
                  placeholder="My annotated score"
                  value={publicShareTitle}
                  onChange={(e) => setPublicShareTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="publicSharePermission">Permission</Label>
                <Select value={publicSharePermission} onValueChange={(value: "view" | "edit") => setPublicSharePermission(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="publicShareDescription">Description (optional)</Label>
              <Textarea
                id="publicShareDescription"
                placeholder="Describe what's special about this annotation..."
                value={publicShareDescription}
                onChange={(e) => setPublicShareDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublicShare"
                checked={isPublicShare}
                onCheckedChange={setIsPublicShare}
              />
              <Label htmlFor="isPublicShare">Make publicly discoverable</Label>
            </div>
            
            <Button onClick={handlePublicShare} disabled={isLoading || !publicShareTitle}>
              Create Share Link
            </Button>

            {/* Existing Public Shares */}
            {publicShares.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Created Share Links</h4>
                {publicShares.map((share) => (
                  <div key={share.id} className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{share.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {share.permission_type} access • {share.view_count} views
                          {share.is_public && <Badge variant="secondary" className="ml-2">Public</Badge>}
                        </div>
                        {share.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {share.description}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyShareLink(share.share_token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokePublicShare(share.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
