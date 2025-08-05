import { LucideIcon } from 'lucide-react';

export interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  category: string;
  isNew?: boolean;
  requiredPermissions?: string[];
  component: React.ComponentType<any>;
  fullPageComponent?: React.ComponentType<any>;
}

export interface ModuleCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  modules: ModuleConfig[];
}

export interface ModuleProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
  isFullPage?: boolean;
  onNavigate?: (moduleId: string) => void;
}