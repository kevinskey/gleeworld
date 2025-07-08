import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Bold, 
  Italic, 
  Underline, 
  Image, 
  Link, 
  Users, 
  X, 
  Upload,
  ShoppingCart,
  Plus,
  Eye,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUsers } from "@/hooks/useUsers";
import { useTasks } from "@/hooks/useTasks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface AssignedDuty {
  id: string;
  userId: string;
  userName: string;
  task: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface AmazonLink {
  id: string;
  url: string;
  title: string;
  description?: string;
}

interface UploadedImage {
  id: string;
  url: string;
  alt: string;
}

interface RichContentCreatorProps {
  onSave: (content: {
    text: string;
    images: UploadedImage[];
    amazonLinks: AmazonLink[];
    assignedDuties: AssignedDuty[];
  }) => void;
  initialContent?: {
    text?: string;
    images?: UploadedImage[];
    amazonLinks?: AmazonLink[];
    assignedDuties?: AssignedDuty[];
  };
}

export const RichContentCreator = ({ onSave, initialContent }: RichContentCreatorProps) => {
  const { users } = useUsers();
  const { createTask } = useTasks();
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent?.text || "");
  const [images, setImages] = useState<UploadedImage[]>(initialContent?.images || []);
  const [amazonLinks, setAmazonLinks] = useState<AmazonLink[]>(initialContent?.amazonLinks || []);
  const [assignedDuties, setAssignedDuties] = useState<AssignedDuty[]>(initialContent?.assignedDuties || []);
  
  // Dialog states
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showDutyDialog, setShowDutyDialog] = useState(false);
  
  // Form states
  const [imageAlt, setImageAlt] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [dutyTask, setDutyTask] = useState("");
  const [dutyUserId, setDutyUserId] = useState("");
  const [dutyDueDate, setDutyDueDate] = useState("");
  const [dutyPriority, setDutyPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rich text formatting
  const formatText = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = "";
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      default:
        formattedText = selectedText;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
  };

  // Image upload
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `content-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      const newImage: UploadedImage = {
        id: Math.random().toString(),
        url: publicUrl,
        alt: imageAlt || file.name
      };

      setImages([...images, newImage]);
      setImageAlt("");
      setShowImageDialog(false);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  };

  // Add Amazon link
  const addAmazonLink = () => {
    if (!linkUrl || !linkTitle) return;

    const newLink: AmazonLink = {
      id: Math.random().toString(),
      url: linkUrl,
      title: linkTitle,
      description: linkDescription
    };

    setAmazonLinks([...amazonLinks, newLink]);
    setLinkUrl("");
    setLinkTitle("");
    setLinkDescription("");
    setShowLinkDialog(false);
  };

  // Assign duty
  const assignDuty = async () => {
    if (!dutyTask || !dutyUserId) return;

    const selectedUser = users.find(u => u.id === dutyUserId);
    if (!selectedUser) return;

    try {
      // Create the task in the database
      await createTask({
        title: dutyTask,
        description: dutyTask,
        assigned_to: dutyUserId,
        priority: dutyPriority,
        due_date: dutyDueDate || undefined,
        content_id: Math.random().toString() // You can pass actual content ID if needed
      });

      // Also add to local state for immediate display
      const newDuty: AssignedDuty = {
        id: Math.random().toString(),
        userId: dutyUserId,
        userName: selectedUser.full_name || selectedUser.email || 'Unknown User',
        task: dutyTask,
        dueDate: dutyDueDate || undefined,
        priority: dutyPriority
      };

      setAssignedDuties([...assignedDuties, newDuty]);
      setDutyTask("");
      setDutyUserId("");
      setDutyDueDate("");
      setDutyPriority('medium');
      setShowDutyDialog(false);

      toast({
        title: "Duty Assigned",
        description: `Task assigned to ${selectedUser.full_name || selectedUser.email}. They will receive a notification.`,
      });
    } catch (error) {
      console.error('Error assigning duty:', error);
    }
  };

  // Remove items
  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  const removeLink = (id: string) => {
    setAmazonLinks(amazonLinks.filter(link => link.id !== id));
  };

  const removeDuty = (id: string) => {
    setAssignedDuties(assignedDuties.filter(duty => duty.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const handleSave = () => {
    onSave({
      text: content,
      images,
      amazonLinks,
      assignedDuties
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Content Creator</span>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Save Content
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Rich Text Editor */}
        <div className="space-y-2">
          <Label>Content</Label>
          <div className="border rounded-lg">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('bold')}
                className="h-8 w-8 p-0"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('italic')}
                className="h-8 w-8 p-0"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => formatText('underline')}
                className="h-8 w-8 p-0"
              >
                <Underline className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-gray-300 mx-1" />
              
              <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Image className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showDutyDialog} onOpenChange={setShowDutyDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Users className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            {/* Text Area */}
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your content here..."
              className="min-h-[200px] border-0 resize-none rounded-none"
            />
          </div>
        </div>

        {/* Images Section */}
        {images.length > 0 && (
          <div className="space-y-2">
            <Label>Images</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{image.alt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amazon Links Section */}
        {amazonLinks.length > 0 && (
          <div className="space-y-2">
            <Label>Amazon Links</Label>
            <div className="space-y-2">
              {amazonLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-orange-600" />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {link.title}
                      </a>
                    </div>
                    {link.description && (
                      <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(link.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Duties Section */}
        {assignedDuties.length > 0 && (
          <div className="space-y-2">
            <Label>Assigned Duties</Label>
            <div className="space-y-2">
              {assignedDuties.map((duty) => (
                <div key={duty.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{duty.userName}</span>
                      <Badge variant={getPriorityColor(duty.priority)} className="text-xs">
                        {duty.priority}
                      </Badge>
                    </div>
                    <p className="text-sm">{duty.task}</p>
                    {duty.dueDate && (
                      <p className="text-xs text-muted-foreground">Due: {new Date(duty.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDuty(duty.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Upload Dialog */}
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-alt">Image Description</Label>
                <Input
                  id="image-alt"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Enter image description"
                />
              </div>
              <div>
                <Label>Select Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {uploading && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-muted-foreground mt-2">Uploading image...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Amazon Link Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Amazon Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="link-title">Product Title</Label>
                <Input
                  id="link-title"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Enter product title"
                />
              </div>
              <div>
                <Label htmlFor="link-url">Amazon URL</Label>
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://amazon.com/..."
                />
              </div>
              <div>
                <Label htmlFor="link-description">Description (Optional)</Label>
                <Textarea
                  id="link-description"
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  placeholder="Additional notes about this product"
                  rows={3}
                />
              </div>
              <Button onClick={addAmazonLink} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Duty Assignment Dialog */}
        <Dialog open={showDutyDialog} onOpenChange={setShowDutyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Duty</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="duty-user">Assign To</Label>
                <Select value={dutyUserId} onValueChange={setDutyUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duty-task">Task Description</Label>
                <Textarea
                  id="duty-task"
                  value={dutyTask}
                  onChange={(e) => setDutyTask(e.target.value)}
                  placeholder="Describe the task to be completed"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duty-priority">Priority</Label>
                  <Select value={dutyPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setDutyPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duty-due-date">Due Date (Optional)</Label>
                  <Input
                    id="duty-due-date"
                    type="date"
                    value={dutyDueDate}
                    onChange={(e) => setDutyDueDate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={assignDuty} className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Assign Duty
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};