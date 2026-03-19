import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { GroupMessageInterface } from "@/components/notifications/GroupMessageInterface";

export default function Messages() {
  return (
    <UniversalLayout containerized={false}>
      <div className="flex flex-col min-h-[100dvh] md:h-[calc(100dvh-4rem)] md:overflow-hidden pb-20 sm:pb-0">
        <GroupMessageInterface />
      </div>
    </UniversalLayout>
  );
}
