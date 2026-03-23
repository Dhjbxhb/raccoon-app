import React, { useState, useEffect, useCallback } from 'react';
import { X, Send, Trophy, Star, Clock, CheckCircle, XCircle, Crown } from 'lucide-react';

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
    question: "Name something people forget to do in the morning",
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
    question: "Name something that gets better with age",
    answers: [
      { text: "Wine", points: 35 },
      { text: "Cheese", points: 25 },
      { text: "Wisdom", points: 20 },
      { text: "Relationships", points: 12 },
      { text: "Confidence", points: 8 }
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
  },
  {
    question: "Name something people do to relax",
    answers: [
      { text: "Watch TV/Movies", points: 30 },
      { text: "Sleep/Nap", points: 25 },
      { text: "Listen to music", points: 20 },
      { text: "Exercise", points: 15 },
      { text: "Read", points: 10 }
    ]
  },
  {
    question: "Name a place where you have to be quiet",
    answers: [
      { text: "Library", points: 35 },
      { text: "Movie theater", points: 25 },
      { text: "Church/Temple", points: 20 },
      { text: "Hospital", points: 12 },
      { text: "Funeral", points: 8 }
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
  const [gamePhase, setGamePhase] = useState('ready'); // ready, playing, roundEnd
  const [roundNumber, setRoundNumber] = useState(1);
  const [usedQuestions, setUsedQuestions] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const startNewRound = useCallback(() => {
    // Get unused question
    const availableQuestions = QUESTIONS.filter((_, i) => !usedQuestions.includes(i));
    if (availableQuestions.length === 0) {
      // Reset if all questions used
      setUsedQuestions([]);
    }
    
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const questionIndex = QUESTIONS.findIndex(q => q === availableQuestions[randomIndex]);
    
    setCurrentQuestion(availableQuestions[randomIndex]);
    setUsedQuestions(prev => [...prev, questionIndex]);
    setRevealedAnswers([]);
    setStrikes(0);
    setRoundScore(0);
    setGamePhase('playing');
    setFeedback(null);
  }, [usedQuestions]);

  const checkAnswer = () => {
    if (!userAnswer.trim() || !currentQuestion) return;
    
    const normalizedAnswer = userAnswer.toLowerCase().trim();
    
    // Check if answer matches any unrevealed answer
    const matchedAnswer = currentQuestion.answers.find((ans, idx) => {
      const answerWords = ans.text.toLowerCase().split(' ');
      const inputWords = normalizedAnswer.split(' ');
      
      // Check if any significant word matches
      return !revealedAnswers.includes(idx) && (
        ans.text.toLowerCase().includes(normalizedAnswer) ||
        normalizedAnswer.includes(ans.text.toLowerCase()) ||
        answerWords.some(word => word.length > 3 && inputWords.includes(word)) ||
        inputWords.some(word => word.length > 3 && answerWords.includes(word))
      );
    });

    if (matchedAnswer) {
      const answerIndex = currentQuestion.answers.indexOf(matchedAnswer);
      setRevealedAnswers(prev => [...prev, answerIndex]);
      setRoundScore(prev => prev + matchedAnswer.points);
      setFeedback({ type: 'correct', points: matchedAnswer.points });
      onScoreUpdate?.(matchedAnswer.points);
      
      // Clear feedback after animation
      setTimeout(() => setFeedback(null), 1500);
      
      // Check if all answers revealed
      if (revealedAnswers.length + 1 === currentQuestion.answers.length) {
        setTimeout(() => {
          setGamePhase('roundEnd');
        }, 1000);
      }
    } else {
      setStrikes(prev => prev + 1);
      setFeedback({ type: 'wrong' });
      setTimeout(() => setFeedback(null), 1000);
      
      if (strikes + 1 >= 3) {
        setTimeout(() => {
          setGamePhase('roundEnd');
        }, 1000);
      }
    }
    
    setUserAnswer('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  const nextRound = () => {
    setRoundNumber(prev => prev + 1);
    startNewRound();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 right-4 z-40 w-80 pointer-events-auto">
      <div className="bg-gradient-to-br from-[#1a237e]/95 to-[#0d1442]/95 backdrop-blur-xl border border-[#ffd700]/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#ffd700]/20 to-[#ff8c00]/10 border-b border-[#ffd700]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#ffd700]" />
            <h3 className="font-bold text-[#ffd700]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Raccoon Feud
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <Star size={14} className="text-[#ffd700]" />
              <span className="text-[#ffd700] font-bold">{myScore}</span>
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
          {gamePhase === 'ready' && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🦝</div>
              <h4 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Survey Says!
              </h4>
              <p className="text-gray-400 text-sm mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Guess the top answers to win points!
              </p>
              <button
                onClick={startNewRound}
                className="px-6 py-2 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all"
              >
                Start Game
              </button>
            </div>
          )}

          {gamePhase === 'playing' && currentQuestion && (
            <div className="space-y-4">
              {/* Question */}
              <div className="p-3 bg-[#ffd700]/10 border border-[#ffd700]/30 rounded-xl">
                <p className="text-white text-sm font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {currentQuestion.question}
                </p>
              </div>

              {/* Strikes */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xl transition-all ${
                      i < strikes 
                        ? 'bg-red-500/20 text-red-500 scale-110' 
                        : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    ✕
                  </div>
                ))}
              </div>

              {/* Answer board */}
              <div className="space-y-1.5">
                {currentQuestion.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                      revealedAnswers.includes(idx)
                        ? 'bg-[#ffd700]/20 border border-[#ffd700]/40'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <span className={`text-sm ${revealedAnswers.includes(idx) ? 'text-white' : 'text-gray-500'}`}>
                      {revealedAnswers.includes(idx) ? ans.text : `#${idx + 1}`}
                    </span>
                    <span className={`font-bold text-sm ${revealedAnswers.includes(idx) ? 'text-[#ffd700]' : 'text-gray-600'}`}>
                      {revealedAnswers.includes(idx) ? ans.points : '??'}
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
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-gray-500 outline-none focus:border-[#ffd700]/50"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
                <button
                  onClick={checkAnswer}
                  className="p-2 bg-[#ffd700] hover:bg-[#ffed4a] text-[#1a237e] rounded-xl transition-all"
                >
                  <Send size={18} />
                </button>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`text-center py-2 rounded-xl ${
                  feedback.type === 'correct' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {feedback.type === 'correct' ? (
                    <span className="flex items-center justify-center gap-2">
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
              <div className="text-4xl mb-3">🎉</div>
              <h4 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Round {roundNumber} Complete!
              </h4>
              <p className="text-[#ffd700] text-2xl font-bold mb-4">
                +{roundScore} points
              </p>
              
              {/* Show all answers */}
              <div className="text-left space-y-1 mb-4 p-3 bg-white/5 rounded-xl">
                {currentQuestion?.answers.map((ans, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className={revealedAnswers.includes(idx) ? 'text-green-400' : 'text-gray-500'}>
                      {ans.text}
                    </span>
                    <span className="text-gray-400">{ans.points}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={nextRound}
                className="px-6 py-2 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all"
              >
                Next Round
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaccoonFeudGame;
