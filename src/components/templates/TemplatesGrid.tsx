
import { TemplateCard } from "./TemplateCard";
import type { ContractTemplate } from "@/hooks/useContractTemplates";

interface TemplatesGridProps {
  templates: ContractTemplate[];
  onView: (template: ContractTemplate) => void;
  onEdit: (template: ContractTemplate) => void;
  onCopy: (template: ContractTemplate) => void;
  onDelete: (id: string) => void;
  onUseTemplate?: (templateContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => void;
}

export const TemplatesGrid = ({
  templates,
  onView,
  onEdit,
  onCopy,
  onDelete,
  onUseTemplate
}: TemplatesGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onView={onView}
          onEdit={onEdit}
          onCopy={onCopy}
          onDelete={onDelete}
          onUseTemplate={onUseTemplate}
        />
      ))}
    </div>
  );
};
