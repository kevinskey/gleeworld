
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get('reset') === 'true';

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <AuthLayout 
      title={isReset ? "Reset Password" : "Welcome Back to Glee World!"}
      subtitle={isReset ? "Enter your new password" : "Sign in to your account or create a new one"}
    >
      <AuthTabs />
    </AuthLayout>
  );
};

export default Auth;
