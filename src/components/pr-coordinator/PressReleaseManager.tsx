import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Send, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Building,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PressRelease {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  createdAt: string;
  publishedAt?: string;
  author: string;
  category: string;
  contacts: MediaContact[];
}

interface MediaContact {
  id: string;
  name: string;
  email: string;
  organization: string;
  type: 'newspaper' | 'magazine' | 'radio' | 'tv' | 'online' | 'blogger';
  beat: string; // music, arts, education, etc.
  notes?: string;
}

const mockPressReleases: PressRelease[] = [
  {
    id: '1',
    title: 'Spelman College Glee Club Announces Spring Concert Series',
    content: 'The renowned Spelman College Glee Club...',
    status: 'published',
    createdAt: '2024-03-15T10:00:00Z',
    publishedAt: '2024-03-16T09:00:00Z',
    author: 'PR Coordinator',
    category: 'Concert Announcement',
    contacts: []
  },
  {
    id: '2',
    title: 'Glee Club Wins Regional Competition',
    content: 'In a stunning performance...',
    status: 'draft',
    createdAt: '2024-03-18T14:30:00Z',
    author: 'PR Coordinator',
    category: 'Achievement',
    contacts: []
  }
];

const mockMediaContacts: MediaContact[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@atlantajournal.com',
    organization: 'Atlanta Journal-Constitution',
    type: 'newspaper',
    beat: 'Arts & Culture',
    notes: 'Covers HBCU events regularly'
  },
  {
    id: '2',
    name: 'Mike Chen',
    email: 'mchen@11alive.com',
    organization: '11Alive News',
    type: 'tv',
    beat: 'Community Events',
    notes: 'Interested in educational stories'
  }
];

const pressReleaseTemplate = `FOR IMMEDIATE RELEASE

Contact:
[CONTACT_NAME]
[CONTACT_TITLE]
Spelman College Glee Club
Phone: [PHONE_NUMBER]
Email: [EMAIL_ADDRESS]

[HEADLINE]

ATLANTA, GA – [DATE] – [OPENING_PARAGRAPH]

[BODY_PARAGRAPHS]

About Spelman College Glee Club:
The Spelman College Glee Club, founded in [YEAR], is a premier collegiate choral ensemble known for its exceptional artistry and commitment to musical excellence. Under the direction of [DIRECTOR_NAME], the Glee Club continues to uphold the tradition of musical excellence established at Spelman College.

For more information about the Spelman College Glee Club, visit [WEBSITE] or contact [CONTACT_INFO].

###`;

export const PressReleaseManager = () => {
  const [pressReleases, setPressReleases] = useState<PressRelease[]>(mockPressReleases);
  const [mediaContacts, setMediaContacts] = useState<MediaContact[]>(mockMediaContacts);
  const [selectedRelease, setSelectedRelease] = useState<PressRelease | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newRelease, setNewRelease] = useState({
    title: '',
    content: pressReleaseTemplate,
    category: '',
    selectedContacts: [] as string[]
  });
  const { toast } = useToast();

  const handleCreateRelease = () => {
    if (!newRelease.title.trim() || !newRelease.category) {
      toast({
        title: "Error",
        description: "Please fill in title and category",
        variant: "destructive"
      });
      return;
    }

    const release: PressRelease = {
      id: Math.random().toString(36).substr(2, 9),
      title: newRelease.title,
      content: newRelease.content,
      status: 'draft',
      createdAt: new Date().toISOString(),
      author: 'Current User',
      category: newRelease.category,
      contacts: mediaContacts.filter(contact => newRelease.selectedContacts.includes(contact.id))
    };

    setPressReleases(prev => [release, ...prev]);
    setNewRelease({
      title: '',
      content: pressReleaseTemplate,
      category: '',
      selectedContacts: []
    });

    toast({
      title: "Success",
      description: "Press release created successfully",
    });
  };

  const handlePublishRelease = (releaseId: string) => {
    setPressReleases(prev => prev.map(release => 
      release.id === releaseId 
        ? { ...release, status: 'published', publishedAt: new Date().toISOString() }
        : release
    ));

    toast({
      title: "Published",
      description: "Press release has been published and sent to media contacts",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'approved': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' at ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Press Release Manager</h2>
        <p className="text-muted-foreground">Create, manage, and distribute press releases to media contacts</p>
      </div>

      <Tabs defaultValue="releases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="releases">Press Releases</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="contacts">Media Contacts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="releases" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">All Press Releases</h3>
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Release
            </Button>
          </div>

          <div className="space-y-4">
            {pressReleases.map((release) => (
              <Card key={release.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{release.title}</h4>
                        <Badge className={`${getStatusColor(release.status)} text-white`}>
                          {release.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {release.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created {formatDate(release.createdAt)}
                        </span>
                        {release.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Send className="h-4 w-4" />
                            Published {formatDate(release.publishedAt)}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline">{release.category}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      {release.status === 'approved' && (
                        <Button 
                          size="sm" 
                          onClick={() => handlePublishRelease(release.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Press Release</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Press release headline"
                    value={newRelease.title}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => setNewRelease(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concert">Concert Announcement</SelectItem>
                      <SelectItem value="achievement">Achievement</SelectItem>
                      <SelectItem value="tour">Tour Information</SelectItem>
                      <SelectItem value="personnel">Personnel News</SelectItem>
                      <SelectItem value="community">Community Engagement</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  className="min-h-[300px] font-mono text-sm"
                  value={newRelease.content}
                  onChange={(e) => setNewRelease(prev => ({ ...prev, content: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use placeholders like [CONTACT_NAME], [DATE], [EVENT_NAME] for easy customization
                </p>
              </div>

              <div>
                <Label>Media Contacts to Notify</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                  {mediaContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={contact.id}
                        checked={newRelease.selectedContacts.includes(contact.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNewRelease(prev => ({
                            ...prev,
                            selectedContacts: checked
                              ? [...prev.selectedContacts, contact.id]
                              : prev.selectedContacts.filter(id => id !== contact.id)
                          }));
                        }}
                        className="rounded"
                      />
                      <label htmlFor={contact.id} className="text-sm">
                        {contact.name} - {contact.organization}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateRelease}>
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Media Contacts</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaContacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{contact.name}</h4>
                      <Badge variant="outline">{contact.type}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {contact.organization}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </div>
                      <div>Beat: {contact.beat}</div>
                      {contact.notes && (
                        <div className="text-xs bg-muted p-2 rounded">
                          {contact.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Press Release Templates</CardTitle>
              <p className="text-muted-foreground">
                Pre-formatted templates for different types of announcements
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Concert Announcement Template</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Standard format for announcing upcoming performances
                  </p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Achievement/Award Template</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    For announcing awards, honors, and achievements
                  </p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Tour Announcement Template</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    For multi-city tour and travel announcements
                  </p>
                  <Button variant="outline" size="sm">Use Template</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};