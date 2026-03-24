import React, { useState, useEffect } from 'react';
import { X, Sparkles, Star, RotateCcw } from 'lucide-react';

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
  isPremium,
  isMobile = false
}) => {
  const [currentType, setCurrentType] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState(null); // 'me' or 'stranger'

  const spinBottle = () => {
    setIsSpinning(true);
    setShowResult(false);
    setCurrentQuestion('');
    setCurrentType(null);
    setSelectedPerson(null);
    
    // Random number of full spins (3-5) plus extra rotation
    const fullSpins = 3 + Math.floor(Math.random() * 3);
    const extraDegrees = Math.random() * 360;
    const totalRotation = spinRotation + (fullSpins * 360) + extraDegrees;
    
    setSpinRotation(totalRotation);
    
    // Determine direction after spin
    // On mobile: Up (270-90) = stranger, Down (90-270) = me
    // On desktop: Right (315-45) = stranger, Left (135-225) = me
    setTimeout(() => {
      const finalAngle = totalRotation % 360;
      let person;
      
      if (isMobile) {
        // Mobile: vertical layout - TOP=stranger, BOTTOM=me
        // Bottle pointing up (315-45 or 270-90 range) = stranger
        // Bottle pointing down (135-225 or 90-270 range) = me
        if ((finalAngle >= 270 && finalAngle <= 360) || (finalAngle >= 0 && finalAngle <= 90)) {
          person = 'stranger';
        } else {
          person = 'me';
        }
      } else {
        // Desktop: horizontal layout - LEFT=me, RIGHT=stranger
        // Bottle pointing right (315-45 range) = stranger
        // Bottle pointing left (135-225 range) = me
        if ((finalAngle >= 315 && finalAngle <= 360) || (finalAngle >= 0 && finalAngle <= 45)) {
          person = 'stranger';
        } else if (finalAngle >= 135 && finalAngle <= 225) {
          person = 'me';
        } else {
          // For angles in between, randomly assign
          person = Math.random() > 0.5 ? 'me' : 'stranger';
        }
      }
      
      setSelectedPerson(person);
      setIsSpinning(false);
    }, 2000);
  };

  const selectTruthOrDare = (type) => {
    setCurrentType(type);
    const list = type === 'truth' ? TRUTHS : DARES;
    const randomIndex = Math.floor(Math.random() * list.length);
    setCurrentQuestion(list[randomIndex]);
    setShowResult(true);
  };

  const handleComplete = () => {
    setCompleted(prev => prev + 1);
    if (selectedPerson === 'me') {
      onScoreUpdate?.(1);
    }
    resetGame();
  };

  const resetGame = () => {
    setCurrentQuestion('');
    setCurrentType(null);
    setShowResult(false);
    setSelectedPerson(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />
      
      {/* Game Card - Centered between videos */}
      <div className="pointer-events-auto relative">
        <div className="w-[340px] bg-gradient-to-br from-[#2a1a4a]/95 to-[#1a0a2e]/95 backdrop-blur-xl border border-pink-500/40 rounded-3xl shadow-[0_0_60px_rgba(236,72,153,0.3)] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-pink-500/20 flex items-center justify-between bg-gradient-to-r from-pink-500/10 to-purple-500/10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍾</span>
              <h3 className="font-bold text-white text-lg">Truth or Dare</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500/20 rounded-full">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold text-sm">{completed}</span>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-all">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Initial State - Show Bottle to Spin */}
            {!selectedPerson && !isSpinning && (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-6">Spin the bottle to see who goes!</p>
                
                {/* Bottle Display */}
                <div className="relative h-32 flex items-center justify-center mb-6">
                  <div 
                    className="text-6xl transition-transform duration-[2000ms] ease-out"
                    style={{ transform: `rotate(${spinRotation}deg)` }}
                  >
                    🍾
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-24 rounded-full bg-pink-500/20 blur-xl animate-pulse" />
                  </div>
                </div>

                {/* Direction indicators */}
                <div className="flex justify-between items-center px-4 mb-6">
                  {isMobile ? (
                    <>
                      <div className="text-center">
                        <div className="text-2xl">⬆️</div>
                        <span className="text-xs text-gray-500">Stranger</span>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl">⬇️</div>
                        <span className="text-xs text-gray-500">You</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-2xl">⬅️</div>
                        <span className="text-xs text-gray-500">You</span>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl">➡️</div>
                        <span className="text-xs text-gray-500">Stranger</span>
                      </div>
                    </>
                  )}
                </div>
                
                <button
                  onClick={spinBottle}
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(236,72,153,0.4)]"
                >
                  Spin the Bottle!
                </button>
              </div>
            )}

            {/* Spinning State */}
            {isSpinning && (
              <div className="text-center py-10">
                <div 
                  className="text-7xl inline-block"
                  style={{ 
                    transform: `rotate(${spinRotation}deg)`,
                    transition: 'transform 2s cubic-bezier(0.2, 0.8, 0.3, 1)'
                  }}
                >
                  🍾
                </div>
                <p className="text-gray-400 mt-4 animate-pulse">Spinning...</p>
              </div>
            )}

            {/* Person Selected - Choose Truth or Dare */}
            {selectedPerson && !showResult && !isSpinning && (
              <div className="text-center py-4">
                {/* Selected Person Highlight */}
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-6 ${
                  selectedPerson === 'me' 
                    ? 'bg-[#7c3aed]/20 border border-[#7c3aed]/50' 
                    : 'bg-blue-500/20 border border-blue-500/50'
                }`}>
                  <span className="text-3xl">{selectedPerson === 'me' ? '👆' : '🎯'}</span>
                  <div className="text-left">
                    <p className="text-xs text-gray-400">It's</p>
                    <p className="text-lg font-bold text-white">
                      {selectedPerson === 'me' ? 'YOUR turn!' : 'THEIR turn!'}
                    </p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-4">Choose for {selectedPerson === 'me' ? 'yourself' : 'them'}:</p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => selectTruthOrDare('truth')}
                    className="py-5 bg-gradient-to-br from-blue-500/30 to-blue-600/20 hover:from-blue-500/40 hover:to-blue-600/30 border border-blue-500/40 rounded-2xl transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="text-3xl mb-2">🤔</div>
                    <span className="font-bold text-blue-400 text-lg">Truth</span>
                  </button>
                  <button
                    onClick={() => selectTruthOrDare('dare')}
                    className="py-5 bg-gradient-to-br from-red-500/30 to-red-600/20 hover:from-red-500/40 hover:to-red-600/30 border border-red-500/40 rounded-2xl transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="text-3xl mb-2">🔥</div>
                    <span className="font-bold text-red-400 text-lg">Dare</span>
                  </button>
                </div>

                <button
                  onClick={spinBottle}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
                >
                  <RotateCcw size={14} />
                  Spin again
                </button>
              </div>
            )}

            {/* Result Display */}
            {showResult && currentQuestion && (
              <div className="space-y-4 animate-fadeIn">
                {/* Who and What */}
                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-3 ${
                    selectedPerson === 'me' ? 'bg-[#7c3aed]/30 text-[#a78bfa]' : 'bg-blue-500/30 text-blue-300'
                  }`}>
                    {selectedPerson === 'me' ? '👆 Your' : '🎯 Their'} {currentType === 'truth' ? 'Truth' : 'Dare'}
                  </div>
                </div>

                {/* Question/Dare Card */}
                <div className={`p-5 rounded-2xl border ${
                  currentType === 'truth' 
                    ? 'bg-blue-500/10 border-blue-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className="text-white text-center text-lg leading-relaxed">
                    {currentQuestion}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={resetGame}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Skip
                  </button>
                  <button
                    onClick={handleComplete}
                    className={`flex-1 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                      currentType === 'truth'
                        ? 'bg-blue-500 hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                        : 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    }`}
                  >
                    <Star size={16} />
                    Done! {selectedPerson === 'me' && '+1'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default TruthOrDareGame;
