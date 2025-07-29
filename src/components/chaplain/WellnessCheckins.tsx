import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Heart, AlertTriangle, CheckCircle, User } from "lucide-react";
import { toast } from "sonner";

export const WellnessCheckins = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock data for now
  const checkins = [
    {
      id: "1",
      member_id: "Sarah Johnson",
      wellness_level: "good",
      notes: "Seems well-rested and positive. Mentioned feeling grateful for the upcoming concert opportunity.",
      follow_up_needed: false,
      created_at: "2024-07-30T14:30:00Z"
    },
    {
      id: "2", 
      member_id: "Maria Davis",
      wellness_level: "struggling",
      notes: "Appears stressed about upcoming midterms and balancing rehearsal schedule. Discussed time management strategies.",
      follow_up_needed: true,
      follow_up_notes: "Check in next week about study schedule and offer additional support if needed.",
      created_at: "2024-07-29T16:00:00Z"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Wellness check-in recorded successfully');
    setIsDialogOpen(false);
  };

  const getWellnessLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'struggling': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWellnessIcon = (level: string) => {
    switch (level) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />;
      case 'good': return <Heart className="h-4 w-4" />;
      case 'fair': return <AlertTriangle className="h-4 w-4" />;
      case 'struggling': return <AlertTriangle className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Wellness Check-ins</h3>
          <p className="text-sm text-muted-foreground">Monitor member wellbeing and provide pastoral care</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Check-in
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Wellness Check-in</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Member</label>
                <Input placeholder="Enter member name or ID" required />
              </div>
              <div>
                <label className="text-sm font-medium">Wellness Level</label>
                <select className="w-full p-2 border rounded-md">
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="struggling">Struggling</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Record any observations, concerns, or conversations..."
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="follow_up_needed" />
                <label htmlFor="follow_up_needed" className="text-sm font-medium">
                  Follow-up needed
                </label>
              </div>
              <div>
                <label className="text-sm font-medium">Follow-up Notes</label>
                <Textarea
                  placeholder="Describe what follow-up is needed..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Record Check-in</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {checkins.map((checkin) => (
          <Card key={checkin.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {checkin.member_id}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getWellnessLevelColor(checkin.wellness_level)}>
                      {getWellnessIcon(checkin.wellness_level)}
                      <span className="ml-1 capitalize">{checkin.wellness_level}</span>
                    </Badge>
                    {checkin.follow_up_needed && (
                      <Badge variant="outline" className="text-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Follow-up needed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {checkin.notes && (
                <div className="mb-4">
                  <h4 className="font-medium mb-1">Notes:</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {checkin.notes}
                  </p>
                </div>
              )}
              {checkin.follow_up_needed && checkin.follow_up_notes && (
                <div className="mb-4">
                  <h4 className="font-medium mb-1">Follow-up needed:</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {checkin.follow_up_notes}
                  </p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Recorded on {new Date(checkin.created_at).toLocaleDateString()} at {new Date(checkin.created_at).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};