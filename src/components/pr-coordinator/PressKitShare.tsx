import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PressKit, usePressKits } from '@/hooks/usePressKits';
import { Share, Link, Mail, Download, Eye, Copy, Calendar, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PressKitShareProps {
  pressKit: PressKit;
}

export const PressKitShare = ({ pressKit }: PressKitShareProps) => {
  const { sharePressKit } = usePressKits();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [shareForm, setShareForm] = useState({
    recipient_email: '',
    recipient_name: '',
    expires_at: '',
  });

  // Mock data for shares - in real implementation, you'd fetch this
  const existingShares = [
    {
      id: '1',
      recipient_email: 'editor@musicmagazine.com',
      recipient_name: 'Music Magazine Editor',
      created_at: '2024-01-15T10:00:00Z',
      view_count: 3,
      downloaded_at: '2024-01-16T14:30:00Z',
    },
    {
      id: '2',
      recipient_email: 'blogger@example.com',
      recipient_name: 'Music Blogger',
      created_at: '2024-01-14T15:00:00Z',
      view_count: 1,
      downloaded_at: null,
    },
  ];

  const publicUrl = `${window.location.origin}/press-kit/${pressKit.id}`;

  const handleShare = async () => {
    if (!shareForm.recipient_email.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipient email",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      await sharePressKit(pressKit.id, shareForm);
      setShareForm({ recipient_email: '', recipient_name: '', expires_at: '' });
      toast({
        title: "Success",
        description: "Press kit shared successfully",
      });
    } catch (error) {
      console.error('Error sharing press kit:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const generateDownloadLink = () => {
    // In a real implementation, this would generate a ZIP file with all press kit materials
    return `${window.location.origin}/api/press-kit/${pressKit.id}/download`;
  };

  return (
    <div className="space-y-6">
      {/* Public Access */}
      {pressKit.is_public && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Public Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Public URL</Label>
              <div className="flex gap-2 mt-1">
                <Input value={publicUrl} readOnly className="font-mono text-sm" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(publicUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(publicUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Anyone with this link can view the press kit
              </p>
            </div>

            <div>
              <Label>Download Link</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={generateDownloadLink()} 
                  readOnly 
                  className="font-mono text-sm" 
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(generateDownloadLink())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Direct download link for all press kit materials
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share with Specific Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Share with Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipient_email">Email Address</Label>
              <Input
                id="recipient_email"
                type="email"
                value={shareForm.recipient_email}
                onChange={(e) => setShareForm({ ...shareForm, recipient_email: e.target.value })}
                placeholder="editor@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="recipient_name">Name (Optional)</Label>
              <Input
                id="recipient_name"
                value={shareForm.recipient_name}
                onChange={(e) => setShareForm({ ...shareForm, recipient_name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
            <Input
              id="expires_at"
              type="datetime-local"
              value={shareForm.expires_at}
              onChange={(e) => setShareForm({ ...shareForm, expires_at: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for no expiration
            </p>
          </div>

          <Button onClick={handleShare} disabled={isSharing} className="w-full">
            <Share className="h-4 w-4 mr-2" />
            {isSharing ? 'Sharing...' : 'Share Press Kit'}
          </Button>
        </CardContent>
      </Card>

      {/* Share History */}
      <Card>
        <CardHeader>
          <CardTitle>Share History</CardTitle>
        </CardHeader>
        <CardContent>
          {existingShares.length === 0 ? (
            <div className="text-center py-8">
              <Share className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shares yet</h3>
              <p className="text-muted-foreground">
                Share this press kit to start tracking engagement
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {existingShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{share.recipient_name || share.recipient_email}</span>
                      {share.downloaded_at && (
                        <Badge variant="secondary">
                          <Download className="h-3 w-3 mr-1" />
                          Downloaded
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div>{share.recipient_email}</div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Shared {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {share.view_count} views
                        </span>
                        {share.downloaded_at && (
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            Downloaded {formatDistanceToNow(new Date(share.downloaded_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {existingShares.reduce((sum, share) => sum + share.view_count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Views</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {existingShares.filter(share => share.downloaded_at).length}
              </div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{existingShares.length}</div>
              <div className="text-sm text-muted-foreground">Total Shares</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round((existingShares.filter(share => share.downloaded_at).length / Math.max(existingShares.length, 1)) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Download Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};