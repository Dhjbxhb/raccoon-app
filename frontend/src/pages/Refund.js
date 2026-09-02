import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, RefreshCcw, Clock, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import SpaceBackground from '@/components/background/SpaceBackground';

const Refund = () => {
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
              <CreditCard size={20} className="text-[#7c3aed]" />
              <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Refund Policy</span>
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

              {/* Subscription Overview */}
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Subscription Plans</h2>
              <p className="text-gray-300 mb-4 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Raccoon App Premium is available in the following subscription tiers:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Weekly</h3>
                  <p className="text-2xl font-bold text-[#7c3aed]">$2.99</p>
                  <p className="text-gray-500 text-sm">per week</p>
                </div>
                <div className="p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl text-center">
                  <h3 className="font-bold text-lg text-yellow-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Monthly</h3>
                  <p className="text-2xl font-bold text-yellow-400">$7.99</p>
                  <p className="text-gray-500 text-sm">per month</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>3 Months</h3>
                  <p className="text-2xl font-bold text-[#7c3aed]">$19.99</p>
                  <p className="text-gray-500 text-sm">every 3 months</p>
                </div>
              </div>

              {/* Billing */}
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Billing & Renewal</h2>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <RefreshCcw className="text-[#7c3aed] mt-1" size={20} />
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Automatic Renewal</h3>
                    <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Subscriptions automatically renew at the end of each billing period unless cancelled. 
                      You will be charged the same amount for each renewal period.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <Clock className="text-[#7c3aed] mt-1" size={20} />
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Cancellation</h3>
                    <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      You can cancel your subscription at any time. After cancellation, you will continue 
                      to have access to premium features until the end of your current billing period.
                    </p>
                  </div>
                </div>
              </div>

              {/* Refund Policy */}
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Refund Eligibility</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <CheckCircle className="text-green-400 mt-1" size={20} />
                  <div>
                    <h3 className="font-bold mb-1 text-green-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Eligible for Refund</h3>
                    <ul className="text-gray-400 text-sm space-y-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <li>• First-time subscribers within 48 hours of purchase (no usage)</li>
                      <li>• Technical issues preventing use of premium features (with evidence)</li>
                      <li>• Duplicate charges or billing errors</li>
                      <li>• Account terminated due to our error</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="text-red-400 mt-1" size={20} />
                  <div>
                    <h3 className="font-bold mb-1 text-red-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Not Eligible for Refund</h3>
                    <ul className="text-gray-400 text-sm space-y-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <li>• Subscription used for more than 48 hours</li>
                      <li>• Account banned for Terms of Service violations</li>
                      <li>• "Change of mind" after using premium features</li>
                      <li>• Dissatisfaction with match quality (not guaranteed)</li>
                      <li>• Partial refunds for unused time after cancellation</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How to Request */}
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>How to Request a Refund</h2>
              <div className="p-6 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-2xl mb-8">
                <div className="flex items-start gap-4">
                  <Mail className="text-[#7c3aed] mt-1" size={24} />
                  <div>
                    <p className="text-gray-300 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      To request a refund, email us at:
                    </p>
                    <p className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      <a href="mailto:raccoonapp.support@gmail.com" className="text-[#7c3aed] hover:underline">raccoonapp.support@gmail.com</a>
                    </p>
                    <p className="text-gray-400 text-sm mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Please include:
                    </p>
                    <ul className="text-gray-400 text-sm mt-2 space-y-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <li>• Your account email</li>
                      <li>• Date of purchase</li>
                      <li>• Reason for refund request</li>
                      <li>• Any relevant screenshots or evidence</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Processing Time */}
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Processing Time</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Refund requests are reviewed within 3-5 business days. If approved, refunds are processed 
                within 5-10 business days and will appear on your original payment method. The exact timing 
                depends on your bank or credit card provider.
              </p>

              {/* Payment Security */}
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Payment Security</h2>
              <p className="text-gray-300 mb-6 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                All payments are processed securely through Stripe. We never store your full credit card 
                information on our servers. Stripe is PCI-DSS Level 1 certified, the highest level of 
                security certification available in the payments industry.
              </p>

              {/* Contact */}
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Questions?</h2>
              <p className="text-gray-300 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                If you have questions about billing or refunds, contact our support team at 
                <a href="mailto:raccoonapp.support@gmail.com" className="text-[#7c3aed] font-bold hover:underline"> raccoonapp.support@gmail.com</a>. 
                We're here to help!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Refund;
