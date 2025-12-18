import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Save, Check, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Member {
  user_id: string;
  full_name: string;
  email: string;
  voice_part: string | null;
  avatar_url: string | null;
}

const voiceParts = [
  { value: 'S1', label: 'Soprano 1', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  { value: 'S2', label: 'Soprano 2', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  { value: 'A1', label: 'Alto 1', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'A2', label: 'Alto 2', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
];

export const SectionAssignmentModule = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, voice_part, avatar_url')
        .eq('role', 'member')
        .order('full_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleVoicePartChange = (userId: string, newVoicePart: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [userId]: newVoicePart === 'none' ? '' : newVoicePart
    }));
  };

  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const updates = Object.entries(pendingChanges).map(([userId, voicePart]) => 
        supabase
          .from('gw_profiles')
          .update({ voice_part: voicePart || null })
          .eq('user_id', userId)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} members`);
      }

      toast.success(`Updated ${Object.keys(pendingChanges).length} member sections`);
      setPendingChanges({});
      fetchMembers();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCurrentValue = (member: Member) => {
    if (pendingChanges[member.user_id] !== undefined) {
      return pendingChanges[member.user_id] || 'none';
    }
    return member.voice_part || 'none';
  };

  const getVoicePartBadge = (voicePart: string | null) => {
    const part = voiceParts.find(p => p.value === voicePart);
    if (part) {
      return <Badge className={part.color}>{part.label}</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>;
  };

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate section stats
  const sectionStats = {
    S1: members.filter(m => m.voice_part === 'S1').length,
    S2: members.filter(m => m.voice_part === 'S2').length,
    A1: members.filter(m => m.voice_part === 'A1').length,
    A2: members.filter(m => m.voice_part === 'A2').length,
    unassigned: members.filter(m => !m.voice_part || !['S1', 'S2', 'A1', 'A2'].includes(m.voice_part)).length,
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            Section Assignments
          </h2>
          <p className="text-muted-foreground">Assign voice parts to choir members</p>
        </div>
        {Object.keys(pendingChanges).length > 0 && (
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save {Object.keys(pendingChanges).length} Changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Section Stats */}
      <div className="grid grid-cols-5 gap-3">
        {voiceParts.map(part => (
          <Card key={part.value} className={`${part.color} border`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{sectionStats[part.value as keyof typeof sectionStats]}</p>
              <p className="text-xs font-medium">{part.label}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{sectionStats.unassigned}</p>
            <p className="text-xs font-medium text-muted-foreground">Unassigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Member List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {filteredMembers.map((member) => {
              const hasChange = pendingChanges[member.user_id] !== undefined;
              return (
                <div 
                  key={member.user_id} 
                  className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${hasChange ? 'bg-primary/5' : ''}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasChange && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Check className="h-3 w-3 mr-1" />
                        Changed
                      </Badge>
                    )}
                    
                    <Select
                      value={getCurrentValue(member)}
                      onValueChange={(value) => handleVoicePartChange(member.user_id, value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {voiceParts.map((part) => (
                          <SelectItem key={part.value} value={part.value}>
                            {part.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
            
            {filteredMembers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {searchTerm ? 'No matching members found' : 'No members found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
