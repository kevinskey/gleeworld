import React, { useState } from 'react';
import { ArrowLeft, Upload, ExternalLink, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OSMDViewer } from '@/components/OSMDViewer';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const SightReadingPreview = () => {
  const [xmlUrl, setXmlUrl] = useState('https://opensheetmusicdisplay.org/demo/Beethoven_AnDieFerneGeliebte.musicxml');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedXmlContent, setUploadedXmlContent] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    console.log('URL changed to:', newUrl);
    setXmlUrl(newUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/xml' || file.name.endsWith('.xml') || file.name.endsWith('.musicxml')) {
        setUploadedFile(file);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setUploadedXmlContent(content);
          toast({
            title: "File Uploaded",
            description: `Successfully loaded ${file.name}`
          });
        };
        reader.readAsText(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a .xml or .musicxml file",
          variant: "destructive"
        });
      }
    }
  };

  const predefinedSamples = [
    {
      name: "Simple Scale Exercise",
      url: "https://www.musicxml.com/music-in-musicxml/example-set/BeetAnGelVoice.xml",
      description: "Basic C major scale exercise"
    },
    {
      name: "Chorale Exercise",
      url: "https://www.musicxml.com/music-in-musicxml/example-set/ActorPreludeSample.xml", 
      description: "Four-part harmony practice"
    }
  ];

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bebas tracking-wide">
              Sight Reading Preview
            </h1>
            <p className="text-muted-foreground">
              Preview and analyze MusicXML sheet music with professional notation rendering.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      MusicXML URL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="xml-url">Enter MusicXML URL</Label>
                      <Input
                        id="xml-url"
                        type="url"
                        value={xmlUrl}
                        onChange={handleUrlChange}
                        placeholder="https://example.com/music.musicxml"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Sample Files</Label>
                      {predefinedSamples.map((sample, index) => (
                        <div key={index} className="space-y-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => {
                            console.log('Setting URL to:', sample.url);
                            setXmlUrl(sample.url);
                          }}
                        >
                            <Music className="h-3 w-3 mr-2" />
                            {sample.name}
                          </Button>
                          <p className="text-xs text-muted-foreground pl-5">
                            {sample.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload File
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Select MusicXML File</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".xml,.musicxml"
                        onChange={handleFileUpload}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                    
                    {uploadedFile && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{uploadedFile.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>🔗 Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/sight-reading-submission')}
                >
                  <Music className="h-4 w-4 mr-2" />
                  Connect to Sight Reading Practice
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use this notation as reference for student performance analysis
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Music Display */}
          <div className="lg:col-span-2">
            <OSMDViewer
              xmlUrl={uploadedXmlContent ? undefined : xmlUrl}
              xmlContent={uploadedXmlContent || undefined}
              title={uploadedFile ? uploadedFile.name : "Music Preview"}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default SightReadingPreview;