import React, { useState, useCallback } from 'react';
import { X, Send, Trophy, Star, CheckCircle, XCircle } from 'lucide-react';

// Family Feud style questions and answers
const QUESTIONS = [
  {
    question: "Name something people do on their phones while waiting",
    answers: [
      { text: "Check social media", points: 35 },
      { text: "Play games", points: 25 },
      { text: "Text/Message", points: 20 },
      { text: "Browse internet", points: 12 },
      { text: "Check email", points: 8 }
    ]
  },
  {
    question: "Name a reason people stay up late",
    answers: [
      { text: "Watching TV/Movies", points: 30 },
      { text: "Can't sleep", points: 25 },
      { text: "Work", points: 20 },
      { text: "Social media", points: 15 },
      { text: "Video games", points: 10 }
    ]
  },
  {
    question: "Name something people forget in the morning",
    answers: [
      { text: "Eat breakfast", points: 30 },
      { text: "Brush teeth", points: 25 },
      { text: "Make bed", points: 20 },
      { text: "Take keys/phone", points: 15 },
      { text: "Lock door", points: 10 }
    ]
  },
  {
    question: "Name a popular first date activity",
    answers: [
      { text: "Dinner", points: 35 },
      { text: "Movie", points: 25 },
      { text: "Coffee", points: 20 },
      { text: "Walk/Park", points: 12 },
      { text: "Drinks", points: 8 }
    ]
  },
  {
    question: "Name a bad habit people try to break",
    answers: [
      { text: "Smoking", points: 30 },
      { text: "Biting nails", points: 25 },
      { text: "Eating junk food", points: 20 },
      { text: "Procrastinating", points: 15 },
      { text: "Phone addiction", points: 10 }
    ]
  }
];

