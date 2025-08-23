import { useState } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Megaphone, Plus, Edit2, Trash2, Eye, Calendar, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Announcements = () => {
  const navigate = useNavigate();
  const { announcements, loading, deleteAnnouncement } = useAnnouncements();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent": return "bg-red-100 text-red-800 border-red-200";
      case "important": return "bg-orange-100 text-orange-800 border-orange-200";
      case "event": return "bg-blue-100 text-blue-800 border-blue-200";
      case "communication": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Announcements</h1>
              <p className="text-muted-foreground">Manage and view club announcements</p>
            </div>
            <Button onClick={() => navigate('/admin/announcements/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Announcement
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading announcements..." />
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Megaphone className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No announcements yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first announcement to communicate with all members.
              </p>
              <Button onClick={() => navigate('/admin/announcements/new')} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground line-clamp-1">
                          {announcement.title}
                        </h3>
                        {announcement.announcement_type && (
                          <Badge variant="outline" className={getTypeColor(announcement.announcement_type)}>
                            {announcement.announcement_type}
                          </Badge>
                        )}
                        {announcement.is_featured && (
                          <Badge variant="default">Featured</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {announcement.publish_date
                            ? formatDistanceToNow(new Date(announcement.publish_date), { addSuffix: true })
                            : "Draft"
                          }
                        </div>
                        {announcement.target_audience && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {announcement.target_audience}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/announcements/edit/${announcement.id}`)}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(announcement.id)}
                              disabled={deletingId === announcement.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingId === announcement.id ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                    {announcement.content}
                  </p>
                  {announcement.expire_date && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        Expires: {new Date(announcement.expire_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </UniversalLayout>
  );
};

export default Announcements;