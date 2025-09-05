import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, UserPlus } from 'lucide-react';
import { useAutoEnrollUser } from '@/hooks/useAutoEnrollUser';

export const FirstYearConsoleModule = () => {
  const [email, setEmail] = useState('ALEXANDRAWILLIAMS@spelman.edu');
  const [fullName, setFullName] = useState('Alexandra Williams');
  const [role, setRole] = useState('librarian');
  const { autoEnrollUser, enrolling } = useAutoEnrollUser();

  const handleAutoEnroll = async () => {
    if (!email || !role) return;
    
    await autoEnrollUser(email, fullName || undefined, undefined, role);
    
    // Reset form
    setEmail('');
    setFullName('');
    setRole('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            First Year Console
          </CardTitle>
          <CardDescription>
            Tools and resources for first-year management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">First year management console coming soon.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Auto-Enroll User
          </CardTitle>
          <CardDescription>
            Quickly enroll a user with a specific role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@spelman.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name (Optional)</Label>
            <Input
              id="fullName"
              placeholder="Alexandra Williams"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="librarian">Librarian</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="auditioner">Auditioner</SelectItem>
                <SelectItem value="alumna">Alumna</SelectItem>
                <SelectItem value="fan">Fan</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleAutoEnroll}
            disabled={!email || !role || enrolling}
            className="w-full"
          >
            {enrolling ? 'Enrolling...' : 'Auto-Enroll User'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};