import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RecipientGroup, RECIPIENT_GROUPS } from '@/types/communication';
import { GroupManagement } from './GroupManagement';
import { Users, Search, UserCheck, Settings } from 'lucide-react';

interface RecipientSelectorProps {
  selectedGroups: RecipientGroup[];
  onGroupToggle: (group: RecipientGroup) => void;
  recipientCount: number;
}

export const RecipientSelector = ({
  selectedGroups,
  onGroupToggle,
  recipientCount
}: RecipientSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customGroups, setCustomGroups] = useState<RecipientGroup[]>([]);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  
  const allGroups = [...RECIPIENT_GROUPS, ...customGroups];

  const groupedRecipients = allGroups.reduce((acc, group) => {
    if (!acc[group.type]) {
      acc[group.type] = [];
    }
    acc[group.type].push(group);
    return acc;
  }, {} as Record<string, RecipientGroup[]>);

  const filteredGroups = Object.entries(groupedRecipients).reduce((acc, [type, groups]) => {
    const filtered = groups.filter(group => 
      group.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[type] = filtered;
    }
    return acc;
  }, {} as Record<string, RecipientGroup[]>);

  const getTabLabel = (type: string) => {
    const labels = {
      'role': 'Roles',
      'voice_part': 'Voice Parts',
      'academic_year': 'Academic Year',
      'special': 'Special Groups'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTabIcon = (type: string) => {
    return type === 'role' ? '👥' : 
           type === 'voice_part' ? '🎵' : 
           type === 'academic_year' ? '🎓' : '⭐';
  };

  const handleGroupAdd = (group: RecipientGroup) => {
    setCustomGroups(prev => [...prev, group]);
  };

  const handleGroupEdit = (group: RecipientGroup) => {
    setCustomGroups(prev => prev.map(g => g.id === group.id ? group : g));
  };

  const handleGroupDelete = (groupId: string) => {
    setCustomGroups(prev => prev.filter(g => g.id !== groupId));
    // Also remove from selected groups if it was selected
    const groupToRemove = customGroups.find(g => g.id === groupId);
    if (groupToRemove && selectedGroups.some(g => g.id === groupId)) {
      onGroupToggle(groupToRemove);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Recipients
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-normal">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">
                {recipientCount} selected
              </span>
            </div>
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Groups
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Manage Recipient Groups</DialogTitle>
                </DialogHeader>
                <GroupManagement
                  groups={customGroups}
                  onGroupAdd={handleGroupAdd}
                  onGroupEdit={handleGroupEdit}
                  onGroupDelete={handleGroupDelete}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recipient groups..."
            className="pl-10"
          />
        </div>

        {/* Selected Groups Preview */}
        {selectedGroups.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Groups:</h4>
            <div className="flex flex-wrap gap-1">
              {selectedGroups.map((group) => (
                <Badge
                  key={group.id}
                  variant="default"
                  className="cursor-pointer hover:bg-destructive"
                  onClick={() => onGroupToggle(group)}
                >
                  {group.label} ×
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Group Selection Tabs */}
        <Tabs defaultValue="role" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {Object.keys(filteredGroups).map((type) => (
              <TabsTrigger key={type} value={type} className="text-xs">
                <span className="mr-1">{getTabIcon(type)}</span>
                {getTabLabel(type)}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(filteredGroups).map(([type, groups]) => (
            <TabsContent key={type} value={type} className="mt-4">
              <div className="grid grid-cols-1 gap-3">
                {groups.map((group) => (
                  <div 
                    key={group.id} 
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={group.id}
                      checked={selectedGroups.some(g => g.id === group.id)}
                      onCheckedChange={() => onGroupToggle(group)}
                    />
                    <label
                      htmlFor={group.id}
                      className="flex-1 text-sm font-medium cursor-pointer"
                    >
                      {group.label}
                    </label>
                    {group.count && (
                      <span className="text-xs text-muted-foreground">
                        {group.count} members
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};