
import { Link } from "react-router-dom";

export const UniversalFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/5 backdrop-blur-md border-t border-white/20 mt-auto">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Contract Manager</h3>
            <p className="text-white/70 text-xs sm:text-sm">
              Streamlining contract management and digital workflows
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h4 className="text-sm sm:text-md font-medium text-white mb-2">Quick Links</h4>
            <div className="space-y-1">
              <Link 
                to="/dashboard" 
                className="block text-white/70 hover:text-white text-xs sm:text-sm transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/w9-form" 
                className="block text-white/70 hover:text-white text-xs sm:text-sm transition-colors"
              >
                W9 Forms
              </Link>
            </div>
          </div>

          {/* Legal/Support */}
          <div className="text-center md:text-right">
            <h4 className="text-sm sm:text-md font-medium text-white mb-2">Support</h4>
            <div className="space-y-1">
              <p className="text-white/70 text-xs sm:text-sm">Need help?</p>
              <p className="text-white/70 text-xs sm:text-sm">Contact your administrator</p>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/20 text-center">
          <p className="text-white/50 text-xs sm:text-sm">
            © {currentYear} Contract Manager. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
