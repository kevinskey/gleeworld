import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bed, Users, Building2, Plus, Trash2, UserPlus, X, Save,
  ChevronRight, Search, ArrowLeft, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useRoomAssignments, RoomAssignment, TourHotel } from "@/hooks/useRoomAssignments";
import { format } from "date-fns";

export const RoomingAssignmentsSection = () => {
  const {
    rooms, hotels, members, loading,
    createRoom, updateRoom, deleteRoom, addOccupant, removeOccupant,
  } = useRoomAssignments();

  const [selectedHotel, setSelectedHotel] = useState<TourHotel | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [formData, setFormData] = useState({
    room_number: "",
    floor: "",
    room_type: "double",
    max_occupants: 2,
    notes: "",
  });
  const [batchCount, setBatchCount] = useState(5);
  const [batchStartNumber, setBatchStartNumber] = useState("101");
  const [batchFloor, setBatchFloor] = useState("");
  const [batchType, setBatchType] = useState("double");
  const [batchMaxOccupants, setBatchMaxOccupants] = useState(2);

  const resetForm = () => {
    setFormData({ room_number: "", floor: "", room_type: "double", max_occupants: 2, notes: "" });
  };

  // All assigned user IDs across ALL hotels
  const assignedUserIds = useMemo(
    () => new Set(rooms.flatMap((r) => r.occupants.map((o) => o.user_id))),
    [rooms]
  );

  // Rooms for selected hotel
  const hotelRooms = useMemo(
    () => (selectedHotel ? rooms.filter((r) => r.hotel_id === selectedHotel.id) : []),
    [rooms, selectedHotel]
  );

  // Unassigned members for selected hotel
  const unassignedMembers = useMemo(() => {
    const hotelAssigned = new Set(hotelRooms.flatMap((r) => r.occupants.map((o) => o.user_id)));
    return members.filter(
      (m) => !hotelAssigned.has(m.user_id) && (
        !memberSearch ||
        m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.voice_part?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    );
  }, [members, hotelRooms, memberSearch]);

  // Stats per hotel
  const hotelStats = useMemo(() => {
    const map: Record<string, { roomCount: number; occupants: number; capacity: number }> = {};
    for (const hotel of hotels) {
      const hRooms = rooms.filter((r) => r.hotel_id === hotel.id);
      map[hotel.id] = {
        roomCount: hRooms.length,
        occupants: hRooms.reduce((s, r) => s + r.occupants.length, 0),
        capacity: hRooms.reduce((s, r) => s + r.max_occupants, 0),
      };
    }
    return map;
  }, [hotels, rooms]);

  const handleCreate = async () => {
    if (!formData.room_number || !selectedHotel) return;
    const success = await createRoom({
      hotel_id: selectedHotel.id,
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

  const handleBatchCreate = async () => {
    if (!selectedHotel) return;
    const startNum = parseInt(batchStartNumber, 10);
    if (isNaN(startNum)) return;
    for (let i = 0; i < batchCount; i++) {
      await createRoom({
        hotel_id: selectedHotel.id,
        room_number: String(startNum + i),
        floor: batchFloor || undefined,
        room_type: batchType,
        max_occupants: batchMaxOccupants,
      });
    }
    setShowBatchDialog(false);
  };

  const handleQuickAssign = async (roomId: string, userId: string) => {
    await addOccupant(roomId, userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ─── No hotels yet ───
  if (hotels.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium text-foreground mb-1">No Hotels Added Yet</p>
        <p className="text-sm text-muted-foreground">
          Go to the <strong>Hotels</strong> tab first to add tour hotels, then return here to set up rooms.
        </p>
      </Card>
    );
  }

  // ─── Hotel picker (no hotel selected) ───
  if (!selectedHotel) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a hotel to manage its room assignments.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {hotels.map((hotel) => {
            const stats = hotelStats[hotel.id] || { roomCount: 0, occupants: 0, capacity: 0 };
            const isFull = stats.capacity > 0 && stats.occupants >= stats.capacity;
            const hasRooms = stats.roomCount > 0;
            return (
              <button
                key={hotel.id}
                onClick={() => { setSelectedHotel(hotel); setMemberSearch(""); }}
                className="text-left rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">{hotel.hotel_name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {hotel.city}{hotel.state ? `, ${hotel.state}` : ""}
                  {hotel.check_in_date && (
                    <> · {format(new Date(hotel.check_in_date), "MMM d")}
                      {hotel.check_out_date && <>–{format(new Date(hotel.check_out_date), "MMM d")}</>}
                    </>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  {hasRooms ? (
                    <>
                      <Badge variant={isFull ? "default" : "secondary"} className="text-[11px] gap-1">
                        <Bed className="h-3 w-3" /> {stats.roomCount} rooms
                      </Badge>
                      <Badge variant="outline" className="text-[11px] gap-1">
                        <Users className="h-3 w-3" /> {stats.occupants}/{stats.capacity}
                      </Badge>
                      {isFull && (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="text-[11px] gap-1 text-destructive border-destructive/30">
                      <AlertCircle className="h-3 w-3" /> No rooms yet
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Global stats */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span><strong className="text-foreground">{members.length}</strong> roster members</span>
          <span><strong className="text-foreground">{assignedUserIds.size}</strong> assigned</span>
          <span><strong className="text-foreground">{members.length - assignedUserIds.size}</strong> unassigned</span>
        </div>
      </div>
    );
  }

  // ─── Hotel selected: room management view ───
  const stats = hotelStats[selectedHotel.id] || { roomCount: 0, occupants: 0, capacity: 0 };
  const availableRooms = hotelRooms.filter((r) => r.occupants.length < r.max_occupants);

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedHotel(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{selectedHotel.hotel_name}</h3>
          <p className="text-xs text-muted-foreground">
            {selectedHotel.city}{selectedHotel.state ? `, ${selectedHotel.state}` : ""}
            {selectedHotel.check_in_date && (
              <> · {format(new Date(selectedHotel.check_in_date), "MMM d")}
                {selectedHotel.check_out_date && <>–{format(new Date(selectedHotel.check_out_date), "MMM d")}</>}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="secondary" className="gap-1">
          <Bed className="h-3 w-3" /> {stats.roomCount} rooms
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" /> {stats.occupants}/{stats.capacity} filled
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowBatchDialog(true)} className="text-xs h-8">
            <Plus className="h-3 w-3 mr-1" /> Batch Add
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowCreateDialog(true); }} className="text-xs h-8">
            <Plus className="h-3 w-3 mr-1" /> Add Room
          </Button>
        </div>
      </div>

      {/* Two-column layout: Rooms + Unassigned Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rooms (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          {hotelRooms.length === 0 ? (
            <Card className="p-8 text-center">
              <Bed className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No rooms created yet for this hotel.
              </p>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowBatchDialog(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Batch Add Rooms
                </Button>
                <Button size="sm" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                  <Plus className="h-3 w-3 mr-1" /> Add Single Room
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {hotelRooms.map((room) => {
                const isFull = room.occupants.length >= room.max_occupants;
                return (
                  <Card key={room.id} className="overflow-hidden">
                    {/* Room header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">Room {room.room_number}</span>
                        <Badge variant="outline" className="text-[10px] capitalize h-5">{room.room_type}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-medium ${isFull ? 'text-primary' : 'text-muted-foreground'}`}>
                          {room.occupants.length}/{room.max_occupants}
                        </span>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRoom(room.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-3 space-y-2">
                      {/* Occupants */}
                      {room.occupants.map((occ) => (
                        <div key={occ.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={occ.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10">
                              {(occ.profile?.full_name || "??").split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground">
                              {occ.profile?.full_name || "Unknown"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{occ.profile?.voice_part || "—"}</p>
                          </div>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => removeOccupant(occ.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}

                      {/* Empty bed slots */}
                      {Array.from({ length: room.max_occupants - room.occupants.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex items-center gap-2 p-1.5 rounded-lg border border-dashed border-muted-foreground/20 text-muted-foreground/40">
                          <div className="h-7 w-7 rounded-full border border-dashed border-muted-foreground/20 flex items-center justify-center">
                            <UserPlus className="h-3 w-3" />
                          </div>
                          <span className="text-xs">Empty bed</span>
                        </div>
                      ))}

                      {room.notes && (
                        <p className="text-[11px] text-muted-foreground pt-1 border-t border-dashed">{room.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Unassigned Members Pool (1/3 width) */}
        <div className="space-y-3">
          <div className="sticky top-0">
            <Card>
              <div className="px-3 py-2 border-b bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Unassigned Members</span>
                  <Badge variant="secondary" className="text-[11px]">{unassignedMembers.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name or part..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-7 h-8 text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="max-h-[400px]">
                <div className="p-2 space-y-1">
                  {unassignedMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {memberSearch ? "No matches" : "Everyone is assigned! 🎉"}
                    </p>
                  ) : (
                    unassignedMembers.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 group">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10">
                            {(m.full_name || "??").split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{m.full_name || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">{m.voice_part || "—"}</p>
                        </div>
                        {/* Quick-assign dropdown */}
                        {availableRooms.length > 0 && (
                          <Select onValueChange={(roomId) => handleQuickAssign(roomId, m.user_id)}>
                            <SelectTrigger className="h-7 w-auto min-w-0 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity border-primary/30">
                              <Plus className="h-3 w-3" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRooms.map((r) => (
                                <SelectItem key={r.id} value={r.id} className="text-xs">
                                  Room {r.room_number} ({r.occupants.length}/{r.max_occupants})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Single Room Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Room — {selectedHotel.hotel_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Room Number *</Label>
                <Input
                  value={formData.room_number}
                  onChange={(e) => setFormData((p) => ({ ...p, room_number: e.target.value }))}
                  placeholder="e.g. 204"
                  className="text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Floor</Label>
                <Input
                  value={formData.floor}
                  onChange={(e) => setFormData((p) => ({ ...p, floor: e.target.value }))}
                  placeholder="e.g. 2nd"
                  className="text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Room Type</Label>
                <Select value={formData.room_type} onValueChange={(v) => setFormData((p) => ({ ...p, room_type: v }))}>
                  <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="suite">Suite</SelectItem>
                    <SelectItem value="accessible">Accessible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Max Occupants</Label>
                <Input
                  type="number" min={1} max={6}
                  value={formData.max_occupants}
                  onChange={(e) => setFormData((p) => ({ ...p, max_occupants: parseInt(e.target.value) || 2 }))}
                  className="text-base"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any special notes..."
                className="text-base"
              />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!formData.room_number}>
              <Save className="h-4 w-4 mr-2" />
              Create Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Create Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Batch Add Rooms — {selectedHotel.hotel_name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Quickly create multiple rooms with sequential numbers.
          </p>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Starting Room #</Label>
                <Input
                  value={batchStartNumber}
                  onChange={(e) => setBatchStartNumber(e.target.value)}
                  placeholder="101"
                  className="text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">How Many</Label>
                <Input
                  type="number" min={1} max={30}
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                  className="text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Floor</Label>
                <Input
                  value={batchFloor}
                  onChange={(e) => setBatchFloor(e.target.value)}
                  placeholder="e.g. 2"
                  className="text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Type</Label>
                <Select value={batchType} onValueChange={setBatchType}>
                  <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="suite">Suite</SelectItem>
                    <SelectItem value="accessible">Accessible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Max Occ.</Label>
                <Input
                  type="number" min={1} max={6}
                  value={batchMaxOccupants}
                  onChange={(e) => setBatchMaxOccupants(parseInt(e.target.value) || 2)}
                  className="text-base"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              This will create rooms <strong>{batchStartNumber}</strong> through <strong>{parseInt(batchStartNumber, 10) + batchCount - 1 || "?"}</strong>
            </p>
            <Button className="w-full" onClick={handleBatchCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create {batchCount} Rooms
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
