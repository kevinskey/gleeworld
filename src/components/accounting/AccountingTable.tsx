
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { ArrowUpDown } from "lucide-react";

interface AccountingEntry {
  id: string;
  name: string;
  contractTitle: string;
  dateSigned: string;
  stipend: number;
  status: string;
}

interface AccountingTableProps {
  data: AccountingEntry[];
  totalCount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export const AccountingTable = ({ 
  data, 
  totalCount, 
  sortBy, 
  sortOrder, 
  onSort 
}: AccountingTableProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No signed contracts with stipends found.</p>
        {totalCount && totalCount > 0 && (
          <p className="text-sm mt-2">Try adjusting your filters to see more results.</p>
        )}
      </div>
    );
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-4">
      {totalCount && totalCount !== data.length && (
        <div className="text-sm text-gray-600">
          Showing {data.length} of {totalCount} contracts
        </div>
      )}
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {onSort ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => onSort('name')}
                    className="h-auto p-0 font-medium text-left justify-start"
                  >
                    Name {getSortIcon('name')}
                  </Button>
                ) : (
                  'Name'
                )}
              </TableHead>
              <TableHead>
                {onSort ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => onSort('contractTitle')}
                    className="h-auto p-0 font-medium text-left justify-start"
                  >
                    Contract Title {getSortIcon('contractTitle')}
                  </Button>
                ) : (
                  'Contract Title'
                )}
              </TableHead>
              <TableHead>
                {onSort ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => onSort('dateSigned')}
                    className="h-auto p-0 font-medium text-left justify-start"
                  >
                    Date Signed {getSortIcon('dateSigned')}
                  </Button>
                ) : (
                  'Date Signed'
                )}
              </TableHead>
              <TableHead className="text-right">
                {onSort ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => onSort('stipend')}
                    className="h-auto p-0 font-medium text-right justify-end"
                  >
                    Stipend {getSortIcon('stipend')}
                  </Button>
                ) : (
                  'Stipend'
                )}
              </TableHead>
              <TableHead>
                {onSort ? (
                  <Button 
                    variant="ghost" 
                    onClick={() => onSort('status')}
                    className="h-auto p-0 font-medium text-left justify-start"
                  >
                    Status {getSortIcon('status')}
                  </Button>
                ) : (
                  'Status'
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.name}</TableCell>
                <TableCell>{entry.contractTitle}</TableCell>
                <TableCell>{entry.dateSigned}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(entry.stipend)}
                </TableCell>
                <TableCell>
                  <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'}>
                    {entry.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
