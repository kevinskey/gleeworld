
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  const navigate = useNavigate();
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-cover bg-no-repeat bg-center md:bg-left-center"
      style={{
        backgroundImage: `url(/lovable-uploads/d2719d93-5439-4d49-9d9a-0f68a440e7c5.png)`
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Back to Home Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-20 text-white hover:bg-white/20 border border-white/30"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Button>
      <Card className="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <CardHeader className="text-center space-y-2 relative z-10">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">{title}</h1>
          {subtitle && (
            <p className="text-white/80 drop-shadow-md">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="relative z-10">
          {children}
        </CardContent>
      </Card>
    </div>
  );
};
