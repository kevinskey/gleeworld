import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Shield, 
  DollarSign, 
  BarChart3,
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap
} from 'lucide-react';

export const SystemModule = () => {
  const stats = [
    { title: 'Total Users', value: '1,247', change: '+12%', icon: Users, trend: 'up' },
    { title: 'Active Sessions', value: '89', change: '+5%', icon: Shield, trend: 'up' },
    { title: 'Monthly Revenue', value: '$24,567', change: '+18%', icon: DollarSign, trend: 'up' },
    { title: 'System Health', value: '99.9%', change: 'Stable', icon: BarChart3, trend: 'stable' },
  ];

  const systemMetrics = [
    { label: 'CPU Usage', value: '45%', status: 'good', icon: Activity },
    { label: 'Memory Usage', value: '62%', status: 'warning', icon: Server },
    { label: 'Database Health', value: 'Optimal', status: 'good', icon: Database },
    { label: 'Response Time', value: '120ms', status: 'good', icon: Zap },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor system performance and statistics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Logs
          </Button>
        </div>
      </div>

      {/* Platform Statistics */}
      <Card className="bg-background/50 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Platform Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-background/30 border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className={`text-xs ${getTrendColor(stat.trend)}`}>{stat.change}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health Metrics */}
      <Card className="bg-background/50 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <metric.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{metric.label}</p>
                    <p className="text-lg font-bold text-foreground">{metric.value}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={getStatusColor(metric.status)}>
                  {metric.status === 'good' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {metric.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card className="bg-background/50 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            System Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-16 flex-col">
              <Database className="h-5 w-5 mb-2" />
              <span className="text-sm">Database Backup</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Activity className="h-5 w-5 mb-2" />
              <span className="text-sm">Performance Test</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Shield className="h-5 w-5 mb-2" />
              <span className="text-sm">Security Scan</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <BarChart3 className="h-5 w-5 mb-2" />
              <span className="text-sm">Generate Report</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Clock className="h-5 w-5 mb-2" />
              <span className="text-sm">Maintenance Mode</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Zap className="h-5 w-5 mb-2" />
              <span className="text-sm">Clear Cache</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};