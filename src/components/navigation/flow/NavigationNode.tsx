import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Home, Library, FileText, Calendar, DollarSign, Music, Settings } from 'lucide-react';
import { useNavigationFlow } from './NavigationFlowProvider';

const iconMap = {
  Home,
  Library,
  FileText,
  Calendar,
  DollarSign,
  Music,
  Settings
};

interface NavigationNodeData {
  label: string;
  icon: keyof typeof iconMap;
  href: string;
  isCenter?: boolean;
  badge?: number;
}

interface NavigationNodeProps {
  id: string;
  data: NavigationNodeData;
  selected: boolean;
}

export const NavigationNode = memo(({ id, data, selected }: NavigationNodeProps) => {
  const { navigateToNode, setSelectedNode } = useNavigationFlow();
  const IconComponent = iconMap[data.icon];

  const handleClick = () => {
    setSelectedNode(id);
    navigateToNode(id);
  };

  return (
    <div className="relative">
      {!data.isCenter && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-primary border-2 border-background"
        />
      )}
      
      <div
        onClick={handleClick}
        className={`
          flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer
          transition-all duration-200 hover:scale-105 active:scale-95
          min-w-[80px] max-w-[100px]
          ${data.isCenter 
            ? 'bg-primary text-primary-foreground shadow-lg' 
            : 'bg-card text-card-foreground border border-border shadow-md hover:shadow-lg'
          }
          ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        `}
      >
        <div className="relative">
          <IconComponent className="w-6 h-6" />
          {data.badge && data.badge > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {data.badge > 99 ? '99+' : data.badge}
            </Badge>
          )}
        </div>
        
        <span className="text-xs font-medium text-center leading-tight">
          {data.label}
        </span>
      </div>

      {!data.isCenter && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-primary border-2 border-background"
        />
      )}
    </div>
  );
});

NavigationNode.displayName = 'NavigationNode';