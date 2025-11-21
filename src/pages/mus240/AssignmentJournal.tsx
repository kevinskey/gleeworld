import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Users, Edit, Eye, Settings } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { JournalEditor } from '@/components/mus240/JournalEditor';
import { JournalReader } from '@/components/mus240/JournalReader';
import { AssignmentPromptEditor } from '@/components/mus240/AssignmentPromptEditor';
import { mus240Assignments, Assignment } from '@/data/mus240Assignments';
import { useMus240Journals } from '@/hooks/useMus240Journals';
import { useAssignmentEditor } from '@/hooks/useAssignmentEditor';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

const AssignmentJournal: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('write');
  const [userEntry, setUserEntry] = useState<any>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchUserEntry } = useMus240Journals();
  const { updateAssignment, getUpdatedAssignment } = useAssignmentEditor();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  // Find the assignment from our data and check for updates
  const baseAssignment = mus240Assignments
    .flatMap(week => week.assignments)
    .find(a => a.id === assignmentId && a.type === 'listening-journal');

  useEffect(() => {
    if (baseAssignment) {
      const updatedAssignment = getUpdatedAssignment(baseAssignment);
      setCurrentAssignment(updatedAssignment);
    }
  }, [baseAssignment, getUpdatedAssignment]);

  useEffect(() => {
    if (currentAssignment) {
      const loadUserEntry = async () => {
        try {
          const entry = await fetchUserEntry(currentAssignment.id);
          setUserEntry(entry);
          
          // If user has published their journal, switch to read tab
          if (entry?.is_published) {
            setActiveTab('read');
          }
          
          // Clear any previous errors on successful load
          setError(null);
        } catch (err) {
          console.error('Error loading user entry:', err);
          // Don't set error state - let the component render with empty entry
          // User can still write a new journal
          console.log('Will allow user to create new journal entry');
        }
      };
      loadUserEntry();
    }
  }, [currentAssignment, fetchUserEntry]);

  if (error) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4 text-destructive">Error</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => navigate('/classes/mus240/student/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  if (!baseAssignment) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Assignment Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The requested journal assignment could not be found.
              </p>
              <Button onClick={() => navigate('/classes/mus240/assignments')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assignments
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  if (!currentAssignment) {
    return (
      <UniversalLayout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <p>Loading assignment...</p>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  const handleJournalPublished = async () => {
    if (!currentAssignment) return;
    
    try {
      // Refresh user entry and wait for it to complete
      const entry = await fetchUserEntry(currentAssignment.id);
      
      if (entry) {
        setUserEntry(entry);
        
        // Only switch to read tab if successfully published
        if (entry.is_published) {
          setActiveTab('read');
        }
      } else {
        // If entry fetch fails, just switch to read tab anyway
        // The user published successfully, we just couldn't refresh the data
        setActiveTab('read');
      }
    } catch (error) {
      console.error('Error loading user entry after publish:', error);
      // Still switch to read tab even if refresh failed
      setActiveTab('read');
    }
  };

  const handleAssignmentUpdate = (updatedAssignment: Assignment) => {
    updateAssignment(updatedAssignment);
    setCurrentAssignment(updatedAssignment);
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/classes/mus240/assignments')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5" />
                  {currentAssignment.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{currentAssignment.type}</Badge>
                  <Badge variant="secondary">{currentAssignment.points} points</Badge>
                  <Badge variant={new Date(currentAssignment.dueDate + 'T12:00:00') < new Date() ? "destructive" : "default"}>
                    Due: {new Date(currentAssignment.dueDate + 'T12:00:00').toLocaleDateString()}
                  </Badge>
                </div>
              </div>
              {userEntry?.is_published && (
                <Badge variant="default" className="ml-auto">
                  <Eye className="h-3 w-3 mr-1" />
                  Published
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Admin Assignment Editor */}
        {isAdmin() && (
          <AssignmentPromptEditor
            assignment={currentAssignment}
            onAssignmentUpdate={handleAssignmentUpdate}
          />
        )}

        {/* Tabs for Write/Read */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Write Journal
            </TabsTrigger>
            <TabsTrigger value="read" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Read & Comment
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="write" className="mt-6">
            <JournalEditor 
              assignment={currentAssignment} 
              onPublished={handleJournalPublished}
            />
          </TabsContent>
          
          <TabsContent value="read" className="mt-6">
            {userEntry?.is_published ? (
              <JournalReader assignment={currentAssignment} />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Publish Your Journal First</h3>
                  <p className="text-muted-foreground mb-6">
                    You must publish your own journal entry before you can read and comment on others.
                  </p>
                  <Button onClick={() => setActiveTab('write')}>
                    <Edit className="h-4 w-4 mr-2" />
                    Write Your Journal
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};

export default AssignmentJournal;