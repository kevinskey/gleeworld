import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bed, Users, Building2, Plus, Trash2, UserPlus, Edit, Save, X } from "lucide-react";
import { useRoomAssignments, RoomAssignment } from "@/hooks/useRoomAssignments";
import { format } from "date-fns";

export const RoomingAssignmentsSection = () => {
  const {
    rooms, hotels, members, loading,
    createRoom, updateRoom, deleteRoom, addOccupant, removeOccupant,
  } = useRoomAssignments();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [filterHotel, setFilterHotel] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    hotel_id: '' as string,
    room_number: '',
    floor: '',
    room_type: 'standard',
    max_occupants: 2,
    notes: '',
  });

  const resetForm = () => {
    setFormData({ hotel_id: '', room_number: '', floor: '', room_type: 'standard', max_occupants: 2, notes: '' });
  };

  const handleCreate = async () => {
    if (!formData.room_number) return;
    const success = await createRoom({
      hotel_id: formData.hotel_id || null,
      room_number: formData.room_number,
      floor: formData.floor || undefined,
      room_type: formData.room_type,
      max_occupants: formData.max_occupants,
      notes: formData.notes || undefined,
    });
    if (success) {
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const handleAddOccupant = async (roomId: string) => {
    if (!selectedMember) return;
    await addOccupant(roomId, selectedMember);
    setSelectedMember('');
    setAddingMemberTo(null);
  };

  // Get all assigned user IDs to prevent double-assignment
  const assignedUserIds = new Set(rooms.flatMap(r => r.occupants.map(o => o.user_id)));

  const filteredRooms = filterHotel === 'all' ? rooms : rooms.filter(r => r.hotel_id === filterHotel);

  // Group rooms by hotel
  const roomsByHotel = filteredRooms.reduce<Record<string, RoomAssignment[]>>((acc, room) => {
    const key = room.hotel?.hotel_name || 'Unassigned Hotel';
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {hotels.length > 0 && (
            <Select value={filterHotel} onValueChange={setFilterHotel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by hotel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hotels</SelectItem>
                {hotels.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.hotel_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle style={{ color: '#0f172a' }}>Add Room Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label style={{ color: '#0f172a' }}>Hotel</Label>
                <Select value={formData.hotel_id} onValueChange={v => setFormData(p => ({ ...p, hotel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select hotel" /></SelectTrigger>
                  <SelectContent>
                    {hotels.map(h => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.hotel_name} — {h.city}{h.state ? `, ${h.state}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label style={{ color: '#0f172a' }}>Room Number *</Label>
                  <Input 
                    value={formData.room_number} 
                    onChange={e => setFormData(p => ({ ...p, room_number: e.target.value }))} 
                    placeholder="e.g. 204"
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: '#0f172a' }}>Floor</Label>
                  <Input 
                    value={formData.floor} 
                    onChange={e => setFormData(p => ({ ...p, floor: e.target.value }))} 
                    placeholder="e.g. 2nd"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label style={{ color: '#0f172a' }}>Room Type</Label>
                  <Select value={formData.room_type} onValueChange={v => setFormData(p => ({ ...p, room_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                      <SelectItem value="suite">Suite</SelectItem>
                      <SelectItem value="accessible">Accessible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: '#0f172a' }}>Max Occupants</Label>
                  <Input 
                    type="number" min={1} max={6}
                    value={formData.max_occupants} 
                    onChange={e => setFormData(p => ({ ...p, max_occupants: parseInt(e.target.value) || 2 }))} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#0f172a' }}>Notes</Label>
                <Textarea 
                  value={formData.notes} 
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} 
                  placeholder="Any special notes..."
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!formData.room_number}>
                <Save className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {rooms.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-card">
            <CardContent className="p-4 text-center">
              <Bed className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{rooms.length}</p>
              <p className="text-xs text-muted-foreground">Total Rooms</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-card">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{assignedUserIds.size}</p>
              <p className="text-xs text-muted-foreground">Members Assigned</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-card">
            <CardContent className="p-4 text-center">
              <Building2 className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{new Set(rooms.map(r => r.hotel_id).filter(Boolean)).size}</p>
              <p className="text-xs text-muted-foreground">Hotels</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-card">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{members.length - assignedUserIds.size}</p>
              <p className="text-xs text-muted-foreground">Unassigned</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Room Cards by Hotel */}
      {rooms.length === 0 ? (
        <Card className="p-8 text-center bg-white dark:bg-card">
          <Bed className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">No room assignments yet.</p>
          <p className="text-sm text-muted-foreground mb-4">
            {hotels.length === 0 
              ? 'Add hotels first in Hotel Management, then create room assignments here.'
              : 'Click "Add Room" to create your first room assignment.'}
          </p>
        </Card>
      ) : (
        Object.entries(roomsByHotel).map(([hotelName, hotelRooms]) => {
          const hotelInfo = hotelRooms[0]?.hotel;
          return (
            <div key={hotelName} className="space-y-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold" style={{ color: '#0f172a' }}>{hotelName}</p>
                      {hotelInfo?.check_in_date && hotelInfo?.check_out_date && (
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(hotelInfo.check_in_date), 'MMM dd')} — {format(new Date(hotelInfo.check_out_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-auto">{hotelRooms.length} rooms</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hotelRooms.map((room) => (
                  <Card key={room.id} className="overflow-hidden bg-white dark:bg-card">
                    <CardHeader className="bg-primary/5 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#0f172a' }}>
                          <Bed className="h-4 w-4" />
                          Room {room.room_number}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="capitalize">{room.room_type}</Badge>
                          {room.floor && <Badge variant="secondary">{room.floor}</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {room.occupants.length}/{room.max_occupants} Occupants
                          </span>
                          <div className="flex gap-1">
                            {room.occupants.length < room.max_occupants && (
                              <Button 
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setAddingMemberTo(room.id); setSelectedMember(''); }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteRoom(room.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Add Member UI */}
                        {addingMemberTo === room.id && (
                          <div className="flex gap-2 items-end">
                            <Select value={selectedMember} onValueChange={setSelectedMember}>
                              <SelectTrigger className="flex-1 text-base">
                                <SelectValue placeholder="Select member" />
                              </SelectTrigger>
                              <SelectContent>
                                {members
                                  .filter(m => !assignedUserIds.has(m.user_id))
                                  .map(m => (
                                    <SelectItem key={m.user_id} value={m.user_id}>
                                      {m.full_name || 'Unknown'} {m.voice_part ? `(${m.voice_part})` : ''}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => handleAddOccupant(room.id)} disabled={!selectedMember}>
                              Add
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingMemberTo(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Occupants List */}
                        <div className="space-y-2">
                          {room.occupants.map((occupant) => (
                            <div key={occupant.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={occupant.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10">
                                  {(occupant.profile?.full_name || '??').split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>
                                  {occupant.profile?.full_name || 'Unknown Member'}
                                </p>
                                <p className="text-xs text-muted-foreground">{occupant.profile?.voice_part || '—'}</p>
                              </div>
                              <Button 
                                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeOccupant(occupant.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {room.occupants.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">No members assigned</p>
                          )}
                        </div>

                        {room.notes && (
                          <div className="pt-2 border-t text-xs text-muted-foreground">
                            <p>{room.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      <p className="text-sm text-muted-foreground text-center">
        Room assignments are subject to change. Contact your Section Leader with any concerns.
      </p>
    </div>
  );
};
