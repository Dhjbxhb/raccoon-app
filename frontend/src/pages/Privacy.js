import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Database, Lock } from 'lucide-react';
import SpaceBackground from '@/components/background/SpaceBackground';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-white relative">
      {/* Cinematic space background */}
      <SpaceBackground intensity="minimal" showNebula={true} showRedGlow={false} showShootingStars={false} />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#030305]/90 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
              data-testid="back-button"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-[#7c3aed]" />
              <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Privacy Policy</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12 max-w-3xl">
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12">
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Last Updated: December 2025
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>1. Information We Collect</h2>
              <p className="text-gray-300 mb-4 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Raccoon App collects information to provide and improve our services. We collect:
              </p>
              
              <h3 className="text-xl font-bold mb-3 text-[#7c3aed]" style={{ fontFamily: 'Outfit, sans-serif' }}>Account Information</h3>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li>Email address (for registered users)</li>
                <li>Username</li>
                <li>Password (encrypted)</li>
                <li>Date of birth (to verify age requirement)</li>
                <li>Gender (optional, for matching preferences)</li>
              </ul>

              <h3 className="text-xl font-bold mb-3 text-[#7c3aed]" style={{ fontFamily: 'Outfit, sans-serif' }}>Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li>IP address (used for country detection and security)</li>
                <li>Device information (browser type, operating system)</li>
                <li>Usage data (features used, session duration, interactions)</li>
                <li>Approximate location (derived from IP, not precise GPS)</li>
              </ul>

              <h3 className="text-xl font-bold mb-3 text-[#7c3aed]" style={{ fontFamily: 'Outfit, sans-serif' }}>Communication Data</h3>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li>Chat messages (temporarily stored for moderation purposes)</li>
                <li>Reports submitted by or about you</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>2. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li><strong className="text-white">Provide Services:</strong> Match you with other users, enable chat and video features</li>
                <li><strong className="text-white">Safety & Moderation:</strong> Detect and prevent abuse, fraud, and violations of our Terms</li>
                <li><strong className="text-white">Improve Service:</strong> Analyze usage patterns to improve features and user experience</li>
                <li><strong className="text-white">Communication:</strong> Send service updates, security alerts, and support messages</li>
                <li><strong className="text-white">Payment Processing:</strong> Process premium subscriptions (via Stripe)</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>3. Data Storage & Security</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li>Passwords are encrypted using secure hashing algorithms</li>
                <li>All data transmission is encrypted via HTTPS/TLS</li>
                <li>Chat messages are not permanently stored and are deleted after sessions end</li>
                <li>Video calls are peer-to-peer and not recorded by Raccoon App</li>
                <li>Access to user data is restricted to authorized personnel only</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>4. Cookies & Tracking</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We use essential cookies to maintain your session and remember your preferences. These cookies are 
                necessary for the Service to function properly. We do not use third-party advertising cookies or 
                tracking pixels. You can manage cookie preferences in your browser settings, but disabling cookies 
                may affect Service functionality.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>5. Third-Party Services</h2>
              <p className="text-gray-300 mb-4 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We use the following third-party services:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li><strong className="text-white">Stripe:</strong> For payment processing. Stripe's privacy policy applies to payment data.</li>
                <li><strong className="text-white">Firebase (optional):</strong> For social login authentication (Google, Apple). Firebase's privacy policy applies.</li>
                <li><strong className="text-white">IP Geolocation Services:</strong> To detect your country for matching features.</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>6. Data Sharing</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We do not sell your personal information. We may share data only in these circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li>With your consent</li>
                <li>With service providers who assist in operating our Service</li>
                <li>To comply with legal obligations or law enforcement requests</li>
                <li>To protect the rights, property, or safety of Raccoon App and its users</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>7. Your Rights</h2>
              <p className="text-gray-300 mb-4 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li><strong className="text-white">Access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-white">Correction:</strong> Update or correct your information</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your account and data</li>
                <li><strong className="text-white">Portability:</strong> Request your data in a portable format</li>
                <li><strong className="text-white">Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                To exercise these rights, contact us at <a href="mailto:raccoonapp.support@gmail.com" className="text-[#7c3aed] font-bold hover:underline">raccoonapp.support@gmail.com</a>
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>8. Data Retention</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We retain your account information for as long as your account is active. Chat messages are 
                automatically deleted after sessions end. If you delete your account, we will remove your 
                personal data within 30 days, except where we are required to retain it for legal purposes.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>9. Children's Privacy</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Raccoon App is strictly for users 18 years and older. We do not knowingly collect information 
                from anyone under 18. If we discover that we have collected data from a minor, we will 
                immediately delete that information and terminate the account.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>10. Changes to This Policy</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We may update this Privacy Policy from time to time. We will notify you of significant changes 
                through the Service or via email. The "Last Updated" date at the top indicates when the policy 
                was last revised.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>11. Contact Us</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                For privacy-related questions or concerns, contact us at <a href="mailto:raccoonapp.support@gmail.com" className="text-[#7c3aed] font-bold hover:underline">raccoonapp.support@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
