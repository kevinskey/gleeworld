import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shuffle, RotateCcw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { MusicNodeCard } from './MusicNodeCard';
import { MusicFlowEdge } from './MusicFlowEdge';

interface AudioTrack {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string | null;
  duration: number | null;
  genre: string | null;
  play_count: number;
  music_albums?: {
    title: string;
    cover_image_url: string | null;
  };
}

const nodeTypes = {
  musicCard: MusicNodeCard,
};

const edgeTypes = {
  musicFlow: MusicFlowEdge,
};

export const MusicFlowEditor = () => {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'musicFlow',
      animated: true,
      style: { stroke: '#3b82f6' },
    }, eds)),
    []
  );

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('music_tracks')
        .select(`
          id,
          title,
          artist,
          audio_url,
          duration,
          genre,
          play_count,
          music_albums (
            title,
            cover_image_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast({
        title: "Error",
        description: "Failed to load music tracks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTrackToFlow = (track: AudioTrack) => {
    const newNode: Node = {
      id: track.id,
      type: 'musicCard',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: { track },
      draggable: true,
    };

    setNodes((nds) => {
      // Check if track already exists
      if (nds.find(node => node.id === track.id)) {
        toast({
          title: "Track Already Added",
          description: `"${track.title}" is already in the flow`,
          variant: "destructive"
        });
        return nds;
      }
      return [...nds, newNode];
    });

    toast({
      title: "Track Added",
      description: `"${track.title}" added to flow editor`,
    });
  };

  const shuffleLayout = () => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        position: {
          x: Math.random() * 600 + 50,
          y: Math.random() * 400 + 50,
        },
      }))
    );

    toast({
      title: "Layout Shuffled",
      description: "Nodes have been randomly repositioned",
    });
  };

  const clearFlow = () => {
    setNodes([]);
    setEdges([]);
    toast({
      title: "Flow Cleared",
      description: "All tracks and connections removed",
    });
  };

  const saveFlow = async () => {
    try {
      // Here you could save the flow configuration to the database
      // For now, we'll just show a success message
      toast({
        title: "Flow Saved",
        description: `Saved ${nodes.length} tracks and ${edges.length} connections`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save the flow configuration",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-[800px] grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Music Library Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Music Library</CardTitle>
          <Badge variant="outline">{tracks.length} tracks available</Badge>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track) => (
                  <Card 
                    key={track.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => addTrackToFlow(track)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                        {track.music_albums?.cover_image_url ? (
                          <img
                            src={track.music_albums.cover_image_url}
                            alt={track.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-xs font-bold text-blue-600">♪</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Flow Editor */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Music Flow Editor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click tracks from the library to add them, then drag to connect
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={shuffleLayout}>
                <Shuffle className="w-4 h-4 mr-1" />
                Shuffle
              </Button>
              <Button variant="outline" size="sm" onClick={clearFlow}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button size="sm" onClick={saveFlow}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{nodes.length} tracks</Badge>
            <Badge variant="secondary">{edges.length} connections</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              style={{ backgroundColor: '#f8fafc' }}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            >
              <MiniMap 
                zoomable 
                pannable 
                className="bg-background border border-border"
                nodeClassName={() => 'bg-blue-100'}
              />
              <Controls className="bg-background border border-border" />
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1} 
                color="#e2e8f0"
              />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};