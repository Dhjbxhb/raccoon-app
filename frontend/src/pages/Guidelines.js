import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Heart, AlertTriangle, Ban, MessageCircle, Shield, ThumbsUp, ThumbsDown } from 'lucide-react';

const Guidelines = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#030305] via-[#0a0515] to-[#030305]" />
      </div>

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
              <Users size={20} className="text-[#7c3aed]" />
              <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Community Guidelines</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12 max-w-3xl">
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12">
            <div className="prose prose-invert max-w-none">
              {/* Intro */}
              <div className="mb-10 p-6 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-2xl">
                <p className="text-lg text-gray-200 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Raccoon App is a community built on respect, safety, and genuine connections. 
                  These guidelines help ensure everyone has a positive experience. 
                  <strong className="text-white"> Violations will result in warnings, temporary bans, or permanent account termination.</strong>
                </p>
              </div>

              {/* DO Section */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <ThumbsUp className="text-green-400" size={28} />
                  <span className="text-green-400">DO</span> - Be Awesome
                </h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Heart className="text-green-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Be Respectful</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Treat everyone with kindness and respect. Remember there's a real person on the other side.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="text-green-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Have Real Conversations</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Be genuine, be yourself. Ask questions, share stories, make meaningful connections.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Shield className="text-green-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Report Bad Behavior</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Help keep the community safe by reporting users who violate guidelines. Your reports are confidential.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Users className="text-green-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Use Skip Respectfully</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          It's okay to skip if you're not clicking with someone. Just be polite if you say goodbye first.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DON'T Section */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <ThumbsDown className="text-red-400" size={28} />
                  <span className="text-red-400">DON'T</span> - Instant Ban
                </h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Ban className="text-red-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No Nudity or Sexual Content</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Exposing yourself, sharing explicit images, or engaging in sexual behavior on camera will result in 
                          <strong className="text-red-400"> immediate permanent ban</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No Harassment or Bullying</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Threatening, insulting, stalking, or repeatedly contacting someone who asked you to stop is not tolerated.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Ban className="text-red-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No Hate Speech</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Racism, sexism, homophobia, transphobia, or any form of discrimination has zero tolerance here.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No Spam or Scams</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Promoting products, sharing links, asking for money, or running any kind of scam is prohibited.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Ban className="text-red-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No Minors</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          This platform is strictly 18+. Anyone under 18 or any content involving minors will be immediately 
                          reported to authorities.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-400 mt-1" size={20} />
                      <div>
                        <h3 className="font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>No Recording Without Consent</h3>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Recording, screenshotting, or sharing conversations without the other person's consent is a serious violation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consequences */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Consequences</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="text-2xl">1</div>
                    <div>
                      <h3 className="font-bold text-yellow-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Warning</h3>
                      <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>First minor offense - educational warning</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <div className="text-2xl">2</div>
                    <div>
                      <h3 className="font-bold text-orange-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Temporary Ban</h3>
                      <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>24 hours to 30 days depending on severity</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="text-2xl">3</div>
                    <div>
                      <h3 className="font-bold text-red-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Permanent Ban</h3>
                      <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Severe violations or repeated offenses - no appeal</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Note */}
              <div className="p-6 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-2xl text-center">
                <p className="text-lg text-gray-200 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  We want Raccoon App to be a fun, safe place for everyone. 
                  Following these guidelines helps build a community we can all enjoy.
                </p>
                <p className="text-[#7c3aed] font-bold mt-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Be cool. Be kind. Be a Raccoon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guidelines;
