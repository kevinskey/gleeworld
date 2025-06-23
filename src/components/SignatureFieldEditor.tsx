
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, FileSignature, Calendar, Type, User, UserCheck } from "lucide-react";

export interface SignatureField {
  id: number;
  label: string;
  type: 'signature' | 'date' | 'text' | 'initials' | 'username';
  page: number;
  x: number;
  y: number;
  required: boolean;
}

interface SignatureFieldEditorProps {
  fields: SignatureField[];
  onFieldsChange: (fields: SignatureField[]) => void;
}

export const SignatureFieldEditor = ({ fields, onFieldsChange }: SignatureFieldEditorProps) => {
  const [expandedField, setExpandedField] = useState<number | null>(null);

  const addField = (type: SignatureField['type']) => {
    const newField: SignatureField = {
      id: Date.now(),
      label: getDefaultLabel(type),
      type,
      page: 1,
      x: 100,
      y: 100,
      required: true
    };
    onFieldsChange([...fields, newField]);
    setExpandedField(newField.id);
  };

  const updateField = (id: number, updates: Partial<SignatureField>) => {
    onFieldsChange(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: number) => {
    onFieldsChange(fields.filter(field => field.id !== id));
    if (expandedField === id) {
      setExpandedField(null);
    }
  };

  const getDefaultLabel = (type: SignatureField['type']) => {
    switch (type) {
      case 'signature': return `Signature ${fields.filter(f => f.type === 'signature').length + 1}`;
      case 'initials': return `Initials ${fields.filter(f => f.type === 'initials').length + 1}`;
      case 'date': return `Date ${fields.filter(f => f.type === 'date').length + 1}`;
      case 'text': return `Text Field ${fields.filter(f => f.type === 'text').length + 1}`;
      case 'username': return `Username ${fields.filter(f => f.type === 'username').length + 1}`;
    }
  };

  const getFieldIcon = (type: SignatureField['type']) => {
    switch (type) {
      case 'signature': return <FileSignature className="h-4 w-4" />;
      case 'initials': return <User className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      case 'text': return <Type className="h-4 w-4" />;
      case 'username': return <UserCheck className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Document Fields</Label>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => addField('signature')}
            className="text-xs"
          >
            <FileSignature className="h-3 w-3 mr-1" />
            Signature
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => addField('initials')}
            className="text-xs"
          >
            <User className="h-3 w-3 mr-1" />
            Initials
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => addField('date')}
            className="text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Date
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => addField('text')}
            className="text-xs"
          >
            <Type className="h-3 w-3 mr-1" />
            Text
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => addField('username')}
            className="text-xs"
          >
            <UserCheck className="h-3 w-3 mr-1" />
            Username
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileSignature className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center mb-4">
              No fields added yet. Add signature fields, date fields, text fields, or username fields to your document.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addField('signature')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Signature Field
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <Card key={field.id} className="border">
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFieldIcon(field.type)}
                    <div>
                      <h4 className="font-medium text-sm">{field.label}</h4>
                      <p className="text-xs text-gray-500">
                        {field.type} • Page {field.page} • {field.required ? 'Required' : 'Optional'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(field.id);
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedField === field.id && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`label-${field.id}`} className="text-sm">Field Label</Label>
                      <Input
                        id={`label-${field.id}`}
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="Enter field label"
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`page-${field.id}`} className="text-sm">Page Number</Label>
                      <Input
                        id={`page-${field.id}`}
                        type="number"
                        value={field.page}
                        onChange={(e) => updateField(field.id, { page: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`x-${field.id}`} className="text-sm">X Position</Label>
                      <Input
                        id={`x-${field.id}`}
                        type="number"
                        value={field.x}
                        onChange={(e) => updateField(field.id, { x: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`y-${field.id}`} className="text-sm">Y Position</Label>
                      <Input
                        id={`y-${field.id}`}
                        type="number"
                        value={field.y}
                        onChange={(e) => updateField(field.id, { y: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`required-${field.id}`}
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`required-${field.id}`} className="text-sm">
                        Required field
                      </Label>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
