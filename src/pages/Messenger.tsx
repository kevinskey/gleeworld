import { Mail } from "lucide-react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { BackNavigation } from "@/components/shared/BackNavigation";
import { GroupMessageInterface } from "@/components/notifications/GroupMessageInterface";

const Messenger = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="min-h-screen w-full">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
          {/* Back Navigation */}
          <BackNavigation className="mb-4" />
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="rounded-xl p-2.5 sm:p-3 bg-primary/10">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">GleeWorld Messenger</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Send branded emails and SMS to members</p>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
            <GroupMessageInterface />
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Messenger;
