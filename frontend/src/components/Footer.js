import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Users, CreditCard } from 'lucide-react';

const Footer = ({ className = '' }) => {
  return (
    <footer className={`relative z-10 border-t border-white/5 bg-black/30 backdrop-blur-sm ${className}`}>
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦝</span>
            <span className="font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Raccoon App
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link 
              to="/terms" 
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <FileText size={14} />
              Terms
            </Link>
            <Link 
              to="/privacy" 
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <Shield size={14} />
              Privacy
            </Link>
            <Link 
              to="/guidelines" 
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <Users size={14} />
              Guidelines
            </Link>
            <Link 
              to="/refund" 
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <CreditCard size={14} />
              Refund
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-sm text-gray-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
            © {new Date().getFullYear()} Raccoon App. 18+ only.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
