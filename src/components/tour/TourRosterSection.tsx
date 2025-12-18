import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Search, Check, X, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Member {
  user_id: string;
  full_name: string;
  email: string;
  voice_part?: string;
  avatar_url?: string;
}

interface RosterMember extends Member {
  roster_id?: string;
  status: 'confirmed' | 'pending' | 'declined' | 'waitlist';
}

export const TourRosterSection = () => {
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all members and admins who can be added to tour
      const { data: members, error: membersError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, voice_part, avatar_url, role')
        .in('role', ['member', 'admin', 'super-admin'])
        .order('full_name');

      if (membersError) throw membersError;

      // Fetch tour roster (without tour_id filter for now - general roster)
      const { data: roster, error: rosterError } = await supabase
        .from('gw_tour_roster')
        .select('*');

      if (rosterError) throw rosterError;

      setAllMembers(members || []);
      
      // Map roster to members
      const rosterMap = new Map(roster?.map(r => [r.user_id, r]) || []);
      const rosterMembersList: RosterMember[] = (members || [])
        .filter(m => rosterMap.has(m.user_id))
        .map(m => {
          const rosterEntry = rosterMap.get(m.user_id);
          const status = rosterEntry?.status as RosterMember['status'] || 'confirmed';
          return {
            ...m,
            roster_id: rosterEntry?.id,
            status
          };
        });
      
      setRosterMembers(rosterMembersList);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load roster data');
    } finally {
      setLoading(false);
    }
  };

  const addToRoster = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gw_tour_roster')
        .insert({
          user_id: userId,
          status: 'confirmed',
          added_by: user?.id
        });

      if (error) throw error;
      
      toast.success('Member added to tour roster');
      fetchData();
    } catch (error: any) {
      console.error('Error adding to roster:', error);
      toast.error(error.message || 'Failed to add member');
    }
  };

  const removeFromRoster = async (rosterId: string) => {
    try {
      const { error } = await supabase
        .from('gw_tour_roster')
        .delete()
        .eq('id', rosterId);

      if (error) throw error;
      
      toast.success('Member removed from tour roster');
      fetchData();
    } catch (error) {
      console.error('Error removing from roster:', error);
      toast.error('Failed to remove member');
    }
  };

  const updateStatus = async (rosterId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('gw_tour_roster')
        .update({ status })
        .eq('id', rosterId);

      if (error) throw error;
      
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const addSelectedToRoster = async () => {
    if (selectedMembers.size === 0) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const inserts = Array.from(selectedMembers).map(userId => ({
        user_id: userId,
        status: 'confirmed',
        added_by: user?.id
      }));

      const { error } = await supabase
        .from('gw_tour_roster')
        .insert(inserts);

      if (error) throw error;
      
      toast.success(`${selectedMembers.size} members added to roster`);
      setSelectedMembers(new Set());
      fetchData();
    } catch (error: any) {
      console.error('Error adding members:', error);
      toast.error(error?.message || 'Failed to add members');
    }
  };

  const toggleMemberSelection = (userId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const rosterUserIds = new Set(rosterMembers.map(m => m.user_id));
  const availableMembers = allMembers.filter(m => 
    !rosterUserIds.has(m.user_id) &&
    (m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     m.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'declined':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><X className="h-3 w-3 mr-1" />Declined</Badge>;
      case 'waitlist':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><AlertCircle className="h-3 w-3 mr-1" />Waitlist</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{rosterMembers.filter(m => m.status === 'confirmed').length}</p>
            <p className="text-sm text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{rosterMembers.filter(m => m.status === 'pending').length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{rosterMembers.filter(m => m.status === 'waitlist').length}</p>
            <p className="text-sm text-muted-foreground">Waitlist</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{rosterMembers.length}</p>
            <p className="text-sm text-muted-foreground">Total on Tour</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tour Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Tour Roster ({rosterMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {rosterMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No members added to tour roster yet
              </p>
            ) : (
              rosterMembers.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.voice_part || 'No voice part'}</p>
                  </div>
                  <Select
                    value={member.status}
                    onValueChange={(value) => member.roster_id && updateStatus(member.roster_id, value)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="waitlist">Waitlist</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => member.roster_id && removeFromRoster(member.roster_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Available Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                Add Members
              </CardTitle>
              {selectedMembers.size > 0 && (
                <Button size="sm" onClick={addSelectedToRoster}>
                  Add {selectedMembers.size} Selected
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {availableMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? 'No matching members found' : 'All members are on the roster'}
              </p>
            ) : (
              availableMembers.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedMembers.has(member.user_id)}
                    onCheckedChange={() => toggleMemberSelection(member.user_id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback className="bg-muted text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.voice_part || member.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addToRoster(member.user_id)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
