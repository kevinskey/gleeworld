import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

export const PrayerRotations = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Mock data for now
  const rotations = [
    {
      id: 1,
      type: "Concert Prayer",
      members: ["Sarah Johnson", "Maria Davis"],
      date: "2024-08-01T19:00",
      focus: "Success and calm nerves for tonight's performance"
    },
    {
      id: 2,
      type: "Travel Prayer",
      members: ["Grace Williams", "Aisha Thompson"],
      date: "2024-08-05T08:00",
      focus: "Safe travels to Atlanta performance"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Prayer rotation scheduled successfully');
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prayer Rotations</h3>
          <p className="text-sm text-muted-foreground">Organize prayer schedules and spiritual support</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Prayer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Prayer Rotation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Prayer Type</label>
                <select className="w-full p-2 border rounded-md">
                  <option value="concert_prayer">Concert Prayer</option>
                  <option value="rehearsal_prayer">Rehearsal Prayer</option>
                  <option value="travel_prayer">Travel Prayer</option>
                  <option value="special_intention">Special Intention</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Assigned Members</label>
                <Input placeholder="Enter member names separated by commas" required />
              </div>
              <div>
                <label className="text-sm font-medium">Schedule Date</label>
                <Input type="datetime-local" required />
              </div>
              <div>
                <label className="text-sm font-medium">Prayer Focus (Optional)</label>
                <Input placeholder="e.g., Concert success, Safe travels, Member healing" />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea placeholder="Additional instructions or prayer requests..." rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Schedule Prayer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rotations.map((rotation) => (
          <Card key={rotation.id} className="border-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {rotation.type}
                  </CardTitle>
                  <Badge variant="outline" className="text-blue-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Upcoming
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(rotation.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(rotation.date).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-1">Assigned Members:</h4>
                  <div className="flex flex-wrap gap-2">
                    {rotation.members.map((member, index) => (
                      <Badge key={index} variant="secondary">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Prayer Focus:</h4>
                  <p className="text-sm text-muted-foreground">{rotation.focus}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};