import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

import { 
  BookOpen, 
  Search, 
  Download, 
  Upload, 
  MessageCircle, 
  Calendar,
  Music,
  FileText,
  Users,
  Clock
} from "lucide-react";

const LibrarianServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState("music-library");
  const [searchQuery, setSearchQuery] = useState("");
  const [requestForm, setRequestForm] = useState({
    title: "",
    composer: "",
    notes: ""
  });

  // Check if user is authenticated and is a member
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Only allow access to authenticated members
  if (!profile || !['member', 'alumna', 'admin', 'super-admin'].includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  const handleMusicRequest = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement music request submission
    console.log("Music request submitted:", requestForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Librarian Services</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access music library, request scores, and manage your musical resources
          </p>
          <Badge variant="secondary" className="text-sm">
            Member Access Only
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Music className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">450+</div>
              <div className="text-sm text-muted-foreground">Available Scores</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Download className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">23</div>
              <div className="text-sm text-muted-foreground">Your Downloads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-muted-foreground">Pending Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">85</div>
              <div className="text-sm text-muted-foreground">Active Members</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="music-library">Music Library</TabsTrigger>
            <TabsTrigger value="request-music">Request Music</TabsTrigger>
            <TabsTrigger value="my-downloads">My Downloads</TabsTrigger>
            <TabsTrigger value="contact-librarian">Contact Librarian</TabsTrigger>
          </TabsList>

          <TabsContent value="music-library" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Music Library Search
                </CardTitle>
                <CardDescription>
                  Search and browse our collection of choral music
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Search by title, composer, or genre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                
                {/* Sample music list */}
                <div className="space-y-3">
                  {[
                    { title: "Ave Maria", composer: "Franz Schubert", genre: "Sacred", available: true },
                    { title: "Swing Low, Sweet Chariot", composer: "Traditional Spiritual", genre: "Spiritual", available: true },
                    { title: "The Water is Wide", composer: "Traditional", genre: "Folk", available: false },
                  ].map((piece, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{piece.title}</h4>
                        <p className="text-sm text-muted-foreground">{piece.composer} • {piece.genre}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={piece.available ? "default" : "secondary"}>
                          {piece.available ? "Available" : "Checked Out"}
                        </Badge>
                        {piece.available && (
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="request-music" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Request New Music
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for? Request new music to be added to our library
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMusicRequest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Song Title</Label>
                      <Input
                        id="title"
                        value={requestForm.title}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter song title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="composer">Composer/Arranger</Label>
                      <Input
                        id="composer"
                        value={requestForm.composer}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, composer: e.target.value }))}
                        placeholder="Enter composer name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={requestForm.notes}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional information about the piece..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-downloads" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  My Downloads
                </CardTitle>
                <CardDescription>
                  View and re-download your music files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: "Ave Maria", composer: "Franz Schubert", downloadDate: "2024-01-15", format: "PDF" },
                    { title: "Swing Low, Sweet Chariot", composer: "Traditional", downloadDate: "2024-01-10", format: "PDF" },
                    { title: "Amazing Grace", composer: "John Newton", downloadDate: "2024-01-08", format: "PDF" },
                  ].map((download, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{download.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {download.composer} • Downloaded {download.downloadDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{download.format}</Badge>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Re-download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact-librarian" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Contact Librarian
                </CardTitle>
                <CardDescription>
                  Get in touch with our librarian for assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Librarian Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Current Librarian</h4>
                    <div className="space-y-2">
                      <p className="font-medium">Sarah Johnson</p>
                      <p className="text-sm text-muted-foreground">librarian@spelman.edu</p>
                      <p className="text-sm text-muted-foreground">Office Hours: Mon-Fri 2-5 PM</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Office Hours Visit
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Direct Message
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Music for Review
                      </Button>
                    </div>
                  </div>
                </div>

                {/* FAQ Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Frequently Asked Questions</h4>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h5 className="font-medium mb-2">How long does it take to process music requests?</h5>
                      <p className="text-sm text-muted-foreground">
                        Most music requests are processed within 3-5 business days. Rush requests can be accommodated with advance notice.
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h5 className="font-medium mb-2">Can I suggest music for upcoming concerts?</h5>
                      <p className="text-sm text-muted-foreground">
                        Yes! Use the "Request New Music" tab to suggest pieces. Include performance dates and any specific arrangements needed.
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h5 className="font-medium mb-2">What file formats are available?</h5>
                      <p className="text-sm text-muted-foreground">
                        Most scores are available in PDF format. Some pieces may also have MIDI files or audio recordings available.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LibrarianServices;