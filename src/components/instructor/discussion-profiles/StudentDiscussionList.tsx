import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, Download, ArrowUpDown, AlertTriangle, 
  Users, Filter, ChevronRight, Clock, MessageSquare 
} from 'lucide-react';
import { useStudentDiscussionList, StudentDiscussionMetrics } from '@/hooks/useDiscussionAnalytics';
import { formatDistanceToNow } from 'date-fns';

interface StudentDiscussionListProps {
  courseId: string;
  onSelectStudent: (studentId: string) => void;
}

type SortField = 'full_name' | 'posts_submitted' | 'on_time_rate' | 'peer_responses' | 
  'originality_avg' | 'engagement_quality_avg' | 'flags_count';

export const StudentDiscussionList: React.FC<StudentDiscussionListProps> = ({
  courseId,
  onSelectStudent,
}) => {
  const { data: students, isLoading } = useStudentDiscussionList(courseId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const filteredStudents = useMemo(() => {
    if (!students) return [];

    let filtered = students.filter(s => 
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (showFlaggedOnly) {
      filtered = filtered.filter(s => s.flags_count > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [students, searchQuery, sortField, sortAsc, showFlaggedOnly]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const exportCSV = () => {
    if (!filteredStudents.length) return;

    const headers = [
      'Student Name', 'Posts', 'On-Time %', 'Peer Responses',
      'Originality', 'Engagement', 'Flags'
    ];
    const rows = filteredStudents.map(s => [
      s.full_name,
      s.posts_submitted,
      s.on_time_rate,
      s.peer_responses,
      s.originality_avg,
      s.engagement_quality_avg,
      s.flags_count,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discussion-analytics-${courseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ 
    field, 
    children 
  }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Discussion Profiles
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {students?.length || 0} enrolled students
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFlaggedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Flagged Only
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <SortHeader field="full_name">Student</SortHeader>
                <SortHeader field="posts_submitted">Posts</SortHeader>
                <SortHeader field="on_time_rate">On-Time</SortHeader>
                <SortHeader field="peer_responses">Responses</SortHeader>
                <SortHeader field="originality_avg">Originality</SortHeader>
                <SortHeader field="engagement_quality_avg">Quality</SortHeader>
                <SortHeader field="flags_count">Flags</SortHeader>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow 
                  key={student.student_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectStudent(student.student_id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.avatar_url || undefined} />
                        <AvatarFallback>
                          {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{student.full_name}</p>
                        {student.last_activity && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(student.last_activity), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {student.posts_submitted}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={student.on_time_rate >= 80 ? "default" : student.on_time_rate >= 50 ? "secondary" : "destructive"}
                      className="font-mono"
                    >
                      {student.on_time_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{student.peer_responses}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${student.originality_avg}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${student.engagement_quality_avg}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.flags_count > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {student.flags_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery || showFlaggedOnly 
                      ? 'No students match your filters' 
                      : 'No students enrolled yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
