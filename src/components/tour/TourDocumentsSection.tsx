import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  ExternalLink, 
  FileCheck, 
  Utensils, 
  ClipboardList,
  ScrollText,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";

interface TourDocument {
  id: string;
  name: string;
  description: string;
  type: 'required' | 'optional' | 'reference';
  status: 'submitted' | 'pending' | 'not_started';
  icon: React.ReactNode;
  downloadUrl?: string;
  dueDate?: string;
}

const tourDocuments: TourDocument[] = [
  {
    id: '1',
    name: 'Absence Excuse Letter',
    description: 'Official excuse letter for class absences during tour dates',
    type: 'required',
    status: 'submitted',
    icon: <FileText className="h-5 w-5" />,
    downloadUrl: '#',
  },
  {
    id: '2',
    name: 'Tour Contract & Agreement',
    description: 'Behavioral expectations and tour participation agreement',
    type: 'required',
    status: 'pending',
    icon: <ScrollText className="h-5 w-5" />,
    dueDate: 'March 1, 2026',
  },
  {
    id: '3',
    name: 'Dietary Restrictions Form',
    description: 'Food allergies, dietary preferences, and special meal requirements',
    type: 'required',
    status: 'submitted',
    icon: <Utensils className="h-5 w-5" />,
  },
  {
    id: '4',
    name: 'Tour Itinerary',
    description: 'Complete daily schedule with times, locations, and activities',
    type: 'reference',
    status: 'submitted',
    icon: <ClipboardList className="h-5 w-5" />,
    downloadUrl: '#',
  },
  {
    id: '5',
    name: 'Emergency Contact Form',
    description: 'Emergency contact information and medical details',
    type: 'required',
    status: 'not_started',
    icon: <AlertCircle className="h-5 w-5" />,
    dueDate: 'February 28, 2026',
  },
  {
    id: '6',
    name: 'Packing Checklist',
    description: 'Recommended items and required concert attire',
    type: 'reference',
    status: 'submitted',
    icon: <FileCheck className="h-5 w-5" />,
    downloadUrl: '#',
  },
];

const getStatusBadge = (status: TourDocument['status']) => {
  switch (status) {
    case 'submitted':
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Submitted</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'not_started':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><AlertCircle className="h-3 w-3 mr-1" />Not Started</Badge>;
    default:
      return null;
  }
};

const getTypeBadge = (type: TourDocument['type']) => {
  switch (type) {
    case 'required':
      return <Badge variant="destructive" className="text-xs">Required</Badge>;
    case 'optional':
      return <Badge variant="secondary" className="text-xs">Optional</Badge>;
    case 'reference':
      return <Badge variant="outline" className="text-xs">Reference</Badge>;
    default:
      return null;
  }
};

export const TourDocumentsSection = () => {
  const requiredDocs = tourDocuments.filter(d => d.type === 'required');
  const completedRequired = requiredDocs.filter(d => d.status === 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Document Completion</p>
              <p className="text-sm text-muted-foreground">
                {completedRequired} of {requiredDocs.length} required documents submitted
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {Math.round((completedRequired / requiredDocs.length) * 100)}%
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-primary/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(completedRequired / requiredDocs.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-3">
        {tourDocuments.map((doc) => (
          <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  {doc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium">{doc.name}</h3>
                    {getTypeBadge(doc.type)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {getStatusBadge(doc.status)}
                    {doc.dueDate && (
                      <span className="text-xs text-muted-foreground">Due: {doc.dueDate}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.downloadUrl && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                  {doc.status !== 'submitted' && doc.type === 'required' && (
                    <Button size="sm">
                      Complete
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
