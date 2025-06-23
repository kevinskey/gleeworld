
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileText, Activity, Settings, Search, Download, Filter } from "lucide-react";

interface ActivityLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  document: string;
  ip: string;
  status: "success" | "error" | "warning";
}

interface UserActivity {
  id: number;
  name: string;
  email: string;
  role: string;
  documentsCreated: number;
  documentsSigned: number;
  lastActive: string;
  status: "active" | "inactive";
}

export const AdminPanel = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const [activityLogs] = useState<ActivityLog[]>([
    {
      id: 1,
      timestamp: "2024-06-23 10:30:00",
      user: "john@company.com",
      action: "Document Signed",
      document: "Service Agreement - Client ABC",
      ip: "192.168.1.100",
      status: "success"
    },
    {
      id: 2,
      timestamp: "2024-06-23 09:15:00",
      user: "jane@company.com", 
      action: "Document Created",
      document: "NDA - Project Phoenix",
      ip: "192.168.1.101",
      status: "success"
    },
    {
      id: 3,
      timestamp: "2024-06-23 08:45:00",
      user: "admin@company.com",
      action: "Template Modified",
      document: "Employment Contract Template",
      ip: "192.168.1.102",
      status: "success"
    },
    {
      id: 4,
      timestamp: "2024-06-22 16:20:00",
      user: "client@external.com",
      action: "Signature Failed",
      document: "Service Agreement - Client XYZ",
      ip: "203.0.113.45",
      status: "error"
    }
  ]);

  const [users] = useState<UserActivity[]>([
    {
      id: 1,
      name: "John Smith",
      email: "john@company.com",
      role: "Manager",
      documentsCreated: 25,
      documentsSigned: 18,
      lastActive: "2024-06-23",
      status: "active"
    },
    {
      id: 2,
      name: "Jane Doe",
      email: "jane@company.com",
      role: "Admin",
      documentsCreated: 42,
      documentsSigned: 35,
      lastActive: "2024-06-23",
      status: "active"
    },
    {
      id: 3,
      name: "Bob Wilson",
      email: "bob@company.com",
      role: "User",
      documentsCreated: 8,
      documentsSigned: 12,
      lastActive: "2024-06-20",
      status: "inactive"
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-800";
      case "error": return "bg-red-100 text-red-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredLogs = activityLogs.filter(log => 
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.document.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-gray-600">Monitor system activity and manage users</p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Active Users
            </CardTitle>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.status === "active").length}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Total Documents
            </CardTitle>
            <div className="text-2xl font-bold text-green-600">
              {users.reduce((sum, user) => sum + user.documentsCreated, 0)}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-600" />
              Today's Activity
            </CardTitle>
            <div className="text-2xl font-bold text-purple-600">
              {activityLogs.filter(log => log.timestamp.includes("2024-06-23")).length}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Settings className="h-5 w-5 mr-2 text-orange-600" />
              System Health
            </CardTitle>
            <div className="text-2xl font-bold text-green-600">Good</div>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Activity Logs</CardTitle>
                  <CardDescription>Recent system activity and user actions</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search activity..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.document}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button>Add User</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Documents Created</TableHead>
                    <TableHead>Documents Signed</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.documentsCreated}</TableCell>
                      <TableCell>{user.documentsSigned}</TableCell>
                      <TableCell>{user.lastActive}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">Reset</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Configure email delivery and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">Configure SMTP</Button>
                <Button variant="outline" className="w-full">Test Email Delivery</Button>
                <Button variant="outline" className="w-full">Notification Templates</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage authentication and security policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">Password Policy</Button>
                <Button variant="outline" className="w-full">Session Management</Button>
                <Button variant="outline" className="w-full">Audit Configuration</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Settings</CardTitle>
                <CardDescription>Configure document storage and retention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">Storage Limits</Button>
                <Button variant="outline" className="w-full">Backup Schedule</Button>
                <Button variant="outline" className="w-full">Retention Policies</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Maintenance</CardTitle>
                <CardDescription>System health and maintenance tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">System Diagnostics</Button>
                <Button variant="outline" className="w-full">Clear Cache</Button>
                <Button variant="outline" className="w-full">Database Cleanup</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
