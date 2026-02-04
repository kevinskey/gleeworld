import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Heart, GraduationCap, Mail, Home, ArrowRight } from "lucide-react";
import gleeWorldLogoCircle from "@/assets/glee-world-logo-circle.png";

const RegistrationThankYou = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') as 'fan' | 'alumna' | null;

  const roleConfig = {
    fan: {
      title: "Welcome to the GleeWorld Family!",
      subtitle: "Thank you for registering as a Fan/Supporter",
      icon: Heart,
      iconColor: "text-pink-400",
      bgGradient: "from-pink-900/30 via-purple-900/20 to-blue-900/30",
      description: "Your registration is being reviewed by our team. Once approved, you'll have access to exclusive content, concert updates, and community features.",
      features: [
        "Exclusive concert announcements",
        "Behind-the-scenes content",
        "Community forum access",
        "Special fan events"
      ]
    },
    alumna: {
      title: "Welcome Home, Alumna!",
      subtitle: "Thank you for registering with GleeWorld",
      icon: GraduationCap,
      iconColor: "text-purple-400",
      bgGradient: "from-purple-900/30 via-violet-900/20 to-blue-900/30",
      description: "Your registration is being reviewed by our webmaster to verify your alumna status. Once approved, you'll have full access to the Alumnae Portal.",
      features: [
        "Alumnae-only events & reunions",
        "Mentorship program",
        "Memory wall & legacy stories",
        "Directory of Glee Club sisters"
      ]
    }
  };

  const config = role ? roleConfig[role] : roleConfig.fan;
  const Icon = config.icon;

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative"
      style={{
        background: 'linear-gradient(180deg, #0056a6 0%, #0073c9 40%, #55bbee 100%)',
      }}
    >
      {/* Decorative background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient} opacity-50`} />
      
      <Card className="w-full max-w-lg relative z-10 bg-white/15 backdrop-blur-xl border-white/20 shadow-2xl overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <CardContent className="pt-8 pb-8 px-6 relative z-10">
          <div className="text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <img
                src={gleeWorldLogoCircle}
                alt="GleeWorld.org logo"
                className="w-16 h-16 object-contain"
              />
            </div>

            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400/30 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-green-500/20 p-4 rounded-full border-2 border-green-400/50">
                  <CheckCircle className="h-12 w-12 text-green-400" />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <Icon className={`h-6 w-6 ${config.iconColor}`} />
                {config.title}
              </h1>
              <p className="text-white/80">{config.subtitle}</p>
            </div>

            {/* Description */}
            <p className="text-white/70 text-sm leading-relaxed">
              {config.description}
            </p>

            {/* Email Notice */}
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-white/90 text-left">
                  <strong className="text-yellow-300">Check your email!</strong><br />
                  You'll receive a confirmation email once your registration has been approved.
                </p>
              </div>
            </div>

            {/* Features List */}
            <div className="text-left space-y-2">
              <p className="text-white/60 text-xs uppercase tracking-wide font-medium">
                What you'll get access to:
              </p>
              <ul className="space-y-2">
                {config.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-white/80">
                    <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <Button 
                asChild
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
              >
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Return to GleeWorld Home
                </Link>
              </Button>
              
              {role === 'alumna' && (
                <Button 
                  asChild
                  variant="ghost"
                  className="w-full text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Link to="/alumnae">
                    Explore Alumnae Portal (Preview)
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationThankYou;
