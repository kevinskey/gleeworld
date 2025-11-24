import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  voice_part?: string;
}

interface UserSearchProps {
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onSelectUser, onClose }) => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.voice_part?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, avatar_url, voice_part')
        .neq('user_id', currentUser.id)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col max-h-[70vh] overflow-hidden">
      {/* Search */}
      <div className="pb-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="max-h-[60vh] pr-2">
        {loading ? (
          <div className="text-center py-8 text-foreground">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No users found' : 'No members available'}
          </div>
        ) : (
          <div className="space-y-1 pb-2">
            {filteredUsers.map((user) => (
              <button
                key={user.user_id}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm truncate">
                    {user.full_name}
                  </div>
                  {user.voice_part && (
                    <div className="text-xs text-muted-foreground">
                      {user.voice_part}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
