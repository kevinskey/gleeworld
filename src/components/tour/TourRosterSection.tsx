import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Search, Check, X, Clock, AlertCircle, FileCheck, FileWarning } from 'lucide-react';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePermissionSlips } from '@/hooks/usePermissionSlips';
import { SlipStatusBadge } from '@/components/travel-manager/SlipStatusBadge';

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
  const [signedUserIds, setSignedUserIds] = useState<Set<string>>(new Set());
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [k12Enabled, setK12Enabled] = useState(false);
  // Map of student_user_id → guardian count (bulk fetch, no N+1)
  const [guardianCounts, setGuardianCounts] = useState<Map<string, number>>(new Map());

  const { byStudent, send, revoke, viewSignedUrl, refresh: refreshSlips } =
    usePermissionSlips(activeTourId);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchGuardianCounts = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) {
      setGuardianCounts(new Map());
      return;
    }
    const { data } = await supabase
      .from('gw_guardians')
      .select('student_user_id')
      .in('student_user_id', userIds);
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.student_user_id, (counts.get(row.student_user_id) ?? 0) + 1);
    }
    setGuardianCounts(counts);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: members, error: membersError },
        { data: roster, error: rosterError },
        { data: signatures },
        { data: activeTour },
        { data: branding },
      ] = await Promise.all([
        supabase
          .from('gw_profiles_directory')
          .select('user_id, full_name, email, voice_part, avatar_url, role')
          .in('role', ['member', 'student', 'executive', 'admin', 'super-admin'])
          .order('full_name'),
        supabase.from('gw_tour_roster').select('*'),
        supabase
          .from('tour_contract_signatures')
          .select('user_id')
          .eq('contract_id', '99ad60d3-0e94-41b2-b4f9-1b03146c62c9'),
        supabase
          .from('gw_tours')
          .select('id')
          .in('status', ['planning', 'confirmed', 'active'])
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
        // Pinned to the current tenant — a platform owner's RLS reads every
        // tenant's branding row, so an unpinned maybeSingle() errors.
        supabase
          .from('gw_branding_settings')
          .select('k12_ensemble, gw_tenants!inner(slug)')
          .eq('gw_tenants.slug', getTenantSlug())
          .limit(1)
          .maybeSingle(),
      ]);

      if (membersError) throw membersError;
      if (rosterError) throw rosterError;

      setSignedUserIds(new Set(signatures?.map(s => s.user_id) || []));
      setActiveTourId(activeTour?.id ?? null);
      setK12Enabled(!!branding?.k12_ensemble);

      setAllMembers(members || []);

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

      // Bulk-fetch guardian counts for all roster members (single query, no N+1)
      const rosterUserIds = rosterMembersList.map(m => m.user_id);
      await fetchGuardianCounts(rosterUserIds);
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
      await fetchData();
      await refreshSlips();
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-3.5 w-3.5" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5" />;
      case 'declined':
        return <X className="h-3.5 w-3.5" />;
      case 'waitlist':
        return <AlertCircle className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-emerald-700 dark:text-emerald-400';
      case 'pending':
        return 'text-amber-600 dark:text-amber-400';
      case 'declined':
        return 'text-red-600 dark:text-red-400';
      case 'waitlist':
        return 'text-slate-500 dark:text-slate-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Calculate section stats for confirmed members
  const confirmedMembers = rosterMembers.filter(m => m.status === 'confirmed');
  const sectionStats = {
    S1: confirmedMembers.filter(m => m.voice_part?.toLowerCase() === 's1' || m.voice_part?.toLowerCase() === 'soprano 1').length,
    S2: confirmedMembers.filter(m => m.voice_part?.toLowerCase() === 's2' || m.voice_part?.toLowerCase() === 'soprano 2').length,
    A1: confirmedMembers.filter(m => m.voice_part?.toLowerCase() === 'a1' || m.voice_part?.toLowerCase() === 'alto 1').length,
    A2: confirmedMembers.filter(m => m.voice_part?.toLowerCase() === 'a2' || m.voice_part?.toLowerCase() === 'alto 2').length,
  };
  const unassigned = confirmedMembers.filter(m => 
    !m.voice_part || 
    !['s1', 's2', 'a1', 'a2', 'soprano 1', 'soprano 2', 'alto 1', 'alto 2'].includes(m.voice_part?.toLowerCase())
  ).length;

  const statusCounts = {
    confirmed: rosterMembers.filter(m => m.status === 'confirmed').length,
    pending: rosterMembers.filter(m => m.status === 'pending').length,
    waitlist: rosterMembers.filter(m => m.status === 'waitlist').length,
    total: rosterMembers.length
  };

  return (
    <div className="space-y-4">
      {/* Status Summary - Compact strip */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs text-muted-foreground">Confirmed</span>
          <span className="text-sm font-bold text-foreground">{statusCounts.confirmed}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs text-muted-foreground">Pending</span>
          <span className="text-sm font-bold text-foreground">{statusCounts.pending}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Waitlist</span>
          <span className="text-sm font-bold text-foreground">{statusCounts.waitlist}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-bold text-foreground">{statusCounts.total}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-3 py-1.5">
          <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs text-muted-foreground">Contracts</span>
          <span className="text-sm font-bold text-foreground">
            {rosterMembers.filter(m => signedUserIds.has(m.user_id)).length}/{rosterMembers.length} signed
          </span>
        </div>
      </div>

      {/* Voice Part Distribution - Compact strip */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Voice Parts ({confirmedMembers.length})</span>
        {[
          { label: 'S1', count: sectionStats.S1 },
          { label: 'S2', count: sectionStats.S2 },
          { label: 'A1', count: sectionStats.A1 },
          { label: 'A2', count: sectionStats.A2 },
          { label: 'Other', count: unassigned },
        ].map((section) => (
          <div key={section.label} className="flex items-center gap-1 bg-muted/50 border border-border rounded-md px-2.5 py-1">
            <span className="text-sm font-bold text-foreground">{section.count}</span>
            <span className="text-xs text-muted-foreground">{section.label}</span>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tour Roster */}
        <div className="bg-card border border-border rounded-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="p-4 border-b border-border flex-shrink-0">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Travel Roster
              <Badge variant="secondary" className="ml-auto">{rosterMembers.length}</Badge>
            </h3>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {rosterMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No members added to travel roster yet
              </p>
            ) : (
              rosterMembers.map((member) => (
                <div 
                  key={member.user_id} 
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`flex items-center gap-1 text-xs font-medium ${getStatusStyles(member.status)}`}>
                        {getStatusIcon(member.status)}
                        <span className="capitalize">{member.status}</span>
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-medium flex-shrink-0">
                    {member.voice_part || 'N/A'}
                  </Badge>
                  {signedUserIds.has(member.user_id) ? (
                    <Badge variant="success" size="sm" className="flex-shrink-0 gap-1">
                      <FileCheck className="h-3 w-3" />
                      Signed
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" className="flex-shrink-0 gap-1">
                      <FileWarning className="h-3 w-3" />
                      Not Signed
                    </Badge>
                  )}
                  <SlipStatusBadge
                    slip={byStudent.get(member.user_id) ?? null}
                    guardianCount={guardianCounts.get(member.user_id) ?? 0}
                    k12Enabled={k12Enabled}
                    onSend={async () => {
                      const slip = byStudent.get(member.user_id);
                      if (slip) {
                        await send(slip.id);
                      } else {
                        // No slip exists yet — calling send would fail;
                        // the edge fn creates and sends in one shot only
                        // if a slip row already exists. Surface a toast.
                        toast.error('No permission slip record found. Contact support.');
                      }
                    }}
                    onRevoke={async () => {
                      const slip = byStudent.get(member.user_id);
                      if (slip) await revoke(slip.id);
                    }}
                    onViewSigned={async () => {
                      const slip = byStudent.get(member.user_id);
                      if (!slip) return;
                      const url = await viewSignedUrl(slip.id);
                      if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } else {
                        toast.error('Signed document not available.');
                      }
                    }}
                  />
                  <Select
                    value={member.status}
                    onValueChange={(value) => member.roster_id && updateStatus(member.roster_id, value)}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
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
                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => member.roster_id && removeFromRoster(member.roster_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Members */}
        <div className="bg-card border border-border rounded-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="p-4 border-b border-border space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Add Members
                <Badge variant="secondary" className="ml-1">{availableMembers.length} available</Badge>
              </h3>
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
                className="pl-9 bg-background"
              />
            </div>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {availableMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {searchTerm ? 'No matching members found' : 'All members are on the roster'}
              </p>
            ) : (
              availableMembers.map((member) => (
                <div 
                  key={member.user_id} 
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedMembers.has(member.user_id)}
                    onCheckedChange={() => toggleMemberSelection(member.user_id)}
                  />
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {member.voice_part || 'N/A'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => addToRoster(member.user_id)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};