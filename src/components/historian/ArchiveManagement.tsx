import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Archive, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash,
  FileText,
  Image,
  Video,
  Music,
  Calendar,
  Tag,
  FolderOpen
} from "lucide-react";

interface ArchiveItem {
  id: string;
  filename: string;
  type: "program" | "photo" | "video" | "interview" | "poster" | "document";
  category: string;
  year: string;
  event: string;
  description: string;
  tags: string[];
  uploadDate: string;
  fileSize: string;
  version: number;
}

export const ArchiveManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");

  // Mock data
  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([
    {
      id: "1",
      filename: "MLK_Convocation_2024_Program.pdf",
      type: "program",
      category: "Service",
      year: "2024",
      event: "MLK Convocation",
      description: "Official program for the 2024 MLK Convocation ceremony",
      tags: ["MLK", "Service", "Program", "Centennial"],
      uploadDate: "2024-01-16",
      fileSize: "2.3 MB",
      version: 1
    },
    {
      id: "2",
      filename: "Fall_Concert_2024_Photos.zip",
      type: "photo",
      category: "Concert",
      year: "2024",
      event: "Fall Concert",
      description: "Photo collection from the Fall 2024 concert performance",
      tags: ["Concert", "Fall", "Photos", "Performance"],
      uploadDate: "2024-11-21",
      fileSize: "156 MB",
      version: 1
    },
    {
      id: "3",
      filename: "Dr_Johnson_Interview_Centennial.mp4",
      type: "interview",
      category: "Interview",
      year: "2024",
      event: "Centennial Interviews",
      description: "Video interview with Dr. Dorothy Johnson about Glee Club history",
      tags: ["Interview", "Centennial", "Dr. Johnson", "History"],
      uploadDate: "2024-11-16",
      fileSize: "1.2 GB",
      version: 1
    },
    {
      id: "4",
      filename: "Homecoming_Performance_Poster_2024.jpg",
      type: "poster",
      category: "Performance",
      year: "2024",
      event: "Homecoming",
      description: "Promotional poster for Homecoming 2024 performance",
      tags: ["Homecoming", "Poster", "Promotion", "Alumni"],
      uploadDate: "2024-10-01",
      fileSize: "8.5 MB",
      version: 2
    },
    {
      id: "5",
      filename: "Spring_Tour_2023_Recap_Video.mp4",
      type: "video",
      category: "Tour",
      year: "2023",
      event: "Spring Tour",
      description: "Recap video of the 2023 Spring Tour highlights",
      tags: ["Tour", "Spring", "Video", "Recap"],
      uploadDate: "2023-04-15",
      fileSize: "890 MB",
      version: 1
    }
  ]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "photo": return <Image className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "interview": return <Video className="h-4 w-4" />;
      case "program": 
      case "document": return <FileText className="h-4 w-4" />;
      case "poster": return <Image className="h-4 w-4" />;
      default: return <FolderOpen className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "photo": return "default";
      case "video": return "secondary";
      case "interview": return "outline";
      case "program": return "default";
      case "poster": return "secondary";
      case "document": return "outline";
      default: return "secondary";
    }
  };

  const filteredItems = archiveItems.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.event.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = !filterYear || item.year === filterYear;
    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesType = !filterType || item.type === filterType;
    
    return matchesSearch && matchesYear && matchesCategory && matchesType;
  });

  const years = [...new Set(archiveItems.map(item => item.year))].sort().reverse();
  const categories = [...new Set(archiveItems.map(item => item.category))];
  const types = [...new Set(archiveItems.map(item => item.type))];

  const stats = {
    totalFiles: archiveItems.length,
    totalSize: "2.4 GB",
    photosCount: archiveItems.filter(item => item.type === "photo").length,
    videosCount: archiveItems.filter(item => item.type === "video" || item.type === "interview").length,
    documentsCount: archiveItems.filter(item => item.type === "program" || item.type === "document").length
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <div className="text-sm text-muted-foreground">Total Files</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.photosCount}</div>
            <div className="text-sm text-muted-foreground">Photos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.videosCount}</div>
            <div className="text-sm text-muted-foreground">Videos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.documentsCount}</div>
            <div className="text-sm text-muted-foreground">Documents</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive Management Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files, events, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setFilterYear("");
              setFilterCategory("");
              setFilterType("");
            }}>
              Clear Filters
            </Button>
          </div>

          {/* File List */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
              <div className="col-span-4">File</div>
              <div className="col-span-2">Event</div>
              <div className="col-span-1">Year</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-1">Version</div>
              <div className="col-span-1">Actions</div>
            </div>

            {filteredItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0 items-center hover:bg-muted/20">
                <div className="col-span-4">
                  <div className="flex items-center gap-2">
                    {getFileIcon(item.type)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{item.filename}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {item.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-sm">
                  {item.event}
                </div>
                <div className="col-span-1 text-sm">
                  {item.year}
                </div>
                <div className="col-span-1">
                  <Badge variant={getTypeColor(item.type)} className="text-xs">
                    {item.type}
                  </Badge>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {item.fileSize}
                </div>
                <div className="col-span-1 text-sm">
                  v{item.version}
                </div>
                <div className="col-span-1">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No files found matching your search criteria.
            </div>
          )}

          {/* Bulk Actions */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredItems.length} of {archiveItems.length} files
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export List
              </Button>
              <Button variant="outline">
                <Archive className="h-4 w-4 mr-2" />
                Bulk Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};