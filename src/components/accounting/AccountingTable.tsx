
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

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
}

export const AccountingTable = ({ data }: AccountingTableProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No signed contracts with stipends found.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contract Title</TableHead>
            <TableHead>Date Signed</TableHead>
            <TableHead className="text-right">Stipend</TableHead>
            <TableHead>Status</TableHead>
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
  );
};
