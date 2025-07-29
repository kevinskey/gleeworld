import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Edit3,
  FileText,
  Calendar,
  Users,
  ClipboardList,
  MessageSquare,
  CheckSquare,
  Clock,
  Printer,
  Download
} from "lucide-react";

type MeetingStatus = 'draft' | 'approved' | 'archived';

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees: string[];
  agenda_items: string[];
  discussion_points: string;
  action_items: string[];
  next_meeting_date: string | null;
  status: MeetingStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface MeetingMinutesDocumentProps {
  minute: MeetingMinute;
  onBack: () => void;
  onEdit: () => void;
}

const getStatusColor = (status: MeetingStatus) => {
  switch (status) {
    case 'draft': return 'secondary';
    case 'approved': return 'default';
    case 'archived': return 'outline';
    default: return 'secondary';
  }
};

const getStatusStyles = (status: MeetingStatus) => {
  switch (status) {
    case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'approved': return 'bg-green-50 text-green-700 border-green-200';
    case 'archived': return 'bg-gray-50 text-gray-700 border-gray-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const MeetingMinutesDocument = ({ 
  minute, 
  onBack, 
  onEdit
}: MeetingMinutesDocumentProps) => {
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a downloadable version of the document
    const content = `
MEETING MINUTES
${minute.title}

Date: ${new Date(minute.meeting_date).toLocaleDateString()}
Type: ${minute.meeting_type}
Status: ${minute.status}

ATTENDEES:
${minute.attendees.join('\n')}

AGENDA ITEMS:
${minute.agenda_items.map((item, index) => `${index + 1}. ${item}`).join('\n')}

DISCUSSION POINTS:
${minute.discussion_points}

ACTION ITEMS:
${minute.action_items.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Next Meeting: ${minute.next_meeting_date ? new Date(minute.next_meeting_date).toLocaleDateString() : 'TBD'}

Created: ${new Date(minute.created_at).toLocaleString()}
Last Updated: ${new Date(minute.updated_at).toLocaleString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${minute.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_minutes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Document Header */}
      <div className="border-b bg-card/50 px-6 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Minutes
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">Meeting Minutes</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button onClick={onEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8 print:p-4">
          <div className="bg-white shadow-lg border rounded-lg print:shadow-none print:border-none">
            {/* Document Header */}
            <div className="border-b p-8 print:p-4 print:border-b-2 print:border-black">
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 print:text-4xl">
                  {minute.title}
                </h1>
                
                <div className={`inline-flex px-4 py-2 rounded-full border ${getStatusStyles(minute.status)} print:border-black print:bg-white`}>
                  <Badge variant={getStatusColor(minute.status)} className="print:border print:border-black print:bg-white print:text-black">
                    {minute.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-sm print:grid-cols-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1 print:text-black">
                      <Calendar className="h-4 w-4" />
                      Meeting Date
                    </div>
                    <div className="font-medium">
                      {new Date(minute.meeting_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1 print:text-black">
                      <FileText className="h-4 w-4" />
                      Meeting Type
                    </div>
                    <div className="font-medium capitalize">
                      {minute.meeting_type.replace('_', ' ')}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1 print:text-black">
                      <Users className="h-4 w-4" />
                      Attendees
                    </div>
                    <div className="font-medium">
                      {minute.attendees.length} Present
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-8 print:p-4 space-y-8 print:space-y-6">
              {/* Attendees Section */}
              {minute.attendees.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4 print:mb-3">
                    <Users className="h-6 w-6 text-blue-600 print:text-black" />
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-blue-600 pb-1 print:border-black">
                      ATTENDEES
                    </h2>
                  </div>
                  <div className="bg-blue-50 print:bg-white p-4 rounded-lg border-l-4 border-blue-500 print:border-black">
                    <div className="columns-2 gap-6">
                      {minute.attendees.map((attendee, index) => (
                        <div key={index} className="break-inside-avoid mb-2">
                          <span className="inline-block w-2 h-2 bg-blue-500 print:bg-black rounded-full mr-3"></span>
                          {attendee}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Agenda Items Section */}
              {minute.agenda_items.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4 print:mb-3">
                    <ClipboardList className="h-6 w-6 text-green-600 print:text-black" />
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-green-600 pb-1 print:border-black">
                      AGENDA ITEMS
                    </h2>
                  </div>
                  <div className="bg-green-50 print:bg-white p-4 rounded-lg border-l-4 border-green-500 print:border-black">
                    <ol className="space-y-3">
                      {minute.agenda_items.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 print:bg-black text-white print:text-white text-sm font-bold rounded-full">
                            {index + 1}
                          </span>
                          <span className="flex-1 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}

              {/* Discussion Points Section */}
              {minute.discussion_points && (
                <section>
                  <div className="flex items-center gap-3 mb-4 print:mb-3">
                    <MessageSquare className="h-6 w-6 text-orange-600 print:text-black" />
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-orange-600 pb-1 print:border-black">
                      DISCUSSION POINTS
                    </h2>
                  </div>
                  <div className="bg-orange-50 print:bg-white p-4 rounded-lg border-l-4 border-orange-500 print:border-black">
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap leading-relaxed text-gray-800 print:text-black">
                        {minute.discussion_points}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Action Items Section */}
              {minute.action_items.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-4 print:mb-3">
                    <CheckSquare className="h-6 w-6 text-red-600 print:text-black" />
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-red-600 pb-1 print:border-black">
                      ACTION ITEMS
                    </h2>
                  </div>
                  <div className="bg-red-50 print:bg-white p-4 rounded-lg border-l-4 border-red-500 print:border-black">
                    <div className="space-y-3">
                      {minute.action_items.map((item, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="inline-flex items-center justify-center w-6 h-6 border-2 border-red-500 print:border-black rounded">
                            <span className="text-xs font-bold text-red-600 print:text-black">{index + 1}</span>
                          </div>
                          <span className="flex-1 leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Next Meeting Section */}
              {minute.next_meeting_date && (
                <section>
                  <div className="flex items-center gap-3 mb-4 print:mb-3">
                    <Clock className="h-6 w-6 text-purple-600 print:text-black" />
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-purple-600 pb-1 print:border-black">
                      NEXT MEETING
                    </h2>
                  </div>
                  <div className="bg-purple-50 print:bg-white p-4 rounded-lg border-l-4 border-purple-500 print:border-black">
                    <div className="text-lg font-medium">
                      {new Date(minute.next_meeting_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Document Footer */}
            <div className="border-t p-6 print:p-4 print:border-t-2 print:border-black bg-gray-50 print:bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground print:text-black print:grid-cols-2">
                <div>
                  <strong>Created:</strong> {new Date(minute.created_at).toLocaleString()}
                </div>
                <div>
                  <strong>Last Updated:</strong> {new Date(minute.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};