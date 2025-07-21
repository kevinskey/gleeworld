import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Users, Calendar, Mail, Phone, MapPin, Heart, Music, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FormSubmission {
  id: string;
  form_type: string;
  full_name: string;
  email: string;
  phone_number?: string;
  message?: string;
  event_date?: string;
  event_location?: string;
  budget_range?: string;
  organization_name?: string;
  submission_data: any;
  status: string;
  created_at: string;
}

const FORM_TYPES = [
  { value: 'fan_interest', label: 'Fan Interest Form', icon: Heart },
  { value: 'booking_request', label: 'Concert Booking Request', icon: Music },
  { value: 'general_inquiry', label: 'General Inquiry', icon: Mail },
];

export const PublicFormsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadSubmissions();
  }, [selectedType, selectedStatus]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('gw_public_form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedType !== 'all') {
        query = query.eq('form_type', selectedType);
      }
      
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading form submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load form submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('gw_public_form_submissions')
        .update({ status })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Submission marked as ${status}`,
      });

      loadSubmissions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update submission status",
        variant: "destructive",
      });
    }
  };

  const sendResponse = async (submission: FormSubmission) => {
    try {
      let responseMessage = '';
      let subject = '';

      switch (submission.form_type) {
        case 'fan_interest':
          subject = 'Thank you for your interest in Spelman Glee Club!';
          responseMessage = `Dear ${submission.full_name},\n\nThank you for expressing interest in the Spelman College Glee Club! We're thrilled to have supporters like you.\n\nWe'll keep you updated on our upcoming performances and events. Follow us on our social media channels for the latest news and announcements.\n\nMusically yours,\nSpelman College Glee Club`;
          break;
        
        case 'booking_request':
          subject = 'Your Concert Booking Request - Spelman Glee Club';
          responseMessage = `Dear ${submission.full_name},\n\nThank you for your interest in booking the Spelman College Glee Club for your event.\n\nWe have received your request for ${submission.event_date ? `an event on ${new Date(submission.event_date).toLocaleDateString()}` : 'your upcoming event'}${submission.event_location ? ` at ${submission.event_location}` : ''}.\n\nOur booking coordinator will review your request and contact you within 2-3 business days to discuss availability, requirements, and next steps.\n\nBest regards,\nSpelman College Glee Club Booking Department`;
          break;
        
        default:
          subject = 'Thank you for contacting Spelman Glee Club';
          responseMessage = `Dear ${submission.full_name},\n\nThank you for reaching out to the Spelman College Glee Club. We have received your message and will respond as soon as possible.\n\nBest regards,\nSpelman College Glee Club`;
      }

      const { error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: submission.email,
          subject: subject,
          message: responseMessage,
          formSubmissionId: submission.id
        }
      });

      if (error) throw error;

      await updateSubmissionStatus(submission.id, 'responded');

      toast({
        title: "Response Sent",
        description: "Automatic response has been sent to the submitter",
      });

    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'responded':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    const formType = FORM_TYPES.find(t => t.value === type);
    const Icon = formType?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const exportSubmissions = () => {
    // Convert submissions to CSV format
    const headers = ['Date', 'Type', 'Name', 'Email', 'Phone', 'Organization', 'Event Date', 'Location', 'Status'];
    const csvData = submissions.map(sub => [
      new Date(sub.created_at).toLocaleDateString(),
      FORM_TYPES.find(t => t.value === sub.form_type)?.label || sub.form_type,
      sub.full_name,
      sub.email,
      sub.phone_number || '',
      sub.organization_name || '',
      sub.event_date ? new Date(sub.event_date).toLocaleDateString() : '',
      sub.event_location || '',
      sub.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Form submissions have been exported to CSV",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Public Forms Manager</h2>
          <p className="text-muted-foreground">
            Manage fan interest forms and concert booking requests
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSubmissions} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="type-filter">Form Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Form Types</SelectItem>
                  {FORM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadSubmissions} variant="outline" className="w-full">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FORM_TYPES.map((type) => {
          const count = submissions.filter(s => s.form_type === type.value).length;
          const Icon = type.icon;
          return (
            <Card key={type.value}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{type.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {submissions.filter(s => s.form_type === type.value && s.status === 'new').length} new submissions
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Form Submissions ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No form submissions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(submission.form_type)}
                        <h3 className="font-semibold">{submission.full_name}</h3>
                        <Badge className={getStatusColor(submission.status)}>
                          {submission.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {FORM_TYPES.find(t => t.value === submission.form_type)?.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{submission.email}</span>
                        </div>
                        {submission.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{submission.phone_number}</span>
                          </div>
                        )}
                        {submission.organization_name && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{submission.organization_name}</span>
                          </div>
                        )}
                        {submission.event_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{new Date(submission.event_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {submission.event_location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{submission.event_location}</span>
                          </div>
                        )}
                      </div>

                      {submission.message && (
                        <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                          {submission.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Select value={submission.status} onValueChange={(status) => updateSubmissionStatus(submission.id, status)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="responded">Responded</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {submission.status === 'new' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => sendResponse(submission)}
                        className="flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        Send Response
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};