import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Mail, MessageSquare, Search, Send, Filter } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useMus240Enrollments } from "@/hooks/useMus240Enrollments";
import { useSendSMSNotification } from "@/hooks/useSMSIntegration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function MUS240Instructor() {
  const { enrollments, loading } = useMus240Enrollments();
  const sendSMS = useSendSMSNotification();
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const activeStudents = enrollments.filter(e => e.enrollment_status === 'enrolled');

  const filteredStudents = activeStudents.filter(student => {
    const matchesSearch = searchTerm === "" || 
      (student.gw_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       student.gw_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && student.enrollment_status === filterStatus;
  });

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.student_id));
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim() || selectedStudents.length === 0) {
      toast.error("Please fill in all fields and select at least one student");
      return;
    }

    try {
      const selectedEmails = filteredStudents
        .filter(s => selectedStudents.includes(s.student_id))
        .map(s => s.gw_profiles?.email)
        .filter(Boolean);

      // Send emails using Supabase edge function
      const { error } = await supabase.functions.invoke('gw-send-email', {
        body: {
          to: selectedEmails,
          subject: `[MUS240] ${emailSubject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">MUS240: History of African American Music</h2>
              <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                ${emailContent.replace(/\n/g, '<br>')}
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                This message was sent from the MUS240 course management system.
              </p>
            </div>
          `,
          text: emailContent
        }
      });

      if (error) throw error;

      toast.success(`Email sent to ${selectedEmails.length} students`);
      setEmailSubject("");
      setEmailContent("");
      setSelectedStudents([]);
    } catch (error) {
      console.error('Email send error:', error);
      toast.error("Failed to send emails");
    }
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim() || selectedStudents.length === 0) {
      toast.error("Please enter a message and select at least one student");
      return;
    }

    try {
      const selectedPhones = filteredStudents
        .filter(s => selectedStudents.includes(s.student_id))
        .map(s => s.gw_profiles?.phone)
        .filter(Boolean);

      if (selectedPhones.length === 0) {
        toast.error("No phone numbers available for selected students");
        return;
      }

      await sendSMS.mutateAsync({
        groupId: "mus240-class",
        message: `[MUS240] ${smsMessage}`,
        senderName: "MUS240 Instructor",
        phoneNumbers: selectedPhones
      });

      setSmsMessage("");
      setSelectedStudents([]);
    } catch (error) {
      console.error('SMS send error:', error);
      toast.error("Failed to send SMS messages");
    }
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading students...</p>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MUS240 - Enrolled Students</h1>
            <p className="text-muted-foreground">
              Manage and communicate with your {activeStudents.length} enrolled students
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Users className="h-4 w-4 mr-1" />
            {activeStudents.length} Students
          </Badge>
        </div>

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="students">Students List</TabsTrigger>
            <TabsTrigger value="email">Send Email</TabsTrigger>
            <TabsTrigger value="sms">Send SMS</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Enrolled Students
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedStudents.length === filteredStudents.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <Checkbox
                        checked={selectedStudents.includes(student.student_id)}
                        onCheckedChange={() => handleStudentSelect(student.student_id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {student.gw_profiles?.full_name || 'Name not provided'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {student.gw_profiles?.email}
                        </p>
                        {student.gw_profiles?.phone && (
                          <p className="text-sm text-muted-foreground">
                            📱 {student.gw_profiles.phone}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {student.enrollment_status}
                      </Badge>
                    </div>
                  ))}
                </div>
                {filteredStudents.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No students found matching your search.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Email to Students
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedStudents.length} students selected
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Email subject..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Enter your email message..."
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button 
                  onClick={handleSendEmail}
                  disabled={!emailSubject.trim() || !emailContent.trim() || selectedStudents.length === 0}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email to {selectedStudents.length} Students
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Send SMS to Students
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedStudents.length} students selected
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">SMS Message</label>
                  <Textarea
                    placeholder="Enter your SMS message... (160 character limit recommended)"
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    rows={4}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {smsMessage.length}/160 characters
                  </p>
                </div>
                <Button 
                  onClick={handleSendSMS}
                  disabled={!smsMessage.trim() || selectedStudents.length === 0}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send SMS to {selectedStudents.length} Students
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
}