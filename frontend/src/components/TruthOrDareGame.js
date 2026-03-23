import React, { useState, useEffect } from 'react';
import { X, Sparkles, Star, Flame, RotateCcw } from 'lucide-react';

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
  "What's your guilty pleasure?",
  "What's the last thing you searched on your phone?"
];

const DARES = [
  "Do your best dance move for 10 seconds",
  "Make a funny face and hold it for 30 seconds",
  "Talk in an accent for the next 2 minutes",
  "Sing a song of your choice",
  "Tell your best joke",
  "Do 10 jumping jacks on camera",
  "Speak in slow motion for 1 minute",
  "Do your best celebrity impression",
  "Make up a rap about your day",
  "Do your best animal impression"
];

const TruthOrDareGame = ({ 
  isOpen, 
  onClose, 
  myScore = 0, 
  partnerScore = 0,
  onScoreUpdate,
  isPremium 
}) => {
  const [currentType, setCurrentType] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);

  const spinWheel = (type) => {
    setIsSpinning(true);
    setShowResult(false);
    setCurrentType(type);
    
    // Spin animation
    const spins = 3 + Math.random() * 2;
    setSpinRotation(prev => prev + (spins * 360));
    
    // Reveal after spin
    setTimeout(() => {
      const list = type === 'truth' ? TRUTHS : DARES;
      const randomIndex = Math.floor(Math.random() * list.length);
      setCurrentQuestion(list[randomIndex]);
      setIsSpinning(false);
      setShowResult(true);
    }, 1200);
  };

  const handleComplete = () => {
    setCompleted(prev => prev + 1);
    onScoreUpdate?.(1);
    setCurrentQuestion('');
    setCurrentType(null);
    setShowResult(false);
  };

  const handleSkip = () => {
    setCurrentQuestion('');
    setCurrentType(null);
    setShowResult(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 lg:bottom-auto lg:top-20 lg:left-auto lg:right-4 z-40 flex items-end lg:items-start justify-center lg:justify-end pointer-events-none px-4">
      <div className="pointer-events-auto w-full max-w-sm">
        <div className="bg-gradient-to-br from-[#2a1a4a]/95 to-[#1a0a2e]/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl shadow-[0_0_40px_rgba(236,72,153,0.2)] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-pink-500/20 flex items-center justify-between bg-gradient-to-r from-pink-500/10 to-purple-500/10">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-pink-400" />
              <h3 className="font-bold text-white">Truth or Dare</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm px-2 py-0.5 bg-yellow-500/20 rounded-full">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold">{completed}</span>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-all">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {!showResult && !isSpinning && (
              <div className="space-y-4">
                {/* Bottle/Spinner Animation */}
                <div className="relative h-24 flex items-center justify-center">
                  <div 
                    className="text-5xl transition-transform duration-1000 ease-out"
                    style={{ transform: `rotate(${spinRotation}deg)` }}
                  >
                    🍾
                  </div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-pink-500/20 blur-xl animate-pulse" />
                  </div>
                </div>

                <p className="text-center text-gray-400 text-sm">Choose your fate...</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => spinWheel('truth')}
                    className="py-4 px-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 hover:from-blue-500/30 hover:to-blue-600/20 border border-blue-500/40 rounded-xl transition-all group hover:scale-105 active:scale-95"
                  >
                    <div className="text-3xl mb-2">🤔</div>
                    <span className="font-bold text-blue-400 group-hover:text-blue-300">Truth</span>
                  </button>
                  <button
                    onClick={() => spinWheel('dare')}
                    className="py-4 px-4 bg-gradient-to-br from-red-500/20 to-red-600/10 hover:from-red-500/30 hover:to-red-600/20 border border-red-500/40 rounded-xl transition-all group hover:scale-105 active:scale-95"
                  >
                    <div className="text-3xl mb-2">🔥</div>
                    <span className="font-bold text-red-400 group-hover:text-red-300">Dare</span>
                  </button>
                </div>
              </div>
            )}

            {/* Spinning state */}
            {isSpinning && (
              <div className="py-8 text-center">
                <div 
                  className="text-6xl mb-4 inline-block"
                  style={{ 
                    animation: 'spin 0.3s linear infinite',
                  }}
                >
                  🍾
                </div>
                <p className="text-gray-400 animate-pulse">Spinning...</p>
              </div>
            )}

            {/* Result display */}
            {showResult && currentQuestion && (
              <div className="space-y-4 animate-fadeIn">
                {/* Result badge */}
                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${
                    currentType === 'truth' 
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' 
                      : 'bg-red-500/30 text-red-300 border border-red-500/50'
                  }`}>
                    {currentType === 'truth' ? '🤔 TRUTH' : '🔥 DARE'}
                  </div>
                </div>

                {/* Question/Dare card */}
                <div className={`p-4 rounded-xl border ${
                  currentType === 'truth' 
                    ? 'bg-blue-500/10 border-blue-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className="text-white text-center text-lg leading-relaxed">
                    {currentQuestion}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Skip
                  </button>
                  <button
                    onClick={handleComplete}
                    className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                      currentType === 'truth'
                        ? 'bg-blue-500 hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                        : 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    }`}
                  >
                    <Star size={14} />
                    Done! +1
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TruthOrDareGame;
