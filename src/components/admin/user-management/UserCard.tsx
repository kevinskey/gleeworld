import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@/hooks/useUsers";
import { getAvatarUrl, getInitials } from "@/utils/avatarUtils";
import { 
  Shield, 
  User as UserIcon, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  DollarSign 
} from "lucide-react";

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onView: (user: User) => void;
  onClick?: (user: User) => void;
  showPaymentStatus?: boolean;
  isPaid?: boolean;
  stipendAmount?: number;
  onPayout?: (user: User) => void;
}

export const UserCard = ({ 
  user, 
  onEdit, 
  onDelete, 
  onView, 
  onClick,
  showPaymentStatus = false,
  isPaid = false,
  stipendAmount,
  onPayout
}: UserCardProps) => {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super-admin': return 'destructive';
      case 'admin': return 'default';
      case 'alumnae': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin':
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className="hover:bg-slate-50 transition-colors border-2 hover:border-slate-300 shadow-sm">
      <CardContent className="p-4">
        {/* Main User Info - Clickable */}
        <div 
          className={`flex items-start gap-3 ${onClick ? 'cursor-pointer' : ''}`}
          onClick={() => onClick?.(user)}
        >
          <Avatar className="h-14 w-14 border-2 border-slate-300 shadow-md flex-shrink-0 ring-2 ring-slate-100">
            {user.avatar_url && (
              <AvatarImage 
                src={user.avatar_url} 
                alt={user.full_name || user.email || "User"} 
                className="object-cover hover:scale-105 transition-transform"
              />
            )}
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-200 text-blue-800 font-bold text-lg border border-blue-200">
              {user.full_name ? 
                getInitials(user.full_name) :
                <UserIcon className="h-6 w-6" />
              }
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getRoleIcon(user.role)}
              <h3 className="font-semibold text-sm sm:text-base truncate text-slate-900">
                {user.full_name || 'No name provided'}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 truncate font-medium">
              {user.email || 'No email'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs font-medium">
                {user.role}
              </Badge>
              <span className="text-xs text-slate-500 font-medium">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          {/* Payment Status */}
          {showPaymentStatus && (
            <div className="flex items-center gap-2">
              {isPaid ? (
                <Badge variant="default" className="bg-green-600 text-white">
                  <DollarSign className="h-3 w-3 mr-1" />
                  PAID
                </Badge>
              ) : stipendAmount ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPayout?.(user);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  {formatCurrency(stipendAmount)}
                </Button>
              ) : null}
            </div>
          )}

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-48">
              <DropdownMenuItem onClick={() => onView(user)}>
                <Eye className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(user)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};