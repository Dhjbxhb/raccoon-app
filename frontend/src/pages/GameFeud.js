import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, X, Send, Zap } from 'lucide-react';

const GameFeud = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  
  const [gameState, setGameState] = useState(null);
  const [guess, setGuess] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [showResult, setShowResult] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!socket || !connected) return;

    // Listen for game events
    socket.on('feud_game_started', (data) => {
      setGameState(data.game_state);
      toast.success('Raccoon Feud started!');
    });

    socket.on('feud_guess_result', (data) => {
      setShowResult(data);
      setGameState(data.game_state);
      
      if (data.correct) {
        toast.success(`Correct! +${data.points} points`);
      } else if (data.strike) {
        toast.error('Strike! Wrong answer');
      }
      
      setTimeout(() => setShowResult(null), 2000);
    });

    socket.on('feud_question_ended', (data) => {
      setGameState(data.game_state);
      toast.info(data.reason === 'all_revealed' ? 'All answers found!' : '3 strikes! Moving on...');
    });

    socket.on('feud_game_ended', (data) => {
      setGameState(data.game_state);
      const isWinner = data.winner_id === user.user_id || data.winner_id === user.guest_id;
      if (data.winner_id === 'tie') {
        toast.info("It's a tie!");
      } else if (isWinner) {
        toast.success('You won! 🎉');
      } else {
        toast.error('You lost! Better luck next time');
      }
    });

    return () => {
      socket.off('feud_game_started');
      socket.off('feud_guess_result');
      socket.off('feud_question_ended');
      socket.off('feud_game_ended');
    };
  }, [socket, connected, user, navigate]);

  useEffect(() => {
    if (gameState && user) {
      const myId = user.user_id || user.guest_id;
      setIsMyTurn(gameState.current_player === myId);
    }
  }, [gameState, user]);

  const handleSubmitGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || !isMyTurn) return;
    
    socket.emit('feud_guess', { guess: guess.trim() });
    setGuess('');
  };

  const startGame = () => {
    socket.emit('start_feud_game');
  };

  const getMyScore = () => {
    if (!gameState || !user) return 0;
    const myId = user.user_id || user.guest_id;
    return myId === gameState.player1_id ? gameState.player1_score : gameState.player2_score;
  };

  const getOpponentScore = () => {
    if (!gameState || !user) return 0;
    const myId = user.user_id || user.guest_id;
    return myId === gameState.player1_id ? gameState.player2_score : gameState.player1_score;
  };

  const getMyStrikes = () => {
    if (!gameState || !user) return 0;
    const myId = user.user_id || user.guest_id;
    return myId === gameState.player1_id ? gameState.player1_strikes : gameState.player2_strikes;
  };

  // Waiting for game state
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a237e] via-[#0d1442] to-[#000510] text-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ffd700]/20">
          <div className="flex items-center gap-4 max-w-6xl mx-auto">
            <button
              onClick={() => navigate('/match')}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] rounded-xl flex items-center justify-center">
                <Trophy size={24} className="text-[#1a237e]" />
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Raccoon Feud
              </h1>
            </div>
          </div>
        </div>

        {/* Start Game Screen */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-[#ffd700]/30 rounded-full blur-xl animate-pulse" />
                <div className="relative z-10 text-8xl">🦝</div>
              </div>
              <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Ready to Play?
              </h2>
              <p className="text-gray-400 text-lg mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Guess the top answers to win points!
              </p>
            </div>
            
            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] rounded-2xl font-bold text-xl shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_50px_rgba(255,215,0,0.6)] transition-all hover:scale-105"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <span className="flex items-center gap-3">
                Start Game
                <Zap size={24} />
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game finished
  if (gameState.status === 'finished') {
    const myScore = getMyScore();
    const opponentScore = getOpponentScore();
    const myId = user.user_id || user.guest_id;
    const isWinner = gameState.winner_id === myId;
    const isTie = gameState.winner_id === 'tie';

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a237e] via-[#0d1442] to-[#000510] text-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-8xl mb-6">
            {isTie ? '🤝' : isWinner ? '🏆' : '😢'}
          </div>
          <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {isTie ? "It's a Tie!" : isWinner ? 'You Won!' : 'You Lost'}
          </h2>
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-gray-400 mb-2">Your Score</p>
              <p className="text-4xl font-bold text-[#ffd700]">{myScore}</p>
            </div>
            <div className="text-4xl text-gray-600">vs</div>
            <div className="text-center">
              <p className="text-gray-400 mb-2">Opponent</p>
              <p className="text-4xl font-bold">{opponentScore}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/match')}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  // Active game
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a237e] via-[#0d1442] to-[#000510] text-white flex flex-col">
      {/* Header with scores */}
      <div className="px-6 py-4 border-b border-[#ffd700]/20">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/match')}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <span className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Raccoon Feud
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-400">You</p>
              <p className="text-2xl font-bold text-[#ffd700]">{getMyScore()}</p>
            </div>
            <div className="text-gray-600">vs</div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Opponent</p>
              <p className="text-2xl font-bold">{getOpponentScore()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Question number */}
        <div className="mb-4">
          <span className="px-4 py-1 bg-[#ffd700]/20 text-[#ffd700] rounded-full text-sm font-semibold">
            Question {gameState.question_number} of {gameState.total_questions}
          </span>
        </div>

        {/* Question */}
        <div className="bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] px-8 py-4 rounded-2xl mb-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {gameState.current_question?.question}
          </h2>
        </div>

        {/* Strikes */}
        <div className="flex items-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                i < getMyStrikes() ? 'bg-red-500' : 'bg-white/10'
              }`}
            >
              {i < getMyStrikes() ? <X size={20} /> : ''}
            </div>
          ))}
          <span className="ml-2 text-gray-400">Strikes</span>
        </div>

        {/* Answer board */}
        <div className="grid grid-cols-1 gap-3 w-full max-w-lg mb-8">
          {gameState.current_question?.answers.map((answer, index) => (
            <div
              key={index}
              className={`flex items-center justify-between px-6 py-4 rounded-xl transition-all ${
                answer.revealed
                  ? 'bg-[#ffd700]/20 border border-[#ffd700]/50'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <span className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {answer.revealed ? answer.answer.toUpperCase() : '???'}
                </span>
              </div>
              <span className={`font-bold ${answer.revealed ? 'text-[#ffd700]' : 'text-gray-500'}`}>
                {answer.revealed ? answer.points : '?'}
              </span>
            </div>
          ))}
        </div>

        {/* Turn indicator & Input */}
        {isMyTurn ? (
          <form onSubmit={handleSubmitGuess} className="w-full max-w-lg">
            <div className="flex gap-3">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 bg-white/10 border border-[#ffd700]/30 focus:border-[#ffd700] rounded-xl h-14 px-6 text-white placeholder:text-white/30 outline-none transition-all text-lg"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                autoFocus
              />
              <button
                type="submit"
                disabled={!guess.trim()}
                className="px-8 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.4)]"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-xl text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Waiting for opponent's guess...
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-[#ffd700] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Result popup */}
        {showResult && (
          <div className={`fixed inset-0 flex items-center justify-center z-50 bg-black/50`}>
            <div className={`text-center p-8 rounded-3xl ${showResult.correct ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'}`}>
              <div className="text-6xl mb-4">
                {showResult.correct ? '✓' : '✗'}
              </div>
              <p className="text-2xl font-bold">
                {showResult.correct ? `+${showResult.points} Points!` : 'Strike!'}
              </p>
              {showResult.correct && (
                <p className="text-lg text-gray-300 mt-2">
                  {showResult.answer?.toUpperCase()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameFeud;
