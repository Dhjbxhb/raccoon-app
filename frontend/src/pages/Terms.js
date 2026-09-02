import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Scale } from 'lucide-react';
import SpaceBackground from '@/components/background/SpaceBackground';

const Terms = () => {
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
              <Scale size={20} className="text-[#7c3aed]" />
              <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Terms of Service</span>
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

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>1. Acceptance of Terms</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                By accessing or using Raccoon App ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, you may not use the Service. The Service is operated by Raccoon App 
                and is intended for users who are at least 18 years of age.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>2. Age Requirement</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <strong className="text-white">You must be at least 18 years old to use Raccoon App.</strong> By using our 
                Service, you represent and warrant that you are at least 18 years of age. We reserve the right to 
                terminate accounts of users who misrepresent their age. Providing false information about your age 
                is a violation of these Terms and may result in permanent account suspension.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>3. User Responsibilities</h2>
              <p className="text-gray-300 mb-4 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                As a user of Raccoon App, you agree to:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li>Provide accurate and truthful information about yourself</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Service in compliance with all applicable laws</li>
                <li>Treat other users with respect and dignity</li>
                <li>Report any violations or suspicious activity</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>4. Prohibited Content & Behavior</h2>
              <p className="text-gray-300 mb-4 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                The following activities are strictly prohibited on Raccoon App:
              </p>
              <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <li><strong className="text-white">Nudity & Sexual Content:</strong> Sharing, displaying, or soliciting explicit sexual content, nudity, or sexually suggestive material</li>
                <li><strong className="text-white">Harassment:</strong> Bullying, threatening, intimidating, or stalking other users</li>
                <li><strong className="text-white">Hate Speech:</strong> Content that promotes discrimination based on race, ethnicity, religion, gender, sexual orientation, or disability</li>
                <li><strong className="text-white">Violence:</strong> Threats of violence, graphic violence, or promoting self-harm</li>
                <li><strong className="text-white">Spam & Scams:</strong> Sending unsolicited messages, phishing, or fraudulent schemes</li>
                <li><strong className="text-white">Impersonation:</strong> Pretending to be another person or entity</li>
                <li><strong className="text-white">Illegal Activities:</strong> Using the Service for any unlawful purpose</li>
                <li><strong className="text-white">Minors:</strong> Any content involving or targeting minors</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>5. Account Suspension & Termination</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We reserve the right to suspend or terminate your account at any time for violations of these Terms, 
                including but not limited to: engaging in prohibited behavior, receiving multiple reports from other users, 
                circumventing security measures, or any activity that we determine to be harmful to the community. 
                Suspended or terminated accounts may not create new accounts.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>6. Premium Services</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Raccoon App offers premium subscription services. By purchasing a premium subscription, you agree to the 
                pricing, payment terms, and renewal conditions presented at the time of purchase. Premium subscriptions 
                are billed according to the chosen plan (weekly, monthly, or quarterly). See our Refund Policy for 
                information about cancellations and refunds.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>7. Limitation of Liability</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Raccoon App is provided "as is" without warranties of any kind. We are not liable for any damages 
                arising from your use of the Service, including but not limited to: interactions with other users, 
                content shared by other users, service interruptions, or data loss. You use the Service at your own risk.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>8. Privacy</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Your use of the Service is also governed by our Privacy Policy. By using Raccoon App, you consent to 
                the collection and use of information as described in our Privacy Policy.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>9. Changes to Terms</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                We may update these Terms from time to time. We will notify users of significant changes through the 
                Service or via email. Continued use of the Service after changes constitutes acceptance of the updated Terms.
              </p>

              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>10. Contact</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                If you have questions about these Terms, please contact us at <a href="mailto:raccoonapp.support@gmail.com" className="text-[#7c3aed] font-bold hover:underline">raccoonapp.support@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
