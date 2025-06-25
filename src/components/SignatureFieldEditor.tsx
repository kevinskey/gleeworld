
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import type { SignatureField } from "@/types/signatureField";

interface SignatureFieldEditorProps {
  fields: SignatureField[];
  onFieldsChange: (fields: SignatureField[]) => void;
}

export const SignatureFieldEditor = ({ fields, onFieldsChange }: SignatureFieldEditorProps) => {
  const addField = () => {
    const newField: SignatureField = {
      id: Date.now(),
      label: "New Signature Field",
      type: 'signature',
      required: true,
      page: 1,
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      font_size: 12
    };
    onFieldsChange([...fields, newField]);
  };

  const updateField = (id: number, updates: Partial<SignatureField>) => {
    const updatedFields = fields.map(field =>
      field.id === id ? { ...field, ...updates } : field
    );
    onFieldsChange(updatedFields);
  };

  const removeField = (id: number) => {
    onFieldsChange(fields.filter(field => field.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Signature Fields
          <Button onClick={addField} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <Card key={field.id} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Field Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Field label"
                />
              </div>

              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value: SignatureField['type']) => updateField(field.id, { type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signature">Signature</SelectItem>
                    <SelectItem value="initials">Initials</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="username">Username</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Required</Label>
                <Select
                  value={field.required ? "true" : "false"}
                  onValueChange={(value) => updateField(field.id, { required: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Page</Label>
                <Input
                  type="number"
                  value={field.page}
                  onChange={(e) => updateField(field.id, { page: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>X Position</Label>
                <Input
                  type="number"
                  value={field.x}
                  onChange={(e) => updateField(field.id, { x: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Y Position</Label>
                <Input
                  type="number"
                  value={field.y}
                  onChange={(e) => updateField(field.id, { y: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Width</Label>
                <Input
                  type="number"
                  value={field.width}
                  onChange={(e) => updateField(field.id, { width: parseInt(e.target.value) || 200 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Height</Label>
                <Input
                  type="number"
                  value={field.height}
                  onChange={(e) => updateField(field.id, { height: parseInt(e.target.value) || 50 })}
                />
              </div>

              <div className="space-y-2 flex items-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeField(field.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No signature fields added yet. Click "Add Field" to create your first signature field.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export type { SignatureField };
