import React, { useState } from 'react';
import { Mail, Search, Archive, Trash2, Reply, Forward, MoreHorizontal, Paperclip, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const EmailModule = () => {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const emails = [
    {
      id: '1',
      sender: 'Dr. Johnson',
      subject: 'Rehearsal Schedule Update - This Week',
      preview: 'Please note the schedule changes for this week\'s rehearsals...',
      timestamp: '2m ago',
      unread: true,
      starred: false,
      hasAttachment: false
    },
    {
      id: '2',
      sender: 'Sarah Williams',
      subject: 'Tour Preparations - Important Updates',
      preview: 'We need to finalize the tour arrangements by Friday...',
      timestamp: '1h ago',
      unread: true,
      starred: true,
      hasAttachment: true
    },
    {
      id: '3',
      sender: 'Executive Board',
      subject: 'Wardrobe Fitting Schedule',
      preview: 'Individual wardrobe fittings will begin next week...',
      timestamp: '3h ago',
      unread: false,
      starred: false,
      hasAttachment: false
    },
    {
      id: '4',
      sender: 'Music Library',
      subject: 'New Sheet Music Available',
      preview: 'We\'ve added several new pieces to our digital library...',
      timestamp: '1d ago',
      unread: false,
      starred: false,
      hasAttachment: true
    }
  ];

  const selectedEmailData = emails.find(email => email.id === selectedEmail);

  return (
    <div className="h-full flex">
      {/* Email List */}
      <div className="w-96 border-r border-border bg-background/50">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Email</h2>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search emails..." className="pl-10" />
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              Compose
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {emails.map((email) => (
              <Card 
                key={email.id}
                className={`p-4 mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedEmail === email.id ? 'bg-muted border-primary' : ''
                } ${email.unread ? 'border-l-4 border-l-primary' : ''}`}
                onClick={() => setSelectedEmail(email.id)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {email.sender.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${email.unread ? 'font-semibold' : 'font-normal'}`}>
                          {email.sender}
                        </p>
                        <span className="text-xs text-muted-foreground">{email.timestamp}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {email.starred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      {email.hasAttachment && <Paperclip className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  
                  <div>
                    <p className={`text-sm mb-1 ${email.unread ? 'font-medium' : 'font-normal'}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {email.preview}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Email Content */}
      <div className="flex-1 flex flex-col">
        {selectedEmailData ? (
          <>
            <div className="p-6 border-b border-border bg-background">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedEmailData.sender.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{selectedEmailData.subject}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{selectedEmailData.sender}</span>
                      <span>•</span>
                      <span>{selectedEmailData.timestamp}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Reply className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Forward className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-sm max-w-none">
                <p>Dear Glee Club Members,</p>
                
                <p>
                  I hope this message finds you well. I wanted to reach out regarding some important 
                  updates to our rehearsal schedule for the upcoming week.
                </p>
                
                <p>
                  Due to the facility maintenance scheduled for Tuesday, we'll need to move our 
                  regular rehearsal to the Chapel. Please note the following changes:
                </p>
                
                <ul>
                  <li><strong>Tuesday, March 12th:</strong> Rehearsal moved to Sisters Chapel (same time: 6:00 PM)</li>
                  <li><strong>Thursday, March 14th:</strong> Extended rehearsal until 8:30 PM for concert preparation</li>
                  <li><strong>Saturday, March 16th:</strong> Sectional rehearsals begin at 10:00 AM</li>
                </ul>
                
                <p>
                  Please arrive 15 minutes early for the chapel rehearsal to allow time for 
                  acoustics adjustments. Bring your water bottles and be prepared for an 
                  intensive session as we approach our spring concert.
                </p>
                
                <p>
                  If you have any conflicts with these schedule changes, please reach out to me 
                  immediately so we can make arrangements.
                </p>
                
                <p>
                  Looking forward to making beautiful music together!
                </p>
                
                <p>
                  Dr. Johnson<br />
                  Director, Spelman College Glee Club
                </p>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-2">Select an email to read</p>
              <p className="text-sm">Choose from your inbox to view the full message</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};