const RaccoonFeudGame = ({ 
  isOpen, 
  onClose, 
  myScore = 0, 
  partnerScore = 0,
  partnerUsername = 'Partner',
  onScoreUpdate,
  isPremium 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [revealedAnswers, setRevealedAnswers] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [roundScore, setRoundScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [gamePhase, setGamePhase] = useState('ready');
  const [roundNumber, setRoundNumber] = useState(1);
  const [usedQuestions, setUsedQuestions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [revealingIndex, setRevealingIndex] = useState(null);

  const startNewRound = useCallback(() => {
    const availableQuestions = QUESTIONS.filter((_, i) => !usedQuestions.includes(i));
    if (availableQuestions.length === 0) {
      setUsedQuestions([]);
    }
    
    const randomIndex = Math.floor(Math.random() * (availableQuestions.length || QUESTIONS.length));
    const question = availableQuestions.length > 0 ? availableQuestions[randomIndex] : QUESTIONS[randomIndex];
    const questionIndex = QUESTIONS.findIndex(q => q === question);
    
    setCurrentQuestion(question);
    setUsedQuestions(prev => [...prev, questionIndex]);
    setRevealedAnswers([]);
    setStrikes(0);
    setRoundScore(0);
    setGamePhase('playing');
    setFeedback(null);
    setRevealingIndex(null);
  }, [usedQuestions]);

  const checkAnswer = () => {
    if (!userAnswer.trim() || !currentQuestion) return;
    
    const normalizedAnswer = userAnswer.toLowerCase().trim();
    
    const matchedAnswer = currentQuestion.answers.find((ans, idx) => {
      const answerWords = ans.text.toLowerCase().split(' ');
      const inputWords = normalizedAnswer.split(' ');
      
      return !revealedAnswers.includes(idx) && (
        ans.text.toLowerCase().includes(normalizedAnswer) ||
        normalizedAnswer.includes(ans.text.toLowerCase()) ||
        answerWords.some(word => word.length > 3 && inputWords.includes(word)) ||
        inputWords.some(word => word.length > 3 && answerWords.includes(word))
      );
    });

    if (matchedAnswer) {
      const answerIndex = currentQuestion.answers.indexOf(matchedAnswer);
      
      // Reveal animation
      setRevealingIndex(answerIndex);
      setFeedback({ type: 'correct', points: matchedAnswer.points });
      
      setTimeout(() => {
        setRevealedAnswers(prev => [...prev, answerIndex]);
        setRoundScore(prev => prev + matchedAnswer.points);
        onScoreUpdate?.(matchedAnswer.points);
        setRevealingIndex(null);
        
        if (revealedAnswers.length + 1 === currentQuestion.answers.length) {
          setTimeout(() => setGamePhase('roundEnd'), 800);
        }
      }, 600);
      
      setTimeout(() => setFeedback(null), 1500);
    } else {
      setStrikes(prev => prev + 1);
      setFeedback({ type: 'wrong' });
      setTimeout(() => setFeedback(null), 1000);
      
      if (strikes + 1 >= 3) {
        setTimeout(() => setGamePhase('roundEnd'), 1000);
      }
    }
    
    setUserAnswer('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') checkAnswer();
  };

  const nextRound = () => {
    setRoundNumber(prev => prev + 1);
    startNewRound();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-4 z-40 pointer-events-auto hidden lg:block">
      <div className="w-80 bg-gradient-to-br from-[#1a237e]/95 to-[#0d1442]/95 backdrop-blur-xl border border-[#ffd700]/40 rounded-2xl shadow-[0_0_40px_rgba(255,215,0,0.15)] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#ffd700]/20 to-[#ff8c00]/10 border-b border-[#ffd700]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦝</span>
            <h3 className="font-bold text-[#ffd700]">Raccoon Feud</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm px-2 py-0.5 bg-[#ffd700]/20 rounded-full">
              <Trophy size={12} className="text-[#ffd700]" />
              <span className="text-[#ffd700] font-bold">{myScore}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {gamePhase === 'ready' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🦝</div>
              <h4 className="text-lg font-bold text-white mb-2">Survey Says!</h4>
              <p className="text-gray-400 text-sm mb-4">Guess the top answers to win points!</p>
              <button
                onClick={startNewRound}
                className="px-6 py-2.5 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              >
                Start Game
              </button>
            </div>
          )}

          {gamePhase === 'playing' && currentQuestion && (
            <div className="space-y-4">
              {/* Question */}
              <div className="p-3 bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-xl">
                <p className="text-white text-sm font-medium">{currentQuestion.question}</p>
              </div>

              {/* Strikes */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                      i < strikes 
                        ? 'bg-red-500/30 text-red-400 scale-110 animate-shake' 
                        : 'bg-white/5 text-gray-700'
                    }`}
                  >
                    ✕
                  </div>
                ))}
              </div>

              {/* Answer board with reveal animation */}
              <div className="space-y-1.5">
                {currentQuestion.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-500 ${
                      revealingIndex === idx
                        ? 'bg-[#ffd700]/40 border-2 border-[#ffd700] scale-105'
                        : revealedAnswers.includes(idx)
                          ? 'bg-[#ffd700]/20 border border-[#ffd700]/50'
                          : 'bg-white/5 border border-white/10'
                    }`}
                    style={{
                      transform: revealingIndex === idx ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    <span className={`text-sm font-medium transition-all ${
                      revealedAnswers.includes(idx) || revealingIndex === idx
                        ? 'text-white' 
                        : 'text-gray-600'
                    }`}>
                      {revealedAnswers.includes(idx) || revealingIndex === idx ? ans.text : `${idx + 1}. ???`}
                    </span>
                    <span className={`font-bold text-sm px-2 py-0.5 rounded ${
                      revealedAnswers.includes(idx) || revealingIndex === idx
                        ? 'bg-[#ffd700]/30 text-[#ffd700]' 
                        : 'text-gray-700'
                    }`}>
                      {revealedAnswers.includes(idx) || revealingIndex === idx ? ans.points : '??'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-gray-600 outline-none focus:border-[#ffd700]/50"
                />
                <button
                  onClick={checkAnswer}
                  className="p-2.5 bg-[#ffd700] hover:bg-[#ffed4a] text-[#1a237e] rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`text-center py-2 rounded-xl transition-all animate-fadeIn ${
                  feedback.type === 'correct' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {feedback.type === 'correct' ? (
                    <span className="flex items-center justify-center gap-2 font-bold">
                      <CheckCircle size={16} /> +{feedback.points} points!
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <XCircle size={16} /> Try again!
                    </span>
                  )}
                </div>
              )}

              {/* Round Score */}
              <div className="text-center text-sm text-gray-400">
                Round Score: <span className="text-[#ffd700] font-bold">{roundScore}</span>
              </div>
            </div>
          )}

          {gamePhase === 'roundEnd' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-3 animate-bounce">🎉</div>
              <h4 className="text-lg font-bold text-white mb-2">Round {roundNumber} Complete!</h4>
              <p className="text-[#ffd700] text-2xl font-bold mb-4">+{roundScore} points</p>
              
              {/* Show all answers */}
              <div className="text-left space-y-1 mb-4 p-3 bg-white/5 rounded-xl max-h-32 overflow-y-auto">
                {currentQuestion?.answers.map((ans, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className={revealedAnswers.includes(idx) ? 'text-green-400' : 'text-gray-500'}>
                      {revealedAnswers.includes(idx) ? '✓' : '✕'} {ans.text}
                    </span>
                    <span className="text-gray-400">{ans.points}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={nextRound}
                className="px-6 py-2.5 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)]"
              >
                Next Round
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default RaccoonFeudGame;
