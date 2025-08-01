import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  description: string;
  totalEvents: number;
  completedEvents: number;
}

const mockTerms: Term[] = [
  {
    id: '1',
    name: 'Fall 2024',
    startDate: '2024-08-26',
    endDate: '2024-12-15',
    status: 'active',
    description: 'Fall semester with homecoming, holiday concerts, and community performances',
    totalEvents: 12,
    completedEvents: 8
  },
  {
    id: '2',
    name: 'Spring 2025',
    startDate: '2025-01-13',
    endDate: '2025-05-10',
    status: 'planning',
    description: 'Spring semester with spring tour, concerts, and graduation performances',
    totalEvents: 15,
    completedEvents: 0
  },
  {
    id: '3',
    name: 'Summer 2024',
    startDate: '2024-06-01',
    endDate: '2024-08-15',
    status: 'completed',
    description: 'Summer workshops, community outreach, and alumni events',
    totalEvents: 6,
    completedEvents: 6
  }
];

export const TermManager = () => {
  const [terms, setTerms] = useState<Term[]>(mockTerms);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);

  const getStatusColor = (status: Term['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Term['status']) => {
    switch (status) {
      case 'active':
        return <Clock className="h-3 w-3" />;
      case 'planning':
        return <BookOpen className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Term Management</h2>
          <p className="text-muted-foreground">Manage academic terms, schedules, and semester planning</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Term
        </Button>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {terms.map((term) => (
          <Card key={term.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{term.name}</CardTitle>
                <Badge className={`flex items-center gap-1 ${getStatusColor(term.status)}`}>
                  {getStatusIcon(term.status)}
                  {term.status.charAt(0).toUpperCase() + term.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(term.startDate)} - {formatDate(term.endDate)}</span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {term.description}
              </p>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Events Progress
                  </span>
                  <span className="font-medium">
                    {term.completedEvents}/{term.totalEvents}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${getProgressPercentage(term.completedEvents, term.totalEvents)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {getProgressPercentage(term.completedEvents, term.totalEvents)}% complete
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingTerm(term)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                >
                  <Calendar className="h-3 w-3" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{terms.filter(t => t.status === 'active').length}</div>
            <div className="text-sm text-muted-foreground">Active Terms</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{terms.filter(t => t.status === 'planning').length}</div>
            <div className="text-sm text-muted-foreground">Planning</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{terms.filter(t => t.status === 'completed').length}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {terms.reduce((sum, term) => sum + term.totalEvents, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Events</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};