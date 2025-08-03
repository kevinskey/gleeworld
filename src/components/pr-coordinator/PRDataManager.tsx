import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  Eye,
  MapPin,
  Calendar,
  User,
  FileImage,
  Trash2,
  ExternalLink
} from "lucide-react";
import { PRImage, usePRImages } from "@/hooks/usePRImages";
import { toast } from "sonner";

type SortField = 'uploaded_at' | 'taken_at' | 'file_size' | 'caption' | 'filename';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const PRDataManager = () => {
  const { images, loading, deleteImage, getImageUrl } = usePRImages();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'uploaded_at',
    direction: 'desc'
  });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Extract location data from caption and use actual photographer data
  const extractMetadata = (image: PRImage) => {
    const caption = image.caption || '';
    
    // Extract location (format: "Location: lat, lng")
    const locationMatch = caption.match(/Location: ([-\d.]+), ([-\d.]+)/);
    const location = locationMatch ? {
      latitude: parseFloat(locationMatch[1]),
      longitude: parseFloat(locationMatch[2])
    } : null;
    
    // Use actual photographer name from database, fallback to caption extraction
    const photographerName = image.photographer?.full_name || 
      image.uploader?.full_name || 
      (() => {
        const usernameMatch = caption.match(/By: ([^|]+)/);
        return usernameMatch ? usernameMatch[1].trim() : 'Unknown';
      })();
    
    // Extract capture time (format: "Captured: date time")
    const capturedMatch = caption.match(/Captured: ([^|]+)/);
    const capturedTime = capturedMatch ? capturedMatch[1].trim() : '';
    
    return { location, photographerName, capturedTime };
  };

  // Filter and sort images
  const filteredAndSortedImages = useMemo(() => {
    let filtered = images.filter(image => {
      const { photographerName } = extractMetadata(image);
      const searchLower = searchQuery.toLowerCase();
      
      return (
        image.caption?.toLowerCase().includes(searchLower) ||
        image.filename.toLowerCase().includes(searchLower) ||
        image.original_filename?.toLowerCase().includes(searchLower) ||
        photographerName.toLowerCase().includes(searchLower)
      );
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'uploaded_at':
          aValue = new Date(a.uploaded_at);
          bValue = new Date(b.uploaded_at);
          break;
        case 'taken_at':
          aValue = a.taken_at ? new Date(a.taken_at) : new Date(0);
          bValue = b.taken_at ? new Date(b.taken_at) : new Date(0);
          break;
        case 'file_size':
          aValue = a.file_size || 0;
          bValue = b.file_size || 0;
          break;
        case 'caption':
          aValue = a.caption || '';
          bValue = b.caption || '';
          break;
        case 'filename':
          aValue = a.filename;
          bValue = b.filename;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [images, searchQuery, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleExportData = () => {
    const csvData = filteredAndSortedImages.map(image => {
      const { location, photographerName, capturedTime } = extractMetadata(image);
      return {
        filename: image.filename,
        original_filename: image.original_filename || '',
        caption: image.caption || '',
        photographer: photographerName,
        captured_time: capturedTime,
        uploaded_at: formatDate(image.uploaded_at),
        file_size: formatFileSize(image.file_size),
        latitude: location?.latitude || '',
        longitude: location?.longitude || '',
        mime_type: image.mime_type || ''
      };
    });

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pr-images-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully!');
  };

  const handleRowSelect = (imageId: string, checked: boolean) => {
    setSelectedRows(prev => 
      checked 
        ? [...prev, imageId]
        : prev.filter(id => id !== imageId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? filteredAndSortedImages.map(img => img.id) : []);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    
    if (!confirm(`Delete ${selectedRows.length} selected images?`)) return;

    try {
      for (const imageId of selectedRows) {
        await deleteImage(imageId);
      }
      setSelectedRows([]);
      toast.success(`Deleted ${selectedRows.length} images successfully`);
    } catch (error) {
      toast.error('Failed to delete some images');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            PR Images Data Manager
            <Badge variant="secondary">{filteredAndSortedImages.length} images</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            {selectedRows.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedRows.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename, caption, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Images with location</DropdownMenuItem>
              <DropdownMenuItem>Images without location</DropdownMenuItem>
              <DropdownMenuItem>Large files (&gt; 1MB)</DropdownMenuItem>
              <DropdownMenuItem>Recent uploads (7 days)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredAndSortedImages.length && filteredAndSortedImages.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead className="min-w-[80px]">Preview</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[150px]"
                    onClick={() => handleSort('filename')}
                  >
                    <div className="flex items-center gap-2">
                      Filename {getSortIcon('filename')}
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">Metadata</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[120px] hidden lg:table-cell"
                    onClick={() => handleSort('taken_at')}
                  >
                    <div className="flex items-center gap-2">
                      Captured {getSortIcon('taken_at')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[120px]"
                    onClick={() => handleSort('uploaded_at')}
                  >
                    <div className="flex items-center gap-2">
                      Uploaded {getSortIcon('uploaded_at')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 min-w-[80px] hidden md:table-cell"
                    onClick={() => handleSort('file_size')}
                  >
                    <div className="flex items-center gap-2">
                      Size {getSortIcon('file_size')}
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredAndSortedImages.map((image) => {
                const { location, photographerName, capturedTime } = extractMetadata(image);
                const imageUrl = getImageUrl(image.file_path);
                
                return (
                  <TableRow key={image.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(image.id)}
                        onChange={(e) => handleRowSelect(image.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <img 
                        src={imageUrl} 
                        alt={image.filename}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{image.original_filename || image.filename}</div>
                        <div className="text-xs text-muted-foreground">{image.mime_type}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[120px]" title={photographerName}>
                            {photographerName}
                          </span>
                        </div>
                        {location && (
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            <span>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-xs">
                        {capturedTime || (image.taken_at ? formatDate(image.taken_at) : 'Unknown')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {formatDate(image.uploaded_at)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-xs">
                        {formatFileSize(image.file_size)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(imageUrl, '_blank')}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteImage(image.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </div>
          
          {filteredAndSortedImages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No images found matching your search criteria.
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{filteredAndSortedImages.length}</div>
              <div className="text-sm text-muted-foreground">Total Images</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {filteredAndSortedImages.filter(img => extractMetadata(img).location).length}
              </div>
              <div className="text-sm text-muted-foreground">With Location</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {Math.round(filteredAndSortedImages.reduce((acc, img) => acc + (img.file_size || 0), 0) / 1024 / 1024)}MB
              </div>
              <div className="text-sm text-muted-foreground">Total Size</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {new Set(filteredAndSortedImages.map(img => extractMetadata(img).photographerName)).size}
              </div>
              <div className="text-sm text-muted-foreground">Contributors</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};