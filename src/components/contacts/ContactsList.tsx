import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Contact {
  id: string;
  Email: string;
  FirstName?: string;
  LastName?: string;
  display_name?: string;
  Status: string;
  class?: string;
  city?: string;
  state?: string;
  DateUpdated?: string;
  TotalOpened: number;
  TotalClicked: number;
}

interface ContactsListProps {
  onViewContact: (id: string) => void;
}

export const ContactsList = ({ onViewContact }: ContactsListProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('glee_club_contacts')
        .select('*')
        .order('DateUpdated', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast.error('Failed to load contacts: ' + error.message);
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (contact: Contact): string => {
    if (contact.display_name) return contact.display_name;
    const parts = [contact.FirstName, contact.LastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'N/A';
  };

  const getLocation = (contact: Contact): string => {
    const parts = [contact.city, contact.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getGraduationYear = (contact: Contact): string => {
    if (!contact.class) return 'N/A';
    const year = parseInt(contact.class, 10);
    return !isNaN(year) && year >= 1900 && year <= 2100 ? contact.class : 'N/A';
  };

  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.Email.toLowerCase().includes(query) ||
      getFullName(contact).toLowerCase().includes(query) ||
      (contact.class && contact.class.includes(query)) ||
      contact.Status.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Unsubscribed':
        return 'bg-gray-500';
      case 'Bounced':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading contacts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Glee Club Contacts ({contacts.length})</CardTitle>
        <div className="flex items-center gap-2 mt-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, year, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {searchQuery ? 'No contacts match your search' : 'No contacts yet. Import some to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-mono text-sm">{contact.Email}</TableCell>
                    <TableCell>{getFullName(contact)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(contact.Status)}>
                        {contact.Status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getGraduationYear(contact)}</TableCell>
                    <TableCell>{getLocation(contact)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contact.DateUpdated 
                        ? new Date(contact.DateUpdated).toLocaleDateString() 
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">{contact.TotalOpened}</TableCell>
                    <TableCell className="text-right">{contact.TotalClicked}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewContact(contact.id)}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
