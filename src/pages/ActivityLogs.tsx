
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, Database, User, FileText, Calendar, ArrowLeft } from "lucide-react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const ActivityLogs = () => {
  const { logs, loading, error, refetch } = useActivityLogs();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const navigate = useNavigate();

  const getActionColor = (actionType: string) => {
    if (actionType.includes('created')) return "bg-green-100 text-green-800";
    if (actionType.includes('updated')) return "bg-blue-100 text-blue-800";
    if (actionType.includes('deleted')) return "bg-red-100 text-red-800";
    if (actionType.includes('signed')) return "bg-purple-100 text-purple-800";
    if (actionType.includes('sent')) return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'contract': return <FileText className="h-4 w-4" />;
      case 'template': return <FileText className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (
      log.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;
    const matchesResource = resourceFilter === "all" || log.resource_type === resourceFilter;
    
    return matchesSearch && matchesAction && matchesResource;
  });

  const uniqueActionTypes = [...new Set(logs.map(log => log.action_type))];
  const uniqueResourceTypes = [...new Set(logs.map(log => log.resource_type))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <p>Error loading activity logs: {error}</p>
                <Button onClick={refetch} className="mt-4">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
              <p className="text-gray-600">Track all user activities related to contracts and templates</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>Recent user actions and system events</CardDescription>
              </div>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users, actions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActionTypes.map(action => (
                      <SelectItem key={action} value={action}>
                        {formatActionType(action)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    {uniqueResourceTypes.map(resource => (
                      <SelectItem key={resource} value={resource}>
                        {resource.charAt(0).toUpperCase() + resource.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">
                  {logs.length === 0 ? "No activity logs yet" : "No matching activities found"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {log.user_profile?.full_name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.user_profile?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action_type)}>
                          {formatActionType(log.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getResourceIcon(log.resource_type)}
                          <span className="capitalize">{log.resource_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-gray-600 truncate">
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <span>{JSON.stringify(log.details)}</span>
                          ) : (
                            <span className="text-gray-400">No details</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityLogs;
