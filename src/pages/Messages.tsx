import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { GroupMessageInterface } from "@/components/notifications/GroupMessageInterface";

export default function Messages() {
  return (
    <UniversalLayout containerized={false}>
      <div className="flex flex-col h-[100dvh] md:h-[calc(100dvh-4rem)] overflow-hidden">
        <GroupMessageInterface />
      </div>
    </UniversalLayout>
  );
}
