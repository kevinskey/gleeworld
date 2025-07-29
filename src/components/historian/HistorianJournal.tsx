import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, 
  Plus, 
  Save, 
  Eye, 
  Send, 
  Edit, 
  Trash, 
  Calendar,
  Globe,
  Lock,
  Archive
} from "lucide-react";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  type: "internal" | "public";
  status: "draft" | "published" | "archived";
  tags: string[];
  lastModified: string;
}

export const HistorianJournal = () => {
  const [activeTab, setActiveTab] = useState("write");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Mock data
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: "1",
      title: "Fall Concert Reflection",
      content: "Tonight's Fall Concert was absolutely magical. The choir's harmony during 'Lift Every Voice and Sing' brought tears to my eyes...",
      date: "2024-11-20",
      type: "public",
      status: "draft",
      tags: ["Concert", "Fall", "Reflection"],
      lastModified: "2024-11-20T20:30:00Z"
    },
    {
      id: "2",
      title: "MLK Convocation Behind the Scenes",
      content: "This year's MLK Convocation was particularly special as we celebrated our centennial year. The preparation began weeks in advance...",
      date: "2024-01-15",
      type: "internal",
      status: "published",
      tags: ["MLK", "Centennial", "Service"],
      lastModified: "2024-01-16T09:15:00Z"
    },
    {
      id: "3",
      title: "Spring Tour Planning Notes",
      content: "Initial planning meeting for spring tour. Destinations under consideration include DC, NYC, and Philadelphia...",
      date: "2024-12-01",
      type: "internal",
      status: "draft",
      tags: ["Tour", "Planning", "Spring"],
      lastModified: "2024-12-01T14:22:00Z"
    }
  ]);

  const handleSaveDraft = () => {
    if (!title || !content) return;

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toISOString().split('T')[0],
      type: isPublic ? "public" : "internal",
      status: "draft",
      tags,
      lastModified: new Date().toISOString()
    };

    if (isEditing && selectedEntry) {
      setEntries(entries.map(entry => 
        entry.id === selectedEntry.id 
          ? { ...entry, title, content, type: isPublic ? "public" : "internal", tags, lastModified: new Date().toISOString() }
          : entry
      ));
      setIsEditing(false);
    } else {
      setEntries([newEntry, ...entries]);
    }

    // Reset form
    setTitle("");
    setContent("");
    setIsPublic(false);
    setTags([]);
    setSelectedEntry(null);
  };

  const handlePublish = () => {
    // Same as save but with published status
    handleSaveDraft();
    // In real implementation, this would submit for director approval
  };

  const editEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setIsPublic(entry.type === "public");
    setTags(entry.tags);
    setIsEditing(true);
    setActiveTab("write");
  };

  const deleteEntry = (entryId: string) => {
    setEntries(entries.filter(entry => entry.id !== entryId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft": return <Edit className="h-4 w-4" />;
      case "published": return <Globe className="h-4 w-4" />;
      case "archived": return <Archive className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "published": return "default";
      case "archived": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historian Journal & Blog Writer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="write">
                <Plus className="h-4 w-4 mr-2" />
                Write
              </TabsTrigger>
              <TabsTrigger value="drafts">
                <Edit className="h-4 w-4 mr-2" />
                Drafts ({entries.filter(e => e.status === "draft").length})
              </TabsTrigger>
              <TabsTrigger value="published">
                <Globe className="h-4 w-4 mr-2" />
                Published ({entries.filter(e => e.status === "published").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter journal entry title..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="public-toggle"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <Label htmlFor="public-toggle" className="flex items-center gap-2">
                    {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {isPublic ? "Public Blog Post" : "Internal Log Entry"}
                  </Label>
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your journal entry or blog post here..."
                    className="min-h-[300px]"
                  />
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => setTags(tags.filter(t => t !== tag))}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add tags (press Enter)"
                    className="mt-2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        setTags([...tags, e.currentTarget.value]);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveDraft} variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  {isPublic && (
                    <Button onClick={handlePublish}>
                      <Send className="h-4 w-4 mr-2" />
                      Submit for Approval
                    </Button>
                  )}
                  {isEditing && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedEntry(null);
                        setTitle("");
                        setContent("");
                        setTags([]);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-4">
              {entries.filter(entry => entry.status === "draft").map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{entry.title}</h3>
                          <Badge variant={getStatusColor(entry.status)} className="flex items-center gap-1">
                            {getStatusIcon(entry.status)}
                            Draft
                          </Badge>
                          <Badge variant="outline">
                            {entry.type === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {entry.content.substring(0, 150)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                          <span>Last modified: {new Date(entry.lastModified).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => editEntry(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="published" className="space-y-4">
              {entries.filter(entry => entry.status === "published").map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{entry.title}</h3>
                          <Badge variant={getStatusColor(entry.status)} className="flex items-center gap-1">
                            {getStatusIcon(entry.status)}
                            Published
                          </Badge>
                          <Badge variant="outline">
                            {entry.type === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {entry.content.substring(0, 150)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};