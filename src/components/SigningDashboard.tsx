
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, CheckCircle, AlertCircle, Send, Eye, Download } from "lucide-react";

interface SigningDocument {
  id: number;
  name: string;
  recipient: string;
  status: "sent" | "viewed" | "signed" | "completed";
  progress: number;
  sentDate: string;
  dueDate: string;
  type: string;
}

export const SigningDashboard = () => {
  const [documents] = useState<SigningDocument[]>([
    {
      id: 1,
      name: "Service Agreement - Client ABC",
      recipient: "client@company.com",
      status: "viewed",
      progress: 50,
      sentDate: "2024-06-20",
      dueDate: "2024-06-27",
      type: "Service Agreement"
    },
    {
      id: 2,
      name: "NDA - Project Phoenix",
      recipient: "partner@business.com", 
      status: "completed",
      progress: 100,
      sentDate: "2024-06-18",
      dueDate: "2024-06-25",
      type: "NDA"
    },
    {
      id: 3,
      name: "Employment Contract - John Doe",
      recipient: "john.doe@email.com",
      status: "signed",
      progress: 75,
      sentDate: "2024-06-22",
      dueDate: "2024-06-29",
      type: "Employment"
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <Send className="h-4 w-4 text-blue-600" />;
      case "viewed": return <Eye className="h-4 w-4 text-yellow-600" />;
      case "signed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-100 text-blue-800";
      case "viewed": return "bg-yellow-100 text-yellow-800";
      case "signed": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "sent": return "Sent";
      case "viewed": return "Viewed by Recipient";
      case "signed": return "Recipient Signed";
      case "completed": return "Fully Completed";
      default: return "Unknown";
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const pendingDocs = documents.filter(doc => doc.status !== "completed");
  const completedDocs = documents.filter(doc => doc.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Signing Dashboard</h2>
        <p className="text-gray-600">Track the progress of your contract signatures</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Sent</CardTitle>
            <div className="text-2xl font-bold text-blue-600">{documents.length}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending</CardTitle>
            <div className="text-2xl font-bold text-yellow-600">{pendingDocs.length}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Completed</CardTitle>
            <div className="text-2xl font-bold text-green-600">{completedDocs.length}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Avg. Time</CardTitle>
            <div className="text-2xl font-bold text-gray-600">2.5 days</div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingDocs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedDocs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDocs.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span>{doc.name}</span>
                    </CardTitle>
                    <CardDescription>
                      Sent to: {doc.recipient} • Type: {doc.type}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(doc.status)}
                    <Badge className={getStatusColor(doc.status)}>
                      {getStatusText(doc.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{doc.progress}%</span>
                    </div>
                    <Progress value={doc.progress} className="h-2" />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="space-y-1">
                      <p className="text-gray-600">Sent: {doc.sentDate}</p>
                      <p className="text-gray-600">
                        Due: {doc.dueDate} 
                        <span className={`ml-2 ${getDaysRemaining(doc.dueDate) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ({getDaysRemaining(doc.dueDate)} days)
                        </span>
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Remind
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedDocs.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span>{doc.name}</span>
                    </CardTitle>
                    <CardDescription>
                      Completed with: {doc.recipient} • Type: {doc.type}
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    <p>Sent: {doc.sentDate}</p>
                    <p>Completed: {doc.dueDate}</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
