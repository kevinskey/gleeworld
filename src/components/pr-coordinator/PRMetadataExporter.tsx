import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Database,
  MapPin,
  Calendar,
  User,
  FileImage
} from "lucide-react";
import { PRImage, usePRImages } from "@/hooks/usePRImages";
import { toast } from "sonner";

interface ExportField {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const PRMetadataExporter = () => {
  const { images } = usePRImages();
  
  const [exportFields, setExportFields] = useState<ExportField[]>([
    { key: 'filename', label: 'Filename', description: 'Original and system filename', enabled: true },
    { key: 'caption', label: 'Caption', description: 'Full caption with metadata', enabled: true },
    { key: 'username', label: 'Username', description: 'Extracted username from metadata', enabled: true },
    { key: 'location', label: 'Location', description: 'GPS coordinates (lat, lng)', enabled: true },
    { key: 'capturedTime', label: 'Capture Time', description: 'When the photo was taken', enabled: true },
    { key: 'uploadTime', label: 'Upload Time', description: 'When uploaded to system', enabled: true },
    { key: 'fileSize', label: 'File Size', description: 'Size in bytes and formatted', enabled: true },
    { key: 'mimeType', label: 'File Type', description: 'MIME type (image/jpeg, etc.)', enabled: true },
    { key: 'dimensions', label: 'Dimensions', description: 'Image width and height', enabled: false },
    { key: 'tags', label: 'Tags', description: 'Associated image tags', enabled: false },
  ]);

  // Extract enhanced metadata from each image
  const extractEnhancedMetadata = (image: PRImage) => {
    const caption = image.caption || '';
    
    // Extract location (format: "Location: lat, lng")
    const locationMatch = caption.match(/Location: ([-\d.]+), ([-\d.]+)/);
    const location = locationMatch ? {
      latitude: parseFloat(locationMatch[1]),
      longitude: parseFloat(locationMatch[2]),
      formatted: `${locationMatch[1]}, ${locationMatch[2]}`
    } : null;
    
    // Extract username (format: "By: username")
    const usernameMatch = caption.match(/By: ([^|]+)/);
    const username = usernameMatch ? usernameMatch[1].trim() : '';
    
    // Extract capture time (format: "Captured: date time")
    const capturedMatch = caption.match(/Captured: ([^|]+)/);
    const capturedTime = capturedMatch ? capturedMatch[1].trim() : '';
    
    return {
      filename: {
        original: image.original_filename || 'Unknown',
        system: image.filename,
        displayName: image.original_filename || image.filename
      },
      caption: caption,
      username: username,
      location: location,
      capturedTime: capturedTime,
      uploadTime: new Date(image.uploaded_at).toISOString(),
      fileSize: {
        bytes: image.file_size || 0,
        formatted: formatFileSize(image.file_size)
      },
      mimeType: image.mime_type || 'unknown',
      imageId: image.id,
      filePath: image.file_path
    };
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const toggleField = (fieldKey: string) => {
    setExportFields(prev => prev.map(field => 
      field.key === fieldKey 
        ? { ...field, enabled: !field.enabled }
        : field
    ));
  };

  const selectAllFields = () => {
    setExportFields(prev => prev.map(field => ({ ...field, enabled: true })));
  };

  const clearAllFields = () => {
    setExportFields(prev => prev.map(field => ({ ...field, enabled: false })));
  };

  const exportToCSV = () => {
    const enabledFields = exportFields.filter(field => field.enabled);
    if (enabledFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    const processedData = images.map(image => {
      const metadata = extractEnhancedMetadata(image);
      const row: Record<string, any> = {};

      enabledFields.forEach(field => {
        switch (field.key) {
          case 'filename':
            row['Original Filename'] = metadata.filename.original;
            row['System Filename'] = metadata.filename.system;
            break;
          case 'caption':
            row['Caption'] = metadata.caption;
            break;
          case 'username':
            row['Username'] = metadata.username;
            break;
          case 'location':
            row['Latitude'] = metadata.location?.latitude || '';
            row['Longitude'] = metadata.location?.longitude || '';
            row['Location (Formatted)'] = metadata.location?.formatted || 'No location';
            break;
          case 'capturedTime':
            row['Captured Time'] = metadata.capturedTime;
            break;
          case 'uploadTime':
            row['Upload Time'] = metadata.uploadTime;
            break;
          case 'fileSize':
            row['File Size (Bytes)'] = metadata.fileSize.bytes;
            row['File Size (Formatted)'] = metadata.fileSize.formatted;
            break;
          case 'mimeType':
            row['MIME Type'] = metadata.mimeType;
            break;
        }
      });

      return row;
    });

    // Generate CSV content
    const headers = Object.keys(processedData[0] || {});
    const csvContent = [
      headers.join(','),
      ...processedData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const escapedValue = String(value || '').replace(/"/g, '""');
          return escapedValue.includes(',') ? `"${escapedValue}"` : escapedValue;
        }).join(',')
      )
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pr-images-metadata-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${images.length} records to CSV`);
  };

  const exportToJSON = () => {
    const enabledFields = exportFields.filter(field => field.enabled);
    if (enabledFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    const processedData = images.map(image => {
      const metadata = extractEnhancedMetadata(image);
      const record: Record<string, any> = {
        id: metadata.imageId,
        filePath: metadata.filePath
      };

      enabledFields.forEach(field => {
        switch (field.key) {
          case 'filename':
            record.filename = metadata.filename;
            break;
          case 'caption':
            record.caption = metadata.caption;
            break;
          case 'username':
            record.username = metadata.username;
            break;
          case 'location':
            record.location = metadata.location;
            break;
          case 'capturedTime':
            record.capturedTime = metadata.capturedTime;
            break;
          case 'uploadTime':
            record.uploadTime = metadata.uploadTime;
            break;
          case 'fileSize':
            record.fileSize = metadata.fileSize;
            break;
          case 'mimeType':
            record.mimeType = metadata.mimeType;
            break;
        }
      });

      return record;
    });

    const jsonContent = JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalRecords: processedData.length,
      exportedFields: enabledFields.map(f => f.key),
      data: processedData
    }, null, 2);

    // Download file
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pr-images-metadata-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${images.length} records to JSON`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Metadata Export Tool
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export photo metadata for analysis, reporting, or integration with other systems. 
          Choose which fields to include in your export.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Export Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{images.length}</div>
            <div className="text-xs text-muted-foreground">Total Images</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">
              {images.filter(img => {
                const metadata = extractEnhancedMetadata(img);
                return metadata.location !== null;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">With GPS Data</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">
              {new Set(images.map(img => extractEnhancedMetadata(img).username)).size}
            </div>
            <div className="text-xs text-muted-foreground">Contributors</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">
              {exportFields.filter(f => f.enabled).length}
            </div>
            <div className="text-xs text-muted-foreground">Selected Fields</div>
          </div>
        </div>

        <Separator />

        {/* Field Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Select Export Fields</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllFields}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllFields}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportFields.map((field) => (
              <div key={field.key} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={field.key}
                  checked={field.enabled}
                  onCheckedChange={() => toggleField(field.key)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor={field.key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {field.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Export Actions */}
        <div>
          <h3 className="text-lg font-medium mb-4">Export Format</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={exportToCSV}
              className="flex items-center gap-2 h-12"
              disabled={images.length === 0}
            >
              <FileSpreadsheet className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Export as CSV</div>
                <div className="text-xs opacity-75">For spreadsheet analysis</div>
              </div>
            </Button>
            
            <Button 
              onClick={exportToJSON}
              variant="outline"
              className="flex items-center gap-2 h-12"
              disabled={images.length === 0}
            >
              <FileJson className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Export as JSON</div>
                <div className="text-xs opacity-75">For programmatic use</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Export Use Cases</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Analytics:</strong> Import into Excel or Google Sheets for usage analysis</li>
            <li>• <strong>Backup:</strong> Create metadata backups for disaster recovery</li>
            <li>• <strong>Integration:</strong> Feed data into other marketing or CMS systems</li>
            <li>• <strong>Reporting:</strong> Generate activity reports for stakeholders</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};