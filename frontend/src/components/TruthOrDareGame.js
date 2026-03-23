import React, { useState, useEffect } from 'react';
import { X, RefreshCcw, Sparkles, Star, Flame, Crown } from 'lucide-react';

// Truth or Dare questions/dares
const TRUTHS = [
  "What's your most embarrassing moment?",
  "What's a secret you've never told anyone?",
  "Who was your first crush?",
  "What's the worst lie you've ever told?",
  "What's your biggest fear?",
  "Have you ever cheated on a test?",
  "What's something you're guilty about?",
  "What's the most childish thing you still do?",
  "Who do you secretly dislike?",
  "What's your guilty pleasure?",
  "What's the worst date you've been on?",
  "Have you ever had a crush on a friend's partner?",
  "What's the meanest thing you've ever done?",
  "What's your most unpopular opinion?",
  "What's the last thing you searched on your phone?"
];

const DARES = [
  "Do your best dance move for 10 seconds",
  "Make a funny face and hold it for 30 seconds",
  "Talk in an accent for the next 2 minutes",
  "Sing a song of your partner's choice",
  "Tell a joke (it has to be funny!)",
  "Do 10 jumping jacks on camera",
  "Speak in slow motion for 1 minute",
  "Try to lick your elbow",
  "Do your best impression of a celebrity",
  "Pretend to be a news anchor reporting breaking news",
  "Make up a rap about your day",
  "Do your best animal impression",
  "Speak in a robot voice for 2 minutes",
  "Try to juggle 3 items",
  "Do a dramatic reading of a random text message"
];

const TruthOrDareGame = ({ 
  isOpen, 
  onClose, 
  myScore = 0, 
  partnerScore = 0,
  onScoreUpdate,
  isPremium 
}) => {
  const [currentType, setCurrentType] = useState(null); // 'truth' or 'dare'
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [completed, setCompleted] = useState(0);

  const spinWheel = (type) => {
    setIsSpinning(true);
    setCurrentType(type);
    
    // Simulate spinning animation
    setTimeout(() => {
      const list = type === 'truth' ? TRUTHS : DARES;
      const randomIndex = Math.floor(Math.random() * list.length);
      setCurrentQuestion(list[randomIndex]);
      setIsSpinning(false);
    }, 1000);
  };

  const handleComplete = () => {
    setCompleted(prev => prev + 1);
    onScoreUpdate?.(1);
    setCurrentQuestion('');
    setCurrentType(null);
  };

  const handleSkip = () => {
    setCurrentQuestion('');
    setCurrentType(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      {/* Compact card overlay - doesn't block video */}
      <div className="pointer-events-auto w-full max-w-sm mx-4">
        <div className="bg-gradient-to-br from-[#1a1a2e]/95 to-[#0f0f1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-pink-500/10 to-purple-500/10">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-pink-400" />
              <h3 className="font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Truth or Dare
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm">
                <Star size={14} className="text-yellow-400" />
                <span className="text-yellow-400 font-bold">{completed}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {!currentQuestion ? (
              <div className="space-y-3">
                <p className="text-center text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Choose your fate...
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => spinWheel('truth')}
                    disabled={isSpinning}
                    className="py-4 px-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 hover:from-blue-500/30 hover:to-blue-600/20 border border-blue-500/30 rounded-xl transition-all disabled:opacity-50 group"
                  >
                    <div className="text-2xl mb-1">🤔</div>
                    <span className="font-bold text-blue-400 group-hover:text-blue-300">Truth</span>
                  </button>
                  <button
                    onClick={() => spinWheel('dare')}
                    disabled={isSpinning}
                    className="py-4 px-4 bg-gradient-to-br from-red-500/20 to-red-600/10 hover:from-red-500/30 hover:to-red-600/20 border border-red-500/30 rounded-xl transition-all disabled:opacity-50 group"
                  >
                    <div className="text-2xl mb-1">🔥</div>
                    <span className="font-bold text-red-400 group-hover:text-red-300">Dare</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Question/Dare display */}
                <div className={`p-4 rounded-xl ${
                  currentType === 'truth' 
                    ? 'bg-blue-500/10 border border-blue-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {currentType === 'truth' ? (
                      <span className="text-blue-400 text-sm font-bold uppercase">Truth</span>
                    ) : (
                      <span className="text-red-400 text-sm font-bold uppercase">Dare</span>
                    )}
                  </div>
                  <p className="text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {isSpinning ? '...' : currentQuestion}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 text-sm font-medium transition-all"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleComplete}
                    className={`flex-1 py-2 rounded-xl text-white text-sm font-bold transition-all ${
                      currentType === 'truth'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    Done! +1 Point
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruthOrDareGame;
