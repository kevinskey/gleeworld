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
import { PageHeader } from "@/components/shared/PageHeader";

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
        <PageHeader
          title="Librarian Services"
          description="Access music library, request scores, and manage your musical resources"
          backTo="/executive-services"
        />


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
                
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Use the search above to find music in our library</p>
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
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No downloads available</p>
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
                      <p className="text-sm text-muted-foreground">Contact information available upon request</p>
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