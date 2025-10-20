import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Video, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ChildrenGoAudition() {
  const [studentName, setStudentName] = useState("");
  const [email, setEmail] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a video smaller than 100MB",
          variant: "destructive",
        });
        return;
      }
      
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentName || !email || !videoFile) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${timestamp}-${randomStr}.${fileExt}`;

      // Upload video to storage
      const { error: uploadError } = await supabase.storage
        .from('children-go-auditions')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('children-go-auditions')
        .getPublicUrl(fileName);

      // Insert submission record
      const { error: dbError } = await supabase
        .from('children_go_auditions')
        .insert({
          student_name: studentName,
          email: email,
          video_url: publicUrl,
          video_path: fileName,
        });

      if (dbError) {
        throw dbError;
      }

      setSubmitted(true);
      toast({
        title: "Audition submitted!",
        description: "Thank you for your submission. We'll review it soon!",
      });

      // Reset form
      setTimeout(() => {
        setStudentName("");
        setEmail("");
        setVideoFile(null);
        setSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Error uploading audition:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your audition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <PublicLayout>
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url(/children-go-background.png)",
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50" />
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Children, Go Where I Send Thee
              </h1>
              <p className="text-xl text-white/90 mb-2">
                Spelman College Glee Club Rap Audition
              </p>
              <p className="text-white/80">
                Upload your audition video below
              </p>
            </div>

            <Card className="bg-white/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Submit Your Audition
                </CardTitle>
                <CardDescription>
                  Share your video performance for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Thank you!</h3>
                    <p className="text-muted-foreground">
                      Your audition has been submitted successfully.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="studentName">Student Name *</Label>
                      <Input
                        id="studentName"
                        type="text"
                        placeholder="Enter your full name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="video">Audition Video *</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                        <Input
                          id="video"
                          type="file"
                          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label 
                          htmlFor="video" 
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          {videoFile ? (
                            <>
                              <p className="font-medium">{videoFile.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                              <Button type="button" variant="outline" size="sm">
                                Change Video
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="font-medium">Click to upload video</p>
                              <p className="text-sm text-muted-foreground">
                                MP4, MOV, AVI, or WEBM (max 100MB)
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={uploading || !studentName || !email || !videoFile}
                    >
                      {uploading ? (
                        <>
                          <Upload className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Submit Audition
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <p className="text-white text-sm">
                Questions? Contact us at{" "}
                <a 
                  href="mailto:gleeclub@spelman.edu" 
                  className="underline hover:text-white/80"
                >
                  gleeclub@spelman.edu
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
