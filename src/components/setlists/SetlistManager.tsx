import React, { useState } from 'react';
import { Plus, Music, Calendar, MapPin, Users, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSetlists } from '@/hooks/useSetlists';
import { CreateSetlistDialog } from './CreateSetlistDialog';
import { SetlistDetailsDialog } from './SetlistDetailsDialog';
import { format } from 'date-fns';

export const SetlistManager: React.FC = () => {
  const { setlists, loading, deleteSetlist } = useSetlists();
  const [selectedSetlist, setSelectedSetlist] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const handleViewDetails = (setlistId: string) => {
    setSelectedSetlist(setlistId);
    setShowDetailsDialog(true);
  };

  const handleDeleteSetlist = async (setlistId: string, setlistName: string) => {
    if (window.confirm(`Are you sure you want to delete "${setlistName}"? This action cannot be undone.`)) {
      await deleteSetlist(setlistId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading setlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Setlists</h2>
          <p className="text-gray-600">Organize your sheet music for performances</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Setlist
        </Button>
      </div>

      {setlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No setlists yet</h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Create your first setlist to organize sheet music for performances, rehearsals, or practice sessions.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Setlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {setlists.map((setlist) => (
            <Card key={setlist.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg line-clamp-1">{setlist.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewDetails(setlist.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSetlist(setlist.id, setlist.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {setlist.description && (
                  <CardDescription className="line-clamp-2">
                    {setlist.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    <span>{setlist.items?.length || 0} pieces</span>
                  </div>
                  {setlist.is_public && (
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewDetails(setlist.id)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Setlist Dialog */}
      <CreateSetlistDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Setlist Details Dialog */}
      {selectedSetlist && (
        <SetlistDetailsDialog
          isOpen={showDetailsDialog}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedSetlist(null);
          }}
          setlistId={selectedSetlist}
        />
      )}
    </div>
  );
};