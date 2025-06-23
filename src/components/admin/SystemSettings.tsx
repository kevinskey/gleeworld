
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const SystemSettings = () => {
  return (
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
  );
};
