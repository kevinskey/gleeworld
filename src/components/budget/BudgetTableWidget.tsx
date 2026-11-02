import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmPill, type ConfirmPillRequest } from "@/components/ui/confirm-pill";

interface Column {
  key: string;
  label: string;
  type: 'text' | 'number' | 'money' | 'url' | 'calculated';
  placeholder?: string;
  defaultValue?: any;
  optional?: boolean;
  readOnly?: boolean;
}

interface BudgetTableWidgetProps {
  title: string;
  description: string;
  items: any[];
  onAddItem: (item: any) => void;
  onUpdateItem: (id: string, updates: any) => void;
  onDeleteItem: (id: string) => void;
  columns: Column[];
}

export const BudgetTableWidget = ({ 
  title, 
  description, 
  items, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem, 
  columns 
}: BudgetTableWidgetProps) => {
  const [newItem, setNewItem] = useState<any>({});
  const [confirmDelete, setConfirmDelete] = useState<(ConfirmPillRequest & { id: string }) | null>(null);

  const handleAddItem = () => {
    const itemData = columns.reduce((acc, col) => {
      acc[col.key] = newItem[col.key] || col.defaultValue || (col.type === 'number' || col.type === 'money' ? 0 : '');
      return acc;
    }, {} as any);
    
    onAddItem(itemData);
    setNewItem({});
  };

  const formatValue = (value: any, type: string) => {
    if (type === 'money') {
      return typeof value === 'number' ? `$${value.toFixed(2)}` : '$0.00';
    }
    return value || '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                {columns.map(col => (
                  <TableCell key={col.key}>
                    {col.readOnly ? (
                      <span>{formatValue(item[col.key], col.type)}</span>
                    ) : (
                      <Input
                        type={col.type === 'number' || col.type === 'money' ? 'number' : 'text'}
                        value={item[col.key] || ''}
                        onChange={(e) => {
                          const value = col.type === 'number' || col.type === 'money' 
                            ? parseFloat(e.target.value) || 0 
                            : e.target.value;
                          onUpdateItem(item.id, { [col.key]: value });
                        }}
                        step={col.type === 'money' ? '0.01' : undefined}
                        className="w-full"
                      />
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => setConfirmDelete({ id: item.id, x: e.clientX, y: e.clientY, message: `Delete "${item[columns[0]?.key] || 'this item'}" from ${title}?` })}
                    aria-label={`Delete ${item[columns[0]?.key] || 'item'}`}
                    title={`Delete ${item[columns[0]?.key] || 'item'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              {columns.map(col => (
                <TableCell key={col.key}>
                  <Input
                    type={col.type === 'number' || col.type === 'money' ? 'number' : 'text'}
                    placeholder={col.placeholder}
                    value={newItem[col.key] || ''}
                    onChange={(e) => {
                      const value = col.type === 'number' || col.type === 'money' 
                        ? parseFloat(e.target.value) || 0 
                        : e.target.value;
                      setNewItem(prev => ({ ...prev, [col.key]: value }));
                    }}
                    step={col.type === 'money' ? '0.01' : undefined}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button variant="ghost" size="sm" onClick={handleAddItem} aria-label={`Add item to ${title}`} title={`Add item to ${title}`}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <ConfirmPill
        request={confirmDelete}
        onConfirm={() => {
          const id = confirmDelete?.id;
          setConfirmDelete(null);
          if (id) onDeleteItem(id);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Card>
  );
};