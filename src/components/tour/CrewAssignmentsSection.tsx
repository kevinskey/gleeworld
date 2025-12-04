import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, Truck, ShoppingBag, Settings, Shirt, Music } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CrewMember {
  name: string;
  role: string;
  voicePart: string;
  avatar?: string;
}

interface CrewGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  lead?: string;
  members: CrewMember[];
}

const crewGroups: CrewGroup[] = [
  {
    id: 'merch',
    name: 'Merchandise Crew',
    icon: <ShoppingBag className="h-5 w-5" />,
    description: 'Handles merchandise setup, sales, and inventory during tour stops.',
    lead: 'Member Lead Name',
    members: [
      { name: 'Member 1', role: 'Table Setup', voicePart: 'Soprano I' },
      { name: 'Member 2', role: 'Cash Handler', voicePart: 'Alto I' },
      { name: 'Member 3', role: 'Inventory', voicePart: 'Soprano II' },
      { name: 'Member 4', role: 'Customer Service', voicePart: 'Alto II' },
    ]
  },
  {
    id: 'setup',
    name: 'Setup Crew',
    icon: <Settings className="h-5 w-5" />,
    description: 'Responsible for stage setup, risers, and equipment arrangement.',
    lead: 'Setup Lead Name',
    members: [
      { name: 'Member 5', role: 'Riser Setup', voicePart: 'Alto I' },
      { name: 'Member 6', role: 'Riser Setup', voicePart: 'Soprano II' },
      { name: 'Member 7', role: 'Equipment', voicePart: 'Alto II' },
      { name: 'Member 8', role: 'Equipment', voicePart: 'Soprano I' },
    ]
  },
  {
    id: 'wardrobe',
    name: 'Wardrobe Crew',
    icon: <Shirt className="h-5 w-5" />,
    description: 'Manages concert attire distribution and organization.',
    lead: 'Wardrobe Lead Name',
    members: [
      { name: 'Member 9', role: 'Attire Check', voicePart: 'Soprano I' },
      { name: 'Member 10', role: 'Accessories', voicePart: 'Alto I' },
    ]
  },
  {
    id: 'music',
    name: 'Music Crew',
    icon: <Music className="h-5 w-5" />,
    description: 'Handles music folder distribution and organization.',
    lead: 'Librarian Name',
    members: [
      { name: 'Member 11', role: 'Folder Distribution', voicePart: 'Alto II' },
      { name: 'Member 12', role: 'Music Stand Setup', voicePart: 'Soprano II' },
    ]
  },
];

export const CrewAssignmentsSection = () => {
  return (
    <Tabs defaultValue="merch" className="space-y-6">
      <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto gap-2 bg-transparent p-0">
        {crewGroups.map((group) => (
          <TabsTrigger
            key={group.id}
            value={group.id}
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border"
          >
            {group.icon}
            <span className="hidden sm:inline">{group.name.split(' ')[0]}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {crewGroups.map((group) => (
        <TabsContent key={group.id} value={group.id}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {group.icon}
                </div>
                <div>
                  <CardTitle>{group.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {group.lead && (
                <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-primary">Crew Lead: {group.lead}</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {group.members.map((member, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                        <span className="text-xs text-muted-foreground">{member.voicePart}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
};
