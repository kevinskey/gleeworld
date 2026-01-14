
import { Link, useNavigate } from "react-router-dom";

export const UniversalFooter = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="relative z-20 bg-background/95 backdrop-blur-sm border-t border-border mt-auto">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Company Info */}
          <div className="text-center md:text-left col-span-1 md:col-span-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">Glee World</h3>
            <p className="text-foreground/70 text-sm">
              The home of the Spelman College Glee Club
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center col-span-1 md:col-span-1 cursor-pointer" onClick={() => navigate('/')}>
            <h4 className="text-base font-medium text-foreground mb-1">Quick Links</h4>
            <div className="space-y-1">
              <Link 
                to="/dashboard" 
                className="block text-foreground/70 hover:text-foreground text-sm transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/" 
                className="block text-foreground/70 hover:text-foreground text-sm transition-colors"
              >
                HomePage
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="text-center md:text-right col-span-1 md:col-span-1">
            <h4 className="text-base font-medium text-foreground mb-1">Support</h4>
            <div className="space-y-1">
              <p className="text-foreground/70 text-sm">Need help?</p>
              <a 
                href="mailto:admin@gleeworld.org" 
                className="text-foreground/70 hover:text-foreground text-sm transition-colors underline"
              >
                Contact Your Administrator
              </a>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border text-center">
          <p className="text-foreground/60 text-sm">
            © {currentYear} Glee World. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
