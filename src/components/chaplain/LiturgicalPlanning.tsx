import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Plus, Download, Loader2, Book, Cross } from "lucide-react";
import { useUSCCBSync } from "@/hooks/useUSCCBSync";

export const LiturgicalPlanning = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { syncLiturgicalData, liturgicalData, isLoading, error } = useUSCCBSync();
  const events = [
    {
      id: 1,
      title: "Sunday Service Opening",
      date: "2024-08-04",
      time: "11:00 AM",
      location: "Spelman Chapel",
      songs: ["Amazing Grace", "Lift Every Voice and Sing"]
    },
    {
      id: 2,
      title: "Mid-Week Devotional",
      date: "2024-08-07",
      time: "7:00 PM",
      location: "Music Hall",
      songs: ["Be Still My Soul", "How Great Thou Art"]
    }
  ];

  const handleSyncUSCCB = async () => {
    await syncLiturgicalData(selectedDate);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLiturgicalColorClass = (color?: string) => {
    const colorMap: Record<string, string> = {
      'Green': 'bg-green-100 text-green-800 border-green-200',
      'Red': 'bg-red-100 text-red-800 border-red-200',
      'Purple': 'bg-purple-100 text-purple-800 border-purple-200',
      'White': 'bg-gray-100 text-gray-800 border-gray-200',
      'Gold': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return colorMap[color || ''] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Liturgical Planning</h3>
          <p className="text-sm text-muted-foreground">Plan worship services and sync with USCCB daily readings</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Plan Event
        </Button>
      </div>

      {/* USCCB Sync Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cross className="h-5 w-5" />
            Daily Liturgical Readings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="date-select">Select Date</Label>
              <Input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSyncUSCCB} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Sync USCCB
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {liturgicalData && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{formatDate(liturgicalData.date)}</h4>
                <div className="flex gap-2">
                  {liturgicalData.liturgical_color && (
                    <Badge 
                      variant="outline" 
                      className={getLiturgicalColorClass(liturgicalData.liturgical_color)}
                    >
                      {liturgicalData.liturgical_color}
                    </Badge>
                  )}
                  {liturgicalData.season && (
                    <Badge variant="secondary">
                      {liturgicalData.season}
                    </Badge>
                  )}
                </div>
              </div>

              {liturgicalData.title && (
                <div>
                  <h5 className="font-medium text-primary">{liturgicalData.title}</h5>
                </div>
              )}

              {liturgicalData.saint_of_day && (
                <div>
                  <p className="text-sm"><strong>Saint of the Day:</strong> {liturgicalData.saint_of_day}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <h5 className="font-medium flex items-center gap-2">
                  <Book className="h-4 w-4" />
                  Daily Readings
                </h5>
                
                <ScrollArea className="h-64">
                  <div className="space-y-4 pr-4">
                    {liturgicalData.readings.first_reading && (
                      <div className="space-y-2">
                        <h6 className="font-medium text-sm">{liturgicalData.readings.first_reading.title}</h6>
                        <p className="text-sm text-muted-foreground font-medium">
                          {liturgicalData.readings.first_reading.citation}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {liturgicalData.readings.first_reading.content}
                        </p>
                      </div>
                    )}

                    {liturgicalData.readings.responsorial_psalm && (
                      <div className="space-y-2">
                        <h6 className="font-medium text-sm">{liturgicalData.readings.responsorial_psalm.title}</h6>
                        <p className="text-sm text-muted-foreground font-medium">
                          {liturgicalData.readings.responsorial_psalm.citation}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {liturgicalData.readings.responsorial_psalm.content}
                        </p>
                      </div>
                    )}

                    {liturgicalData.readings.second_reading && (
                      <div className="space-y-2">
                        <h6 className="font-medium text-sm">{liturgicalData.readings.second_reading.title}</h6>
                        <p className="text-sm text-muted-foreground font-medium">
                          {liturgicalData.readings.second_reading.citation}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {liturgicalData.readings.second_reading.content}
                        </p>
                      </div>
                    )}

                    {liturgicalData.readings.gospel && (
                      <div className="space-y-2 border-l-4 border-primary pl-3">
                        <h6 className="font-medium text-sm text-primary">{liturgicalData.readings.gospel.title}</h6>
                        <p className="text-sm text-muted-foreground font-medium">
                          {liturgicalData.readings.gospel.citation}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {liturgicalData.readings.gospel.content}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Existing Events Section */}
      <div className="space-y-4">
        <h4 className="font-medium">Planned Events</h4>
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {event.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {event.time}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Planned Songs:</h4>
                  <div className="flex flex-wrap gap-2">
                    {event.songs.map((song, index) => (
                      <span key={index} className="px-2 py-1 bg-muted rounded-md text-sm">
                        {song}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};