
export interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'initials' | 'date' | 'text' | 'username';
  required: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  font?: string;
  text_align?: 'left' | 'center' | 'right';
  default_value?: string;
}

export interface Contract {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  header_image_url?: string;
  email_message?: string;
  recipient_email?: string;
  recipient_name?: string;
}

export interface SignatureRecord {
  id: string;
  contract_id: string;
  artist_id: string;
  status: 'pending_artist_signature' | 'pending_admin_signature' | 'completed';
  created_at: string;
  updated_at: string;
  signed_by_artist_at: string | null;
  signed_by_admin_at: string | null;
  embedded_signatures: any;
}

export interface W9Form {
  id: string;
  user_id: string;
  storage_path: string;
  submitted_at: string;
  status: string;
  form_data: any;
  created_at: string;
  updated_at: string;
}
