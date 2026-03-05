
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";

interface AuthTabsProps {
  forceReset?: boolean;
}

export const AuthTabs = ({ forceReset }: AuthTabsProps = {}) => {
  const [activeTab, setActiveTab] = useState("login");
  const [searchParams] = useSearchParams();
  const hash = window.location.hash;
  const isReset = forceReset
    || searchParams.get('reset') === 'true' 
    || hash.includes('type=recovery') 
    || hash.includes('type=password_recovery')
    || sessionStorage.getItem('password_recovery_active') === 'true';

  // If it's a password reset, show the reset form directly
  if (isReset) {
    return <ResetPasswordForm />;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-white/20 border border-white/30">
        <TabsTrigger value="login" className="data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80">Sign In</TabsTrigger>
        <TabsTrigger value="signup" className="data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80">Sign Up</TabsTrigger>
      </TabsList>
      
      <TabsContent value="login" className="space-y-4">
        <LoginForm onSwitchToForgot={() => setActiveTab("forgot")} />
      </TabsContent>
      
      <TabsContent value="signup" className="space-y-4">
        <SignupForm />
      </TabsContent>
      
      <TabsContent value="forgot" className="space-y-4">
        <ForgotPasswordForm onSwitchToLogin={() => setActiveTab("login")} />
      </TabsContent>
    </Tabs>
  );
};
