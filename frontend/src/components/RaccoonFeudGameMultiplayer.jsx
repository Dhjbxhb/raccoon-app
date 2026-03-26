import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send, Trophy, Crown, CheckCircle, XCircle, Users, Zap, Clock } from 'lucide-react';

/**
 * RaccoonFeudGame - Multiplayer Feud game with real-time sync
 * 
 * Connects to backend socket for:
 * - Real-time game state sync between 2 players
 * - Fuzzy answer matching on server
 * - Score tracking and winner determination
 * - Turn-based gameplay with steal mechanics
 */
const RaccoonFeudGame = ({ 
  isOpen, 
  onClose, 
  socket,
  myUserId,
  partnerUsername = 'Stranger',
  sessionId,
  isPremium = false,
  isOverlay = false
}) => {
  // Game state from backend
  const [gameState, setGameState] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [revealingIndex, setRevealingIndex] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef(null);
  const feedbackTimeout = useRef(null);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    // Game started - receive initial state
    const handleGameStarted = (data) => {
      console.log('Feud game started:', data);
      setGameState(data.game_state);
      setIsMyTurn(data.game_state.current_player === myUserId);
      setGameEnded(false);
      setWinner(null);
    };
    
    // Guess result - update state for both players
    const handleGuessResult = (data) => {
      console.log('Feud guess result:', data);
      
      // Show feedback
      if (data.correct) {
        // Find which answer was revealed
        const answerIndex = data.game_state.current_question.answers.findIndex(
          a => a.revealed && a.answer === data.matched_answer
        );
        if (answerIndex >= 0) {
          setRevealingIndex(answerIndex);
          setTimeout(() => setRevealingIndex(null), 600);
        }
        
        setFeedback({
          type: 'correct',
          player: data.player_username,
          answer: data.matched_answer,
          points: data.points,
          isMe: data.player_id === myUserId
        });
      } else if (data.strike) {
        setFeedback({
          type: 'strike',
          player: data.player_username,
          isMe: data.player_id === myUserId,
          stealOpportunity: data.steal_opportunity
        });
      }
      
      // Update game state
      setGameState(data.game_state);
      setIsMyTurn(data.game_state.current_player === myUserId);
      
      // Clear feedback after delay
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = setTimeout(() => setFeedback(null), 2000);
      
      setIsLoading(false);
    };
    
    // Game ended
    const handleGameEnded = (data) => {
      console.log('Feud game ended:', data);
      setGameState(data.game_state);
      setGameEnded(true);
      setWinner({
        id: data.winner_id,
        username: data.winner_username,
        isMe: data.winner_id === myUserId,
        isTie: data.winner_id === 'tie'
      });
    };
    
    // Error handling
    const handleError = (data) => {
      console.error('Feud error:', data);
      setFeedback({
        type: 'error',
        message: data.message || 'Something went wrong'
      });
      setIsLoading(false);
    };
    
    socket.on('feud_game_started', handleGameStarted);
    socket.on('feud_guess_result', handleGuessResult);
    socket.on('feud_game_ended', handleGameEnded);
    socket.on('feud_error', handleError);
    
    return () => {
      socket.off('feud_game_started', handleGameStarted);
      socket.off('feud_guess_result', handleGuessResult);
      socket.off('feud_game_ended', handleGameEnded);
      socket.off('feud_error', handleError);
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    };
  }, [socket, myUserId]);
  
  // Start game
  const startGame = useCallback(() => {
    if (!socket) return;
    console.log('Starting Feud game...');
    socket.emit('start_feud_game');
  }, [socket]);
  
  // Submit guess
  const submitGuess = useCallback(() => {
    if (!socket || !userAnswer.trim() || !isMyTurn || isLoading) return;
    
    setIsLoading(true);
    socket.emit('feud_guess', { guess: userAnswer.trim() });
    setUserAnswer('');
  }, [socket, userAnswer, isMyTurn, isLoading]);
  
  // Handle enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      submitGuess();
    }
  };
  
  // Play again
  const playAgain = useCallback(() => {
    setGameState(null);
    setGameEnded(false);
    setWinner(null);
    setFeedback(null);
    startGame();
  }, [startGame]);
  
  // Focus input when it's my turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);
  
  if (!isOpen) return null;
  
  // Get display values from game state
  const myScore = gameState 
    ? (myUserId === gameState.player1_id ? gameState.player1_score : gameState.player2_score)
    : 0;
  const partnerScore = gameState
    ? (myUserId === gameState.player1_id ? gameState.player2_score : gameState.player1_score)
    : 0;
  const myStrikes = gameState
    ? (myUserId === gameState.player1_id ? gameState.player1_strikes : gameState.player2_strikes)
    : 0;
  const partnerStrikes = gameState
    ? (myUserId === gameState.player1_id ? gameState.player2_strikes : gameState.player1_strikes)
    : 0;
  const currentQuestion = gameState?.current_question;
  const questionNumber = gameState?.question_number || 1;
  const totalQuestions = gameState?.total_questions || 5;
  
  // Render content based on game state
  const renderContent = () => {
    // No game yet - show start screen
    if (!gameState) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6">
          <div className="text-6xl mb-4 animate-bounce">🦝</div>
          <h4 className="text-2xl font-bold text-white mb-2">Raccoon Feud!</h4>
          <p className="text-gray-400 text-sm mb-2">Survey Says... Can you guess the top answers?</p>
          <p className="text-[#ffd700]/70 text-xs mb-6">Play against {partnerUsername}!</p>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#7c3aed]/30 flex items-center justify-center mb-1">
                <span className="text-xl">👤</span>
              </div>
              <span className="text-xs text-gray-400">You</span>
            </div>
            <span className="text-2xl">⚔️</span>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#f59e0b]/30 flex items-center justify-center mb-1">
                <span className="text-xl">👤</span>
              </div>
              <span className="text-xs text-gray-400">{partnerUsername}</span>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,215,0,0.4)]"
            data-testid="start-feud-game"
          >
            Start Game
          </button>
        </div>
      );
    }
    
    // Game ended - show results
    if (gameEnded && winner) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6">
          <div className="text-5xl mb-4">
            {winner.isTie ? '🤝' : winner.isMe ? '🎉' : '😢'}
          </div>
          <h4 className="text-2xl font-bold text-white mb-2">
            {winner.isTie ? "It's a Tie!" : winner.isMe ? 'You Won!' : `${winner.username} Wins!`}
          </h4>
          
          {/* Final scores */}
          <div className="flex items-center gap-8 my-6">
            <div className={`text-center p-4 rounded-xl ${myScore >= partnerScore ? 'bg-[#ffd700]/20 border border-[#ffd700]/50' : 'bg-white/5'}`}>
              <div className="text-3xl font-bold text-[#ffd700] mb-1">{myScore}</div>
              <div className="text-sm text-gray-400">You</div>
              {myScore > partnerScore && <Crown size={16} className="text-[#ffd700] mx-auto mt-1" />}
            </div>
            <div className="text-2xl text-gray-500">vs</div>
            <div className={`text-center p-4 rounded-xl ${partnerScore >= myScore ? 'bg-[#ffd700]/20 border border-[#ffd700]/50' : 'bg-white/5'}`}>
              <div className="text-3xl font-bold text-[#ffd700] mb-1">{partnerScore}</div>
              <div className="text-sm text-gray-400">{partnerUsername}</div>
              {partnerScore > myScore && <Crown size={16} className="text-[#ffd700] mx-auto mt-1" />}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={playAgain}
              className="px-6 py-2 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:scale-105 transition-all"
            >
              Play Again
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    
    // Active game - show question and answers
    return (
      <div className="space-y-4 p-4">
        {/* Progress bar */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Question {questionNumber}/{totalQuestions}</span>
          <span className={isMyTurn ? 'text-[#ffd700]' : 'text-gray-500'}>
            {isMyTurn ? '🎯 Your turn!' : `⏳ ${partnerUsername}'s turn`}
          </span>
        </div>
        
        {/* Scoreboard */}
        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
          <div className="text-center">
            <div className={`text-lg font-bold ${isMyTurn ? 'text-[#ffd700]' : 'text-white'}`}>{myScore}</div>
            <div className="text-xs text-gray-400">You</div>
            <div className="flex gap-1 mt-1 justify-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < myStrikes ? 'bg-red-500' : 'bg-gray-700'}`} />
              ))}
            </div>
          </div>
          <div className="text-center">
            <Trophy size={20} className="text-[#ffd700] mx-auto mb-1" />
            <div className="text-xs text-gray-500">vs</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${!isMyTurn ? 'text-[#ffd700]' : 'text-white'}`}>{partnerScore}</div>
            <div className="text-xs text-gray-400">{partnerUsername}</div>
            <div className="flex gap-1 mt-1 justify-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < partnerStrikes ? 'bg-red-500' : 'bg-gray-700'}`} />
              ))}
            </div>
          </div>
        </div>
        
        {/* Question */}
        {currentQuestion && (
          <>
            <div className="p-4 bg-[#ffd700]/10 border border-[#ffd700]/40 rounded-xl">
              <p className="text-white font-medium text-center">{currentQuestion.question}</p>
            </div>
            
            {/* Answer Board */}
            <div className="space-y-2">
              {currentQuestion.answers.map((ans, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                    revealingIndex === idx
                      ? 'bg-[#ffd700]/40 border-2 border-[#ffd700] scale-105'
                      : ans.revealed
                        ? 'bg-[#ffd700]/20 border border-[#ffd700]/50'
                        : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <span className={`font-medium transition-all ${
                    ans.revealed || revealingIndex === idx ? 'text-white' : 'text-gray-500'
                  }`}>
                    {ans.revealed || revealingIndex === idx ? ans.answer : `${idx + 1}. ???`}
                  </span>
                  <span className={`font-bold px-3 py-1 rounded-lg ${
                    ans.revealed || revealingIndex === idx
                      ? 'bg-[#ffd700]/30 text-[#ffd700]' 
                      : 'text-gray-600'
                  }`}>
                    {ans.revealed || revealingIndex === idx ? ans.points : '??'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* Input - only enabled on my turn */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isMyTurn || isLoading}
            placeholder={isMyTurn ? "Type your answer..." : "Waiting for opponent..."}
            className={`flex-1 bg-white/10 border rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none transition-all ${
              isMyTurn 
                ? 'border-[#ffd700]/50 focus:border-[#ffd700]' 
                : 'border-white/10 opacity-50 cursor-not-allowed'
            }`}
            data-testid="feud-guess-input"
          />
          <button
            onClick={submitGuess}
            disabled={!isMyTurn || !userAnswer.trim() || isLoading}
            className={`px-5 rounded-xl transition-all font-bold ${
              isMyTurn && userAnswer.trim() && !isLoading
                ? 'bg-[#ffd700] hover:bg-[#ffed4a] text-[#1a237e]'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            data-testid="feud-submit-btn"
          >
            {isLoading ? <Clock size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        
        {/* Feedback */}
        {feedback && (
          <div className={`text-center py-3 rounded-xl font-bold animate-pulse ${
            feedback.type === 'correct' 
              ? 'bg-green-500/20 text-green-400' 
              : feedback.type === 'strike'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {feedback.type === 'correct' ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle size={18} />
                {feedback.isMe ? 'You got it!' : `${feedback.player} got it!`} +{feedback.points} pts
              </span>
            ) : feedback.type === 'strike' ? (
              <span className="flex items-center justify-center gap-2">
                <XCircle size={18} />
                {feedback.isMe ? 'Strike!' : `${feedback.player} missed!`}
                {feedback.stealOpportunity && ' STEAL CHANCE!'}
              </span>
            ) : (
              <span>{feedback.message}</span>
            )}
          </div>
        )}
        
        {/* Steal indicator */}
        {gameState?.is_steal_attempt && (
          <div className="text-center py-2 bg-[#f59e0b]/20 border border-[#f59e0b]/50 rounded-xl">
            <span className="text-[#f59e0b] font-bold flex items-center justify-center gap-2">
              <Zap size={16} /> STEAL ATTEMPT!
            </span>
          </div>
        )}
      </div>
    );
  };
  
  // Overlay mode - renders inside the video container
  if (isOverlay) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a237e]/95 to-[#0d1442]/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#ffd700]/20 to-[#ff8c00]/10 border-b border-[#ffd700]/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦝</span>
            <h3 className="font-bold text-[#ffd700] text-lg">Raccoon Feud</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-[#ffd700]/20 rounded-full">
              <Trophy size={14} className="text-[#ffd700]" />
              <span className="text-[#ffd700] font-bold">{myScore}</span>
              <span className="text-gray-500 text-sm">-</span>
              <span className="text-white font-bold">{partnerScore}</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    );
  }

  // Non-overlay mode (standalone panel)
  return (
    <div className="fixed top-20 right-4 z-40 pointer-events-auto hidden lg:block">
      <div className="w-96 bg-gradient-to-br from-[#1a237e]/95 to-[#0d1442]/95 backdrop-blur-xl border border-[#ffd700]/40 rounded-2xl shadow-[0_0_40px_rgba(255,215,0,0.15)] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#ffd700]/20 to-[#ff8c00]/10 border-b border-[#ffd700]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦝</span>
            <h3 className="font-bold text-[#ffd700]">Raccoon Feud</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#ffd700]/20 rounded-full">
              <Trophy size={12} className="text-[#ffd700]" />
              <span className="text-[#ffd700] font-bold text-sm">{myScore}</span>
              <span className="text-gray-500 text-xs">-</span>
              <span className="text-white font-bold text-sm">{partnerScore}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default RaccoonFeudGame;
