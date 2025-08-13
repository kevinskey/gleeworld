import { Auth } from "@supabase/auth-ui-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const AuthPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Welcome to GleeWorld
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary))',
                }
              }
            },
            className: {
              container: "w-full",
              button: "w-full bg-primary text-primary-foreground hover:bg-primary/90",
              input: "border-border bg-background",
            },
          }}
          providers={[]}
        />
      </div>
    </div>
  );
};

export default AuthPage;