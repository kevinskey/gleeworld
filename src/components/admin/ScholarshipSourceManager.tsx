import { useState } from 'react';
import { useScholarshipSources } from '@/hooks/useScholarshipSources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Globe, Clock, Trash2, Play, Edit3, Upload, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export const ScholarshipSourceManager = () => {
  const { sources, loading, createSource, updateSource, deleteSource, triggerScrape } = useScholarshipSources();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    scrape_frequency_hours: 24,
  });
  
  // Bulk add state
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState<Array<{url: string, success: boolean, name?: string, error?: string}>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSource) {
        await updateSource(editingSource, formData);
        setEditingSource(null);
      } else {
        await createSource(formData);
        setShowAddForm(false);
      }
      
      setFormData({
        name: '',
        url: '',
        description: '',
        scrape_frequency_hours: 24,
      });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEdit = (source: any) => {
    setFormData({
      name: source.name,
      url: source.url,
      description: source.description || '',
      scrape_frequency_hours: source.scrape_frequency_hours,
    });
    setEditingSource(source.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingSource(null);
    setFormData({
      name: '',
      url: '',
      description: '',
      scrape_frequency_hours: 24,
    });
  };

  // Bulk add functionality
  const extractNameFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } catch {
      return 'Unknown Source';
    }
  };

  const handleBulkAdd = async () => {
    const urls = bulkUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .filter(url => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

    if (urls.length === 0) return;

    setBulkProcessing(true);
    setBulkProgress(0);
    setBulkResults([]);

    const results: Array<{url: string, success: boolean, name?: string, error?: string}> = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const name = extractNameFromUrl(url);
      
      try {
        await createSource({
          name,
          url,
          description: `Auto-added from bulk import`,
          scrape_frequency_hours: 24,
        });
        
        results.push({ url, success: true, name });
      } catch (error: any) {
        results.push({ 
          url, 
          success: false, 
          name, 
          error: error.message || 'Failed to add source' 
        });
      }
      
      setBulkProgress((i + 1) / urls.length * 100);
      setBulkResults([...results]);
    }

    setBulkProcessing(false);
  };

  const handleBulkCancel = () => {
    setShowBulkAdd(false);
    setBulkUrls('');
    setBulkResults([]);
    setBulkProgress(0);
  };

  const toggleSourceActive = async (sourceId: string, isActive: boolean) => {
    await updateSource(sourceId, { is_active: !isActive });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading scholarship sources...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Scholarship Sources Management
          </CardTitle>
          <CardDescription>
            Manage foundation websites to scrape for scholarship opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
            <Button
              onClick={() => setShowBulkAdd(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Add URLs
            </Button>
            <Button
              onClick={triggerScrape}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Scrape All Sources
            </Button>
          </div>

          {showAddForm && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingSource ? 'Edit Source' : 'Add New Source'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Foundation Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Gates Foundation"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">Website URL</Label>
                      <Input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder="https://example.org/scholarships"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this source..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="frequency">Scrape Frequency (hours)</Label>
                    <Input
                      id="frequency"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.scrape_frequency_hours}
                      onChange={(e) => setFormData({ ...formData, scrape_frequency_hours: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingSource ? 'Update Source' : 'Add Source'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {showBulkAdd && (
            <Card className="border-2 border-dashed border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Add URLs
                </CardTitle>
                <CardDescription>
                  Add multiple scholarship source URLs at once. Paste one URL per line.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bulkUrls">Scholarship Source URLs</Label>
                  <Textarea
                    id="bulkUrls"
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder={`https://www.gatesfoundation.org/scholarships
https://www.collegeboard.org/pay-for-college/scholarship-search
https://www.fastweb.com/college-scholarships
https://www.scholarships.com/financial-aid/college-scholarships`}
                    rows={8}
                    disabled={bulkProcessing}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Source names will be automatically generated from URLs
                  </p>
                </div>

                {bulkProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing URLs...</span>
                      <span>{Math.round(bulkProgress)}%</span>
                    </div>
                    <Progress value={bulkProgress} className="w-full" />
                  </div>
                )}

                {bulkResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Results:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {bulkResults.map((result, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm p-2 rounded bg-muted">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div className="flex-1">
                            <span className="font-medium">{result.name}</span>
                            <div className="text-xs text-muted-foreground truncate">
                              {result.url}
                            </div>
                            {result.error && (
                              <div className="text-xs text-red-500">
                                {result.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleBulkAdd}
                    disabled={bulkProcessing || !bulkUrls.trim()}
                  >
                    {bulkProcessing ? 'Processing...' : 'Add All URLs'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleBulkCancel}
                    disabled={bulkProcessing}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Active Sources ({sources.filter(s => s.is_active).length})</h3>
            
            {sources.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-8">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Sources Added</h3>
                  <p className="text-muted-foreground mb-4">
                    Add foundation websites to start scraping scholarships automatically
                  </p>
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Source
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sources.map((source) => (
                  <Card key={source.id} className={source.is_active ? '' : 'opacity-60'}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{source.name}</h4>
                            <Badge variant={source.is_active ? 'default' : 'secondary'}>
                              {source.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {source.url}
                          </p>
                          
                          {source.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {source.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Every {source.scrape_frequency_hours}h
                            </span>
                            {source.last_scraped_at && (
                              <span>
                                Last scraped {formatDistanceToNow(new Date(source.last_scraped_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={source.is_active}
                            onCheckedChange={() => toggleSourceActive(source.id, source.is_active)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(source)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Source</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{source.name}"? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline">Cancel</Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => deleteSource(source.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};