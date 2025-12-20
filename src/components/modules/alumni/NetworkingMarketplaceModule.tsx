import { useState } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Briefcase, Plus, MapPin, Mail, Link, Building2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  description: string;
  posted_by: string;
  posted_date: string;
}

interface BusinessCard {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  email: string;
  website?: string;
  class_year: number;
  avatar?: string;
}

export function NetworkingMarketplaceModule({ user, isFullPage }: ModuleProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('jobs');
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);

  const [jobs] = useState<JobPosting[]>([
    {
      id: '1',
      title: 'Senior Marketing Manager',
      company: 'Turner Broadcasting',
      location: 'Atlanta, GA',
      type: 'full-time',
      description: 'Looking for a dynamic leader to head our marketing initiatives...',
      posted_by: 'Janet Williams \'98',
      posted_date: '2024-12-10'
    },
    {
      id: '2',
      title: 'Music Education Coordinator',
      company: 'Atlanta Public Schools',
      location: 'Atlanta, GA',
      type: 'full-time',
      description: 'Seeking an experienced educator to lead our district music programs...',
      posted_by: 'Dr. Lisa Thompson \'05',
      posted_date: '2024-12-08'
    }
  ]);

  const [businessCards] = useState<BusinessCard[]>([
    {
      id: '1',
      name: 'Dr. Angela Davis',
      title: 'Chief Medical Officer',
      company: 'Grady Health System',
      industry: 'Healthcare',
      location: 'Atlanta, GA',
      email: 'a.davis@example.com',
      class_year: 1992
    },
    {
      id: '2',
      name: 'Keisha Johnson',
      title: 'VP of Product',
      company: 'Microsoft',
      industry: 'Technology',
      location: 'Seattle, WA',
      email: 'k.johnson@example.com',
      website: 'linkedin.com/in/keishaj',
      class_year: 2008
    },
    {
      id: '3',
      name: 'Jasmine Carter',
      title: 'Partner',
      company: 'Baker McKenzie',
      industry: 'Legal',
      location: 'New York, NY',
      email: 'j.carter@example.com',
      class_year: 2001
    }
  ]);

  const handlePostJob = () => {
    toast.success('Job posting submitted for review!');
    setIsJobDialogOpen(false);
  };

  const handleContact = (name: string) => {
    toast.success(`Contact request sent to ${name}!`);
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCards = businessCards.filter(card =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ModuleWrapper
      title="Networking Marketplace"
      icon={Briefcase}
    >
      <div className="space-y-6">
        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, people, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Post a Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Post a Job Opportunity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Job Title</Label>
                  <Input placeholder="e.g., Marketing Director" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input placeholder="e.g., Coca-Cola" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Location</Label>
                    <Input placeholder="e.g., Atlanta, GA" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the role and requirements..." rows={4} />
                </div>
                <Button onClick={handlePostJob} className="w-full">Post Job</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jobs">Job Opportunities</TabsTrigger>
            <TabsTrigger value="directory">Professional Directory</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4 mt-4">
            {filteredJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{job.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {job.company}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                    </div>
                    <Badge variant="secondary">{job.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{job.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      Posted by {job.posted_by} • {new Date(job.posted_date).toLocaleDateString()}
                    </span>
                    <Button size="sm">Apply</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="directory" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card) => (
                <Card key={card.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={card.avatar} />
                        <AvatarFallback>{card.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{card.name}</h4>
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="text-sm text-muted-foreground">{card.company}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {card.location}
                      </div>
                      <Badge variant="outline" className="text-xs">{card.industry}</Badge>
                      <Badge variant="secondary" className="text-xs ml-1">Class of '{card.class_year.toString().slice(-2)}</Badge>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleContact(card.name)}>
                        <Mail className="h-3 w-3" />
                        Contact
                      </Button>
                      {card.website && (
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Link className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleWrapper>
  );
}

export default NetworkingMarketplaceModule;
