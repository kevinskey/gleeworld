import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useUserRole } from '@/hooks/useUserRole';
import { useCourseGroups, useCourseGroupMembers, type CourseGroup } from '@/hooks/useCourseGroups';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Users, Crown, UserPlus, ChevronRight, ArrowLeft } from 'lucide-react';

const GROUP_TYPES = [
  { value: 'sectional', label: 'Sectional' },
  { value: 'study', label: 'Study Group' },
  { value: 'ensemble', label: 'Sub-Ensemble' },
  { value: 'project', label: 'Project Group' },
  { value: 'other', label: 'Other' },
];

interface CourseGroupsProps {
  courseId: string;
  courseName?: string;
}

export const CourseGroups = ({ courseId, courseName }: CourseGroupsProps) => {
  const { isAdmin } = useUserRole();
  const canManage = isAdmin();
  const { groups, loading, createGroup, deleteGroup } = useCourseGroups(courseId);
  const [selectedGroup, setSelectedGroup] = useState<CourseGroup | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (selectedGroup) {
    return (
      <CourseGroupDetail
        group={selectedGroup}
        canManage={canManage}
        onBack={() => setSelectedGroup(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Groups</h2>
          <p className="text-sm text-muted-foreground">
            {courseName ? `Sub-groups for ${courseName}` : 'Sub-groups within this course'}
          </p>
        </div>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <CreateGroupDialog
              onSubmit={async (payload) => {
                const created = await createGroup(payload);
                if (created) setCreateOpen(false);
              }}
            />
          </Dialog>
        )}
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No groups yet.</p>
            {canManage && (
              <p className="text-sm mt-2">Create one to organize sectionals, study groups, or sub-ensembles.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Card
              key={g.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedGroup(g)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex-1">{g.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {g.group_type}
                  </Badge>
                </div>
                {g.description && (
                  <CardDescription className="line-clamp-2">{g.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {g.member_count || 0}
                      {g.max_members ? ` / ${g.max_members}` : ''}
                    </span>
                    {g.leader_name && (
                      <span className="flex items-center gap-1">
                        <Crown className="h-4 w-4 text-amber-500" />
                        {g.leader_name}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                {canManage && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete group "${g.name}"?`)) {
                          deleteGroup(g.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

interface CreateGroupDialogProps {
  onSubmit: (payload: {
    name: string;
    description?: string | null;
    group_type?: string;
    max_members?: number | null;
  }) => Promise<void>;
}

const CreateGroupDialog = ({ onSubmit }: CreateGroupDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState('sectional');
  const [maxMembers, setMaxMembers] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        group_type: groupType,
        max_members: maxMembers ? Number(maxMembers) : null,
      });
      setName('');
      setDescription('');
      setGroupType('sectional');
      setMaxMembers('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Group</DialogTitle>
        <DialogDescription>Add a sub-group to this course.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="group-name">Name *</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Soprano Sectional, Brass Quartet, Tour Crew..."
          />
        </div>
        <div>
          <Label htmlFor="group-type">Type</Label>
          <Select value={groupType} onValueChange={setGroupType}>
            <SelectTrigger id="group-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="group-desc">Description</Label>
          <Textarea
            id="group-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="group-max">Max members</Label>
          <Input
            id="group-max"
            type="number"
            min="1"
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            placeholder="Leave blank for no limit"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={!name.trim() || submitting}>
          {submitting ? 'Creating...' : 'Create Group'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

interface CourseGroupDetailProps {
  group: CourseGroup;
  canManage: boolean;
  onBack: () => void;
}

const CourseGroupDetail = ({ group, canManage, onBack }: CourseGroupDetailProps) => {
  const { members, loading, addMember, removeMember, setMemberRole } = useCourseGroupMembers(group.id);
  const [addOpen, setAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10);
      const existingIds = new Set(members.map((m) => m.member_id));
      setSearchResults((data || []).filter((u: any) => !existingIds.has(u.user_id)) as any);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Groups
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{group.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="capitalize">
              {group.group_type}
            </Badge>
            {group.max_members && (
              <span className="text-sm text-muted-foreground">
                Capacity: {members.length} / {group.max_members}
              </span>
            )}
          </div>
          {group.description && <p className="text-muted-foreground mt-2">{group.description}</p>}
        </div>
        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member to {group.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }}
                />
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {searching && <p className="text-sm text-muted-foreground p-2">Searching...</p>}
                  {!searching && searchResults.length === 0 && searchTerm.length >= 2 && (
                    <p className="text-sm text-muted-foreground p-2">No matching users.</p>
                  )}
                  {searchResults.map((u) => (
                    <div
                      key={u.user_id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                    >
                      <div>
                        <div className="font-medium text-sm">{u.full_name || u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const ok = await addMember(u.user_id, 'member');
                            if (ok) {
                              setSearchTerm('');
                              setSearchResults([]);
                            }
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={async () => {
                            const ok = await addMember(u.user_id, 'leader');
                            if (ok) {
                              setSearchTerm('');
                              setSearchResults([]);
                            }
                          }}
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          Leader
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No members yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {m.role === 'leader' && <Crown className="h-4 w-4 text-amber-500" />}
                    <div>
                      <div className="font-medium">{m.full_name || m.email}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{m.email}</span>
                        {m.voice_part && <Badge variant="outline" className="text-xs">{m.voice_part}</Badge>}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMemberRole(m.id, m.role === 'leader' ? 'member' : 'leader')}
                      >
                        {m.role === 'leader' ? 'Demote' : 'Make Leader'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Remove ${m.full_name || m.email} from group?`)) {
                            removeMember(m.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
