import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Download, Users, Music, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCourseStudents, COURSE_IDS } from '@/hooks/useCourseStudents';

export const Mus070StudentRoster: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { students, loading, refetch } = useCourseStudents({
    courseId: COURSE_IDS.MUS_070,
    semester: 'Spring 2026',
  });

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (s.voice_part?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Group by voice part
  const voicePartGroups = filteredStudents.reduce((acc, student) => {
    const part = student.voice_part || 'Unassigned';
    if (!acc[part]) acc[part] = [];
    acc[part].push(student);
    return acc;
  }, {} as Record<string, typeof students>);

  const voicePartOrder = ['S1', 'S2', 'A1', 'A2', 'Unassigned'];
  const sortedVoiceParts = voicePartOrder.filter(part => voicePartGroups[part]?.length > 0);

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Voice Part', 'Enrolled At'];
    const rows = filteredStudents.map(s => [
      s.full_name,
      s.email || '',
      s.voice_part || 'Unassigned',
      s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mus070-roster-spring2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Roster exported successfully');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading roster...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">MUS 070 Detailed Roster - Spring 2026</CardTitle>
            <Badge variant="secondary">{students.length} students</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Voice Part Summary */}
        <div className="flex flex-wrap gap-2 mb-4">
          {sortedVoiceParts.map(part => (
            <Badge key={part} variant="outline" className="text-xs">
              <Music className="h-3 w-3 mr-1" />
              {part}: {voicePartGroups[part].length}
            </Badge>
          ))}
        </div>

        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Voice Part</TableHead>
                <TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, idx) => (
                  <TableRow key={student.user_id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                    <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{student.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={student.voice_part ? 'secondary' : 'outline'}>
                        {student.voice_part || 'Unassigned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
