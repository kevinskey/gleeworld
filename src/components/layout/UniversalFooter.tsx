
import { Link, useNavigate } from "react-router-dom";

export const UniversalFooter = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="relative z-20 bg-background/95 backdrop-blur-sm border-t border-border mt-auto">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Company Info */}
          <div className="text-center md:text-left col-span-1 md:col-span-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">Glee World</h3>
            <p className="text-muted-foreground text-xs">
              The home of the Spelman College Glee Club
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center col-span-1 md:col-span-1 cursor-pointer" onClick={() => navigate('/')}>
            <h4 className="text-sm font-medium text-foreground mb-1">Quick Links</h4>
            <div className="space-y-0.5">
              <Link 
                to="/dashboard" 
                className="block text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/" 
                className="block text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                HomePage
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="text-center md:text-right col-span-1 md:col-span-1">
            <h4 className="text-sm font-medium text-foreground mb-1">Support</h4>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs">Need help?</p>
              <a 
                href="mailto:admin@gleeworld.org" 
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                Contact Your Administrator
              </a>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-border text-center">
          <p className="text-muted-foreground text-xs">
            © {currentYear} Glee World. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
