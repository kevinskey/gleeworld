import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Users, Edit, Eye } from 'lucide-react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { JournalEditor } from '@/components/mus240/JournalEditor';
import { JournalReader } from '@/components/mus240/JournalReader';
import { mus240Assignments } from '@/data/mus240Assignments';
import { useMus240Journals } from '@/hooks/useMus240Journals';

const AssignmentJournal: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('write');
  const [userEntry, setUserEntry] = useState<any>(null);
  
  const { fetchUserEntry } = useMus240Journals();

  // Find the assignment from our data
  const assignment = mus240Assignments
    .flatMap(week => week.assignments)
    .find(a => a.id === assignmentId && a.type === 'listening-journal');

  useEffect(() => {
    if (assignment) {
      const loadUserEntry = async () => {
        const entry = await fetchUserEntry(assignment.id);
        setUserEntry(entry);
        
        // If user has published their journal, switch to read tab
        if (entry?.is_published) {
          setActiveTab('read');
        }
      };
      loadUserEntry();
    }
  }, [assignment, fetchUserEntry]);

  if (!assignment) {
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

  const handleJournalPublished = () => {
    setActiveTab('read');
    // Refresh user entry
    const loadUserEntry = async () => {
      const entry = await fetchUserEntry(assignment.id);
      setUserEntry(entry);
    };
    loadUserEntry();
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
                  {assignment.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{assignment.type}</Badge>
                  <Badge variant="secondary">{assignment.points} points</Badge>
                  <Badge variant={new Date(assignment.dueDate) < new Date() ? "destructive" : "default"}>
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
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
              assignment={assignment} 
              onPublished={handleJournalPublished}
            />
          </TabsContent>
          
          <TabsContent value="read" className="mt-6">
            {userEntry?.is_published ? (
              <JournalReader assignment={assignment} />
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