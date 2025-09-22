import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Code, 
  Play, 
  Save, 
  Share, 
  ExternalLink, 
  FileText, 
  Lightbulb,
  Users,
  Zap
} from 'lucide-react';

interface SandboxEnvironmentProps {
  groupId?: string;
  onSave?: (sandboxData: any) => void;
}

export const SandboxEnvironment = ({ groupId, onSave }: SandboxEnvironmentProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(`// Welcome to your MUS 240 Project Sandbox!
// Use this space to experiment with ideas, plan your research, 
// or collaborate on code for your final projects.

console.log("Hello, MUS 240 researchers!");

// Example: Music data analysis
const musicGenres = [
  { name: "Blues", period: "1860s-1890s", characteristics: ["12-bar structure", "blue notes"] },
  { name: "Jazz", period: "1890s-1920s", characteristics: ["improvisation", "swing rhythm"] },
  { name: "Hip-Hop", period: "1970s-present", characteristics: ["sampling", "rap vocals"] }
];

// Your research ideas here...
`);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const predefinedSandboxes = [
    {
      title: "Research Timeline Builder",
      description: "Interactive timeline for music history research",
      url: "https://codepen.io/pen/",
      category: "Research Tools"
    },
    {
      title: "Data Visualization Starter",
      description: "Charts and graphs for music analysis",
      url: "https://observablehq.com/@d3/gallery",
      category: "Data Viz"
    },
    {
      title: "Audio Analysis Playground",
      description: "Web Audio API experiments",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API",
      category: "Audio Tech"
    },
    {
      title: "Collaborative Notes Template",
      description: "Structured template for group research notes",
      url: "https://github.com/",
      category: "Collaboration"
    }
  ];

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput('');

    try {
      // Simple code execution simulation
      const originalLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        logs.push(args.join(' '));
      };

      // Execute the code in a safe way
      const func = new Function(code);
      func();

      console.log = originalLog;
      setOutput(logs.join('\n') || 'Code executed successfully!');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveSandbox = () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your sandbox');
      return;
    }

    const sandboxData = {
      title: title.trim(),
      description: description.trim(),
      code,
      created_at: new Date().toISOString()
    };

    onSave?.(sandboxData);
    toast.success('Sandbox saved successfully!');
  };

  const handleShareSandbox = () => {
    // Create a shareable link (in a real implementation, this would create a unique URL)
    const encodedCode = encodeURIComponent(code);
    const shareUrl = `${window.location.origin}/sandbox?code=${encodedCode}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Sandbox link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Code className="h-8 w-8 text-blue-600" />
          MUS 240 Research Sandbox
        </h2>
        <p className="text-gray-600">
          Experiment, collaborate, and build tools for your African American music research projects
        </p>
      </div>

      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Quick Start Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predefinedSandboxes.map((sandbox, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{sandbox.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {sandbox.category}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm mb-3">{sandbox.description}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(sandbox.url, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Sandbox Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-purple-600" />
            Custom Code Sandbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sandbox Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sandbox-title">Title</Label>
              <Input 
                id="sandbox-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Research Tool"
              />
            </div>
            <div>
              <Label htmlFor="sandbox-description">Description</Label>
              <Input 
                id="sandbox-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this sandbox do?"
              />
            </div>
          </div>

          {/* Code Editor */}
          <div>
            <Label htmlFor="code-editor">Code Editor</Label>
            <Textarea
              id="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your JavaScript code here..."
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRunCode} disabled={isRunning}>
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Code'}
            </Button>
            <Button variant="outline" onClick={handleSaveSandbox}>
              <Save className="h-4 w-4 mr-2" />
              Save Sandbox
            </Button>
            <Button variant="outline" onClick={handleShareSandbox}>
              <Share className="h-4 w-4 mr-2" />
              Share Link
            </Button>
          </div>

          {/* Output */}
          {output && (
            <div>
              <Label>Output</Label>
              <div className="bg-gray-100 border rounded-lg p-3 font-mono text-sm">
                <pre className="whitespace-pre-wrap">{output}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collaboration Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Collaboration Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Shared Notes</h3>
              <p className="text-sm text-gray-600">
                Collaborate on research notes with your group members
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Live Collaboration</h3>
              <p className="text-sm text-gray-600">
                Work together in real-time on code and projects
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Share className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Easy Sharing</h3>
              <p className="text-sm text-gray-600">
                Share your work with instructors and classmates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Tips for Using the Sandbox</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Use this space to prototype data visualization tools for your research</li>
            <li>• Experiment with audio analysis techniques using Web Audio API</li>
            <li>• Create interactive timelines for historical music periods</li>
            <li>• Build tools to help analyze musical structures and characteristics</li>
            <li>• Collaborate with group members on technical aspects of your projects</li>
            <li>• Save your work frequently and share links with your team</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};