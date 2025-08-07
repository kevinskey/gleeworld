import React, { useState } from 'react';
import { Users, Search, Filter, Phone, Mail, MapPin, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const DirectoryModule = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const members = [
    {
      id: 1,
      name: 'Sarah Williams',
      role: 'Soprano I',
      section: 'Soprano',
      year: 'Senior',
      email: 'swilliams@spelman.edu',
      phone: '(404) 555-0123',
      avatar: '',
      status: 'active'
    },
    {
      id: 2,
      name: 'Maya Johnson',
      role: 'Alto II',
      section: 'Alto',
      year: 'Junior',
      email: 'mjohnson@spelman.edu',
      phone: '(404) 555-0456',
      avatar: '',
      status: 'active'
    },
    {
      id: 3,
      name: 'Dr. Keisha Brown',
      role: 'Director',
      section: 'Faculty',
      year: 'Faculty',
      email: 'kbrown@spelman.edu',
      phone: '(404) 555-0789',
      avatar: '',
      status: 'faculty'
    },
    {
      id: 4,
      name: 'Alicia Davis',
      role: 'Soprano II',
      section: 'Soprano',
      year: 'Sophomore',
      email: 'adavis@spelman.edu',
      phone: '(404) 555-0321',
      avatar: '',
      status: 'active'
    }
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getSectionColor = (section: string) => {
    switch (section) {
      case 'Soprano': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Alto': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Faculty': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Member Directory</h2>
              <p className="text-muted-foreground">Connect with Glee Club members and faculty</p>
            </div>
          </div>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Search members..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Members</TabsTrigger>
            <TabsTrigger value="soprano">Soprano</TabsTrigger>
            <TabsTrigger value="alto">Alto</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{member.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Badge variant="outline" className={getSectionColor(member.section)}>
                        {member.section}
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{member.year}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Other tabs would filter members by section */}
          <TabsContent value="soprano" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers
                .filter(member => member.section === 'Soprano')
                .map((member) => (
                  <Card key={member.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{member.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Badge variant="outline" className={getSectionColor(member.section)}>
                          {member.section}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="alto" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers
                .filter(member => member.section === 'Alto')
                .map((member) => (
                  <Card key={member.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{member.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Badge variant="outline" className={getSectionColor(member.section)}>
                          {member.section}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="faculty" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers
                .filter(member => member.section === 'Faculty')
                .map((member) => (
                  <Card key={member.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{member.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Badge variant="outline" className={getSectionColor(member.section)}>
                          {member.section}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};