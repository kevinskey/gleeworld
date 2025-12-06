import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { GroupMessageInterface } from "@/components/notifications/GroupMessageInterface";
import { ModulePageHeader } from "@/components/shared/ModulePageHeader";
import { MessageSquare } from "lucide-react";

export default function Messages() {
  return (
    <UniversalLayout containerized={false}>
      <div className="flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ModulePageHeader title="Messages" icon={MessageSquare} />
        <div className="flex-1 overflow-hidden mt-4">
          <GroupMessageInterface />
        </div>
      </div>
    </UniversalLayout>
  );
}
