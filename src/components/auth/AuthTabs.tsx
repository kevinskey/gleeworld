
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const AuthTabs = () => {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
