import { Mail } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
import { GroupMessageInterface } from "@/components/notifications/GroupMessageInterface";

const Messenger = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header section */}
        <div className="flex-shrink-0 px-3 sm:px-4 py-3 sm:py-4 max-w-7xl mx-auto w-full">
          <BackNavigation className="mb-3" />
          
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 sm:p-3 bg-primary/10">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">GleeWorld Messenger</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Send branded emails and SMS to members</p>
            </div>
          </div>
        </div>
        
        {/* Main Content - takes remaining height */}
        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          <GroupMessageInterface />
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Messenger;
