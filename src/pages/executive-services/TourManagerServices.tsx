import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MapPin, 
  Bus, 
  Calendar, 
  Clock,
  Users,
  Luggage,
  Phone,
  MessageCircle,
  FileText,
  Route,
  Upload,
  ShieldCheck
} from "lucide-react";

const TourManagerServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState("upcoming-tours");
  const [idUpload, setIdUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile || !['member', 'alumna', 'admin', 'super-admin'].includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  const handleIdUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idUpload || !user) return;

    setUploading(true);
    try {
      // Generate unique file path
      const fileExt = idUpload.name.split('.').pop();
      const fileName = `${user.id}/id-document-${Date.now()}.${fileExt}`;

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(fileName, idUpload);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload ID document. Please try again.');
        return;
      }

      // Create submission record in database
      const { error: dbError } = await supabase
        .from('id_document_submissions')
        .insert({
          user_id: user.id,
          file_path: uploadData.path,
          original_filename: idUpload.name,
          file_size: idUpload.size,
          mime_type: idUpload.type,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Failed to record submission. Please try again.');
        return;
      }

      toast.success('ID document submitted successfully! It will be reviewed by the tour manager.');
      setIdUpload(null);
      
      // Reset file input
      const fileInput = document.getElementById('id-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Submission error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Bus className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Tour Manager Services</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Travel information, tour schedules, and logistics coordination
          </p>
          <Badge variant="secondary" className="text-sm">Member Access Only</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Route className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">3</div>
              <div className="text-sm text-muted-foreground">Upcoming Tours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">8</div>
              <div className="text-sm text-muted-foreground">Cities This Year</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">45</div>
              <div className="text-sm text-muted-foreground">Registered Members</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">72hrs</div>
              <div className="text-sm text-muted-foreground">Next Departure</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upcoming-tours">Upcoming Tours</TabsTrigger>
            <TabsTrigger value="travel-info">Travel Information</TabsTrigger>
            <TabsTrigger value="packing-lists">Packing Lists</TabsTrigger>
            <TabsTrigger value="contact-manager">Contact Manager</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming-tours" className="space-y-6">
            <div className="grid gap-6">
              {[
                { 
                  title: "Spring Concert Tour", 
                  dates: "March 15-18, 2024", 
                  cities: ["Atlanta", "Birmingham", "Nashville"], 
                  status: "confirmed" 
                },
                { 
                  title: "Alumni Homecoming", 
                  dates: "April 5-7, 2024", 
                  cities: ["Atlanta"], 
                  status: "planning" 
                },
              ].map((tour, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{tour.title}</CardTitle>
                        <CardDescription>{tour.dates}</CardDescription>
                      </div>
                      <Badge variant={tour.status === "confirmed" ? "default" : "secondary"}>
                        {tour.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tour.cities.join(" → ")}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm">View Itinerary</Button>
                        <Button size="sm" variant="outline">Transportation Details</Button>
                        <Button size="sm" variant="outline">Hotel Information</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="travel-info" className="space-y-6">
            {/* ID Document Submission */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Submit Your Real ID
                </CardTitle>
                <CardDescription>
                  Upload a copy of your government-issued ID for tour verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleIdUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="id-upload">Select ID Document</Label>
                    <Input
                      id="id-upload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setIdUpload(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Accepted formats: JPG, PNG, PDF (max 10MB)
                    </p>
                  </div>
                  
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h5 className="font-medium text-amber-800 mb-2">Privacy & Security Notice</h5>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• Your ID will be stored securely and only accessible to authorized staff</li>
                      <li>• Only the Tour Manager, Chief of Staff, and Administrators can view your ID</li>
                      <li>• This information is used solely for tour verification and safety purposes</li>
                      <li>• Your data is encrypted and will be deleted after the tour period</li>
                    </ul>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!idUpload || uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit ID Document
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="h-5 w-5" />
                    Transportation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Charter Bus Information</h4>
                    <p className="text-sm text-muted-foreground">Luxury Coach Lines - Bus #247</p>
                    <p className="text-sm text-muted-foreground">Departure: Spelman Campus - 6:00 AM</p>
                    <p className="text-sm text-muted-foreground">Driver: Michael Johnson - (555) 123-4567</p>
                  </div>
                  <Button className="w-full" variant="outline">
                    View Full Transportation Schedule
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Accommodations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Hampton Inn & Suites</h4>
                    <p className="text-sm text-muted-foreground">123 Music City Blvd, Nashville, TN</p>
                    <p className="text-sm text-muted-foreground">Check-in: March 15, 3:00 PM</p>
                    <p className="text-sm text-muted-foreground">Check-out: March 18, 11:00 AM</p>
                  </div>
                  <Button className="w-full" variant="outline">
                    View Hotel Details & Amenities
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="packing-lists" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Luggage className="h-5 w-5" />
                  Essential Packing Lists
                </CardTitle>
                <CardDescription>
                  Everything you need for a successful tour
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Performance Attire</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Black performance dress/suit
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Black dress shoes
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Glee Club pin/jewelry
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Hair accessories (if needed)
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Personal Items</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Valid ID/Passport
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Medications
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Phone charger
                      </li>
                      <li className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        Casual clothing
                      </li>
                    </ul>
                  </div>
                </div>
                <Button className="w-full">Download Complete Packing List</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact-manager" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Tour Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Current Tour Manager</h4>
                    <div className="space-y-2">
                      <p className="font-medium">Marcus Thompson</p>
                      <p className="text-sm text-muted-foreground">tourmanager@spelman.edu</p>
                      <p className="text-sm text-muted-foreground">Emergency: (555) 987-6543</p>
                      <p className="text-sm text-muted-foreground">Office Hours: Mon-Fri 1-4 PM</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Emergency Contacts</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Campus Security:</strong> (404) 270-5000</p>
                      <p className="text-sm"><strong>Bus Company:</strong> (555) 456-7890</p>
                      <p className="text-sm"><strong>Hotel Emergency:</strong> (615) 123-4567</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Direct Message
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Report Travel Issue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TourManagerServices;