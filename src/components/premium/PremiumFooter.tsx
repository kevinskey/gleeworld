/**
 * PREMIUM FOOTER COMPONENT
 * Dark themed footer with links and branding
 */

import React from 'react';
import { Music, Twitter, Instagram, Youtube, Facebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const platformLinks = [
  { label: 'Features', path: '/features' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Courses', path: '/courses' },
  { label: 'Community', path: '/community' },
];

const supportLinks = [
  { label: 'Help Center', path: '/help' },
  { label: 'Contact', path: '/contact' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
];

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com' },
  { icon: Instagram, href: 'https://instagram.com' },
  { icon: Youtube, href: 'https://youtube.com' },
  { icon: Facebook, href: 'https://facebook.com' },
];

export const PremiumFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-[#050505] border-t border-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg tracking-wide">GLEEWORLD</h3>
                <p className="text-[#666666] text-xs uppercase tracking-wider">Premium Platform</p>
              </div>
            </div>
            <p className="text-[#666666] text-sm mb-6 max-w-xs">
              Empowering musicians worldwide with premium education, community, and resources.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#666666] hover:text-white hover:bg-[#333333] transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide">PLATFORM</h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.path}>
                  <button
                    onClick={() => navigate(link.path)}
                    className="text-[#666666] hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide">SUPPORT</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.path}>
                  <button
                    onClick={() => navigate(link.path)}
                    className="text-[#666666] hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#1A1A1A] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#666666] text-xs">
            © {new Date().getFullYear()} GleeWorld. All rights reserved.
          </p>
          <p className="text-[#444444] text-xs uppercase tracking-wider">
            Designed for Excellence
          </p>
        </div>
      </div>
    </footer>
  );
};
