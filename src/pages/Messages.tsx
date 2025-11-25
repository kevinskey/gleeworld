import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { GroupMessageInterface } from "@/components/notifications/GroupMessageInterface";

export default function Messages() {
  return (
    <UniversalLayout containerized={false}>
      <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden">
        <GroupMessageInterface />
      </div>
    </UniversalLayout>
  );
}
