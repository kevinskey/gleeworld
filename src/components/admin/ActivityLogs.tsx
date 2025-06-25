
import { useActivityLogs, ActivityLog } from "@/hooks/useActivityLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, User, FileText, Settings, PenTool } from "lucide-react";

interface ActivityLogsProps {
  activityLogs?: ActivityLog[];
}

export const ActivityLogs = ({ activityLogs: propActivityLogs }: ActivityLogsProps) => {
  const { logs: fetchedActivityLogs, loading, error } = useActivityLogs();
  
  // Use prop logs if provided, otherwise use fetched logs
  const logs = propActivityLogs || fetchedActivityLogs;

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />;
      case 'contract_created':
      case 'contract_updated':
      case 'contract_deleted':
      case 'contract_viewed':
      case 'contract_signed':
      case 'contract_sent':
        return <FileText className="h-4 w-4" />;
      case 'template_created':
      case 'template_updated':
      case 'template_deleted':
      case 'template_used':
        return <PenTool className="h-4 w-4" />;
      case 'settings_updated':
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('created') || actionType.includes('signed')) return 'bg-green-100 text-green-800';
    if (actionType.includes('deleted')) return 'bg-red-100 text-red-800';
    if (actionType.includes('updated') || actionType.includes('sent')) return 'bg-blue-100 text-blue-800';
    if (actionType.includes('viewed') || actionType.includes('used')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatActionType = (actionType: string) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading activity logs...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading activity logs: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Logs
        </CardTitle>
        <p className="text-sm text-gray-600">Recent system activities and user actions</p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity logs found</p>
              <p className="text-sm">User actions will appear here once they start using the system</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getActionColor(log.action_type)}>
                        {formatActionType(log.action_type)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      {log.user_profile?.full_name && (
                        <span className="font-medium">{log.user_profile.full_name}</span>
                      )}
                      {log.user_profile?.email && !log.user_profile?.full_name && (
                        <span className="font-medium">{log.user_profile.email}</span>
                      )}
                      {!log.user_profile && (
                        <span className="text-gray-500">System</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 mb-1">
                      Resource: <span className="font-medium">{log.resource_type}</span>
                      {log.resource_id && (
                        <span className="text-gray-500"> (ID: {log.resource_id.slice(0, 8)}...)</span>
                      )}
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded mt-2">
                        {Object.entries(log.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
