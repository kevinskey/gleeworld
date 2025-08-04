import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, HardDrive, Download, Upload } from "lucide-react";

const DatabaseAdmin = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Administration</h1>
          <p className="text-muted-foreground">Advanced database operations and backups</p>
        </div>
        <Button>
          <Database className="mr-2 h-4 w-4" />
          Backup Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Database Status
            </CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-green-600 font-bold">Healthy</span>
              </div>
              <div className="flex justify-between">
                <span>Size</span>
                <span className="font-bold">2.4 GB</span>
              </div>
              <div className="flex justify-between">
                <span>Tables</span>
                <span className="font-bold">47</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backups
            </CardTitle>
            <CardDescription>Database backup management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">Last backup: 2 hours ago</div>
              <div className="text-sm">Backup size: 1.8 GB</div>
              <div className="text-sm">Retention: 30 days</div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              View Backups
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Maintenance
            </CardTitle>
            <CardDescription>Database optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Optimize Tables
              </Button>
              <Button variant="outline" className="w-full">
                Clear Cache
              </Button>
              <Button variant="outline" className="w-full">
                Repair Database
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseAdmin;