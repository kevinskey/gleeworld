
import { TemplateCard } from "./TemplateCard";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

interface TemplatesGridProps {
  templates: ContractTemplate[];
  onView: (template: ContractTemplate) => void;
  onEdit: (template: ContractTemplate) => void;
  onCopy: (template: ContractTemplate) => void;
  onDelete: (id: string) => void;
  onContractCreated?: () => void;
}

export const TemplatesGrid = ({
  templates,
  onView,
  onEdit,
  onCopy,
  onDelete,
  onContractCreated
}: TemplatesGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onView={() => onView(template)}
          onEdit={onEdit}
          onCopy={onCopy}
          onDelete={onDelete}
          onContractCreated={onContractCreated}
        />
      ))}
    </div>
  );
};
