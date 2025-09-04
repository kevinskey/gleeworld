// Reusable contract card component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Send, 
  Copy, 
  Trash,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Contract, ContractAction } from "@/types/contracts";

interface ContractCardProps {
  contract: Contract;
  actions?: ContractAction[];
  onView?: (contract: Contract) => void;
  onEdit?: (contract: Contract) => void;
  onSend?: (contract: Contract) => void;
  onDuplicate?: (contract: Contract) => void;
  onDelete?: (contract: Contract) => void;
  showActions?: boolean;
  compact?: boolean;
}

const getStatusIcon = (status: Contract['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'signed':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'sent':
      return <Clock className="h-4 w-4 text-orange-500" />;
    case 'cancelled':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Edit className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusVariant = (status: Contract['status']) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'signed':
      return 'default';
    case 'sent':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  actions = [],
  onView,
  onEdit,
  onSend,
  onDuplicate,
  onDelete,
  showActions = true,
  compact = false
}) => {
  const defaultActions: ContractAction[] = [
    {
      type: 'send',
      label: 'View',
      icon: 'Eye',
      handler: onView || (() => {}),
    },
    {
      type: 'send',
      label: 'Edit',
      icon: 'Edit',
      handler: onEdit || (() => {}),
      disabled: (contract) => contract.status === 'completed'
    },
    {
      type: 'send',
      label: 'Send',
      icon: 'Send',
      handler: onSend || (() => {}),
      disabled: (contract) => contract.status === 'sent' || contract.status === 'completed'
    },
    {
      type: 'duplicate',
      label: 'Duplicate',
      icon: 'Copy',
      handler: onDuplicate || (() => {}),
    },
    {
      type: 'delete',
      label: 'Delete',
      icon: 'Trash',
      handler: onDelete || (() => {}),
      variant: 'destructive',
      disabled: (contract) => contract.status === 'sent' || contract.status === 'completed'
    }
  ];

  const allActions = actions.length > 0 ? actions : defaultActions;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'performance':
        return 'bg-purple-100 text-purple-800';
      case 'service':
        return 'bg-blue-100 text-blue-800';
      case 'wardrobe':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${compact ? 'text-base' : 'text-lg'} truncate`}>
              {contract.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(contract.status)}
              <Badge variant={getStatusVariant(contract.status)} className="text-xs">
                {contract.status}
              </Badge>
              {contract.contract_type && (
                <Badge className={`text-xs ${getTypeColor(contract.contract_type)}`}>
                  {contract.contract_type}
                </Badge>
              )}
            </div>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allActions.map((action, index) => {
                  const isDisabled = action.disabled?.(contract) || false;
                  const iconMap = {
                    Eye,
                    Edit,
                    Send,
                    Copy,
                    Trash
                  };
                  const Icon = iconMap[action.icon as keyof typeof iconMap] || Eye;

                  return (
                    <React.Fragment key={action.type + index}>
                      <DropdownMenuItem
                        onClick={() => !isDisabled && action.handler(contract)}
                        disabled={isDisabled}
                        className={action.variant === 'destructive' ? 'text-red-600' : ''}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                      {action.type === 'duplicate' && <DropdownMenuSeparator />}
                    </React.Fragment>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      {!compact && (
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{formatDate(contract.created_at)}</span>
            </div>
            {contract.due_date && (
              <div className="flex justify-between">
                <span>Due:</span>
                <span className={
                  new Date(contract.due_date) < new Date() ? 'text-red-600' : ''
                }>
                  {formatDate(contract.due_date)}
                </span>
              </div>
            )}
            {contract.updated_at !== contract.created_at && (
              <div className="flex justify-between">
                <span>Updated:</span>
                <span>{formatDate(contract.updated_at)}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};