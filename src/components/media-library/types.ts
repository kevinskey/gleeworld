export interface MediaFile {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  tags?: string[];
  category?: string;
  created_at: string;
  updated_at?: string;
  uploaded_by?: string;
  is_public?: boolean;
  file_path?: string;
  bucket_id?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  is_favorite?: boolean;
  is_deleted?: boolean;
  folder_id?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  icon?: string;
}

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface SidebarSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter?: (file: MediaFile) => boolean;
  isSpecial?: boolean;
}
