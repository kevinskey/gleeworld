// Core contract types and interfaces for the modular contract system

export interface Contract {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'sent' | 'signed' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by: string;
  contract_type?: 'performance' | 'service' | 'wardrobe' | 'general';
  template_id?: string;
  metadata?: Record<string, any>;
  due_date?: string;
  reminder_sent?: boolean;
  // Additional fields from actual DB schema (all optional for compatibility)
  archived?: boolean;
  is_template?: boolean;
  stipend_amount?: number;
}

export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  template_content: string; // Actual DB field name
  description?: string;
  category: 'performance' | 'service' | 'wardrobe' | 'general';
  contract_type: string; // Actual DB field name
  header_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  variables?: ContractVariable[];
}

export interface ContractVariable {
  id: string;
  name: string;
  type: 'text' | 'date' | 'number' | 'select';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  default_value?: string;
}

export interface ContractSignature {
  id: string;
  contract_id: string;
  signer_email?: string;
  signer_name?: string;
  status: 'pending' | 'signed' | 'declined';
  signed_at?: string;
  signature_data?: any;
  embedded_signatures?: any[];
  created_at: string;
  updated_at: string;
  // Additional fields from actual DB schema
  admin_signature_data?: string;
  admin_signed_at?: string;
  artist_signature_data?: string;
  artist_signed_at?: string;
  date_signed?: string;
}

export interface ContractRecipient {
  id: string;
  contract_id: string;
  email: string;
  name: string;
  role: 'signer' | 'cc' | 'approver';
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
  sent_at?: string;
  viewed_at?: string;
  completed_at?: string;
  // Additional fields from actual DB schema
  recipient_email?: string;
  recipient_name?: string;
  clicked_at?: string;
  custom_message?: string;
  delivery_status?: string;
  email_status?: string;
  is_resend?: boolean;
  opened_at?: string;
  resend_reason?: string;
  sent_by?: string;
}

export interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'text' | 'checkbox';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
  label?: string;
  signer_email?: string;
  value?: any;
  completed?: boolean;
}

export interface ContractFormData {
  title: string;
  content: string;
  contract_type: string;
  due_date?: string;
  recipients: Omit<ContractRecipient, 'id' | 'contract_id' | 'status'>[];
  signature_fields?: Omit<SignatureField, 'id'>[];
  metadata?: Record<string, any>;
}

export interface ContractFilters {
  status?: Contract['status'][];
  type?: Contract['contract_type'][];
  created_by?: string;
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface ContractStats {
  total: number;
  draft: number;
  sent: number;
  signed: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export interface ContractAction {
  type: 'send' | 'remind' | 'cancel' | 'duplicate' | 'delete' | 'download';
  label: string;
  icon: string;
  handler: (contract: Contract) => void | Promise<void>;
  disabled?: (contract: Contract) => boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

export interface ContractNotification {
  id: string;
  contract_id: string;
  type: 'reminder' | 'signed' | 'declined' | 'expired';
  message: string;
  read: boolean;
  created_at: string;
}

// API Response types
export interface ContractApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface ContractListResponse extends ContractApiResponse {
  data?: {
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
  };
}

// Hook return types
export interface UseContractReturn {
  contract: Contract | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (data: Partial<Contract>) => Promise<boolean>;
  delete: () => Promise<boolean>;
}

export interface UseContractsReturn {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  stats: ContractStats;
  filters: ContractFilters;
  setFilters: (filters: Partial<ContractFilters>) => void;
  refresh: () => Promise<void>;
  create: (data: ContractFormData) => Promise<Contract | null>;
  search: (query: string) => void;
}

export interface UseContractTemplatesReturn {
  templates: ContractTemplate[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (data: Omit<ContractTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<ContractTemplate | null>;
  update: (id: string, data: Partial<ContractTemplate>) => Promise<boolean>;
  delete: (id: string) => Promise<boolean>;
  useTemplate: (template: ContractTemplate, variables?: Record<string, any>) => Contract;
}