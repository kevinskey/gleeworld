import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Users, 
  Calendar, 
  Tag, 
  FileText, 
  Clock,
  AlertCircle
} from "lucide-react";
import { Contract } from '@/hooks/useContractManagement';

interface ContractDetailsProps {
  contract: Contract;
  onClose: () => void;
  onEdit: (contract: Contract) => void;
  onManageMembers: (contract: Contract) => void;
}

export const ContractDetails = ({ 
  contract, 
  onClose, 
  onEdit, 
  onManageMembers 
}: ContractDetailsProps) => {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{contract.title}</h1>
            <p className="text-muted-foreground">Contract Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onEdit(contract)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => onManageMembers(contract)}>
            <Users className="h-4 w-4 mr-2" />
            Manage Members
          </Button>
        </div>
      </div>

      {/* Contract Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contract Overview
              </CardTitle>
              <CardDescription>
                Basic information about this contract
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[contract.status]}>
                {contract.status}
              </Badge>
              <Badge className={priorityColors[contract.priority]}>
                {contract.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Contract Type</h4>
                <p className="text-sm">{contract.contract_type}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                <p className="text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(contract.created_at).toLocaleDateString()} at {new Date(contract.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                <p className="text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(contract.updated_at).toLocaleDateString()} at {new Date(contract.updated_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {contract.due_date && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h4>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(contract.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {contract.tags && contract.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {contract.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {contract.archived && (
                <div>
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    <AlertCircle className="h-3 w-3" />
                    Archived
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Content */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Content</CardTitle>
          <CardDescription>
            The full content of this contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {contract.content}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {contract.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Additional notes and comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {contract.notes}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};