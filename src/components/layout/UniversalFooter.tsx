
import { Link, useNavigate } from "react-router-dom";

export const UniversalFooter = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="relative z-20 bg-[hsl(208,100%,20%)] border-t border-white/10 mt-auto pb-14 sm:pb-0">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          {/* Company Info */}
          <div className="text-center sm:text-left">
            <h3 className="text-sm sm:text-lg font-semibold text-white mb-0.5 sm:mb-1">Glee World</h3>
            <p className="text-white/70 text-xs sm:text-sm">
              The home of your favorite band or choir
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center cursor-pointer" onClick={() => navigate('/')}>
            <h4 className="text-sm sm:text-base font-medium text-white mb-0.5 sm:mb-1">Quick Links</h4>
            <div className="flex sm:flex-col gap-3 sm:gap-1 justify-center">
              <Link 
                to="/dashboard" 
                className="text-white/70 hover:text-white text-xs sm:text-sm transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/" 
                className="text-white/70 hover:text-white text-xs sm:text-sm transition-colors"
              >
                HomePage
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="text-center sm:text-right">
            <h4 className="text-sm sm:text-base font-medium text-white mb-0.5 sm:mb-1">Support</h4>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-white/70 text-xs sm:text-sm">Need help?</p>
              <a 
                href="mailto:admin@gleeworld.org" 
                className="text-white/70 hover:text-white text-xs sm:text-sm transition-colors underline"
              >
                Contact Your Administrator
              </a>
            </div>
          </div>
        </div>

        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20 text-center">
          <p className="text-white/60 text-xs sm:text-sm">
            © {currentYear} Glee World. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
