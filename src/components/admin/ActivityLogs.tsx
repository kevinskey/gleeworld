
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, Database, RefreshCw } from "lucide-react";
import { useActivityLogs } from "@/hooks/useActivityLogs";

export const ActivityLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { logs, loading, error, refetch } = useActivityLogs();

  const getStatusColor = (actionType: string) => {
    switch (actionType) {
      case "contract_signed": return "bg-green-100 text-green-800";
      case "contract_created": return "bg-blue-100 text-blue-800";
      case "contract_deleted": return "bg-red-100 text-red-800";
      case "template_created": return "bg-purple-100 text-purple-800";
      case "template_used": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredLogs = logs.filter(log => 
    log.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Error loading activity logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
            <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">
              {logs.length === 0 ? "No activity logs yet" : "No matching activity logs found"}
            </p>
            {logs.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Activity logs will appear here as users interact with the system
              </p>
            )}
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {log.user_profile?.full_name || 'Unknown User'}
                      </div>
                      {log.user_profile?.email && (
                        <div className="text-sm text-gray-500">
                          {log.user_profile.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatActionType(log.action_type)}</TableCell>
                  <TableCell className="capitalize">{log.resource_type}</TableCell>
                  <TableCell className="max-w-xs">
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-sm">
                        {Object.entries(log.details).slice(0, 2).map(([key, value]) => (
                          <div key={key} className="truncate">
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                        {Object.keys(log.details).length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{Object.keys(log.details).length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(log.action_type)}>
                      {formatActionType(log.action_type)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
