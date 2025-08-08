import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Mail, GraduationCap, Music } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MemberProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  voice_part: string | null;
  graduation_year: number | null;
  major: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
}

export const MemberDirectory = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoicePart, setSelectedVoicePart] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, selectedVoicePart, members]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('id, user_id, full_name, email, role, voice_part, graduation_year, major, bio, avatar_url, verified')
        .in('role', ['member', 'alumna'])
        .eq('verified', true)
        .order('full_name');

      if (error) throw error;
      
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load member directory');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.major?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by voice part
    if (selectedVoicePart !== 'all') {
      filtered = filtered.filter(member => member.voice_part === selectedVoicePart);
    }

    setFilteredMembers(filtered);
  };

  const getVoicePartColor = (voicePart: string | null) => {
    switch (voicePart?.toLowerCase()) {
      case 'soprano': return 'bg-pink-100 text-pink-800';
      case 'alto': return 'bg-purple-100 text-purple-800';
      case 'tenor': return 'bg-blue-100 text-blue-800';
      case 'bass': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'member': return 'bg-blue-100 text-blue-800';
      case 'alumna': return 'bg-gold-100 text-gold-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const uniqueVoiceParts = [...new Set(members.map(m => m.voice_part).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="w-8 h-8 mx-auto mb-2 animate-pulse text-primary" />
          <p>Loading member directory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-2">Member Directory</p>
        <p className="text-sm">Please log in to view the member directory</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Member Directory</h3>
          <Badge variant="secondary">{filteredMembers.length} members</Badge>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedVoicePart('all')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedVoicePart === 'all' 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              All Parts
            </button>
            {uniqueVoiceParts.map(part => (
              <button
                key={part}
                onClick={() => setSelectedVoicePart(part!)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedVoicePart === part 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {part}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3" />
              <p>No members found matching your search</p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm truncate">{member.full_name}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1 items-end">
                          <Badge variant="outline" className={getRoleColor(member.role)}>
                            {member.role}
                          </Badge>
                          {member.voice_part && (
                            <Badge variant="outline" className={getVoicePartColor(member.voice_part)}>
                              <Music className="w-3 h-3 mr-1" />
                              {member.voice_part}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        {member.major && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{member.major}</span>
                            {member.graduation_year && (
                              <span className="text-xs text-muted-foreground">• Class of {member.graduation_year}</span>
                            )}
                          </div>
                        )}
                        
                        {member.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{member.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};