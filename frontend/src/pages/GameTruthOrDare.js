import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';
import { ArrowLeft, Send, RotateCcw } from 'lucide-react';

const GameTruthOrDare = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  
  const [gameState, setGameState] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);
  const [question, setQuestion] = useState('');
  const bottleRef = useRef(null);

  const myId = user?.user_id || user?.guest_id;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!socket || !connected) return;

    socket.on('tod_game_started', (data) => {
      setGameState(data.game_state);
      toast.success('Truth or Dare started!');
    });

    socket.on('tod_spin_result', (data) => {
      setIsSpinning(false);
      setGameState(data.game_state);
      
      const selectedIsMe = data.selected_player === myId;
      toast.info(selectedIsMe ? 'The bottle points to YOU!' : 'Bottle points to your partner!');
    });

    socket.on('tod_choice_made', (data) => {
      setGameState(data.game_state);
      toast.info(`${data.choice.toUpperCase()} was chosen!`);
    });

    socket.on('tod_question_submitted', (data) => {
      setGameState(data.game_state);
    });

    socket.on('tod_round_complete', (data) => {
      setGameState(data.game_state);
      toast.success(`Round ${data.rounds_played} complete!`);
    });

    return () => {
      socket.off('tod_game_started');
      socket.off('tod_spin_result');
      socket.off('tod_choice_made');
      socket.off('tod_question_submitted');
      socket.off('tod_round_complete');
    };
  }, [socket, connected, user, navigate, myId]);

  const startGame = () => {
    socket.emit('start_tod_game');
  };

  const spinBottle = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    // Random spin animation
    const spins = 5 + Math.random() * 5; // 5-10 full rotations
    const finalAngle = spins * 360 + Math.random() * 360;
    setSpinAngle(finalAngle);
    
    // Emit after animation
    setTimeout(() => {
      socket.emit('tod_spin_bottle');
    }, 3000);
  };

  const chooseOption = (choice) => {
    socket.emit('tod_choose', { choice });
  };

  const submitQuestion = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    socket.emit('tod_submit_question', { question: question.trim() });
    setQuestion('');
  };

  const completeRound = () => {
    socket.emit('tod_complete_round');
  };

  // Waiting for game state
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4a1a6b] via-[#2d1b4e] to-[#0a0a0a] text-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-pink-500/20">
          <div className="flex items-center gap-4 max-w-6xl mx-auto">
            <button
              onClick={() => navigate('/match')}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-xl">
                🍾
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Truth or Dare
              </h1>
            </div>
          </div>
        </div>

        {/* Start Screen */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-pink-500/30 rounded-full blur-xl animate-pulse" />
                <div className="relative z-10 text-8xl">🦝</div>
              </div>
              <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Ready for Truth or Dare?
              </h2>
              <p className="text-gray-400 text-lg mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Spin the bottle and have fun!
              </p>
            </div>
            
            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold text-xl shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_50px_rgba(236,72,153,0.6)] transition-all hover:scale-105"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render based on game status
  const renderGameContent = () => {
    const isMyTurn = gameState.current_player === myId;
    const amIAsker = gameState.asker === myId;

    switch (gameState.status) {
      case 'ready':
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Spin the Bottle!
            </h2>
            
            {/* Bottle */}
            <div className="relative w-64 h-64 mx-auto mb-8">
              <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-xl" />
              <div 
                ref={bottleRef}
                className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-[3000ms] ease-out"
                style={{ transform: `rotate(${spinAngle}deg)` }}
              >
                <div className="text-8xl">🍾</div>
              </div>
            </div>

            <p className="text-gray-400 mb-6">Rounds played: {gameState.rounds_played}</p>
            
            <button
              onClick={spinBottle}
              disabled={isSpinning}
              className="px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold text-xl shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_50px_rgba(236,72,153,0.6)] transition-all disabled:opacity-50 flex items-center gap-3 mx-auto"
            >
              <RotateCcw size={24} className={isSpinning ? 'animate-spin' : ''} />
              {isSpinning ? 'Spinning...' : 'Spin!'}
            </button>
          </div>
        );

      case 'choosing':
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {isMyTurn ? 'Choose Your Fate!' : 'Waiting for choice...'}
            </h2>
            <p className="text-gray-400 mb-8">
              {isMyTurn ? 'Truth or Dare?' : 'Your partner is choosing...'}
            </p>
            
            {isMyTurn ? (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => chooseOption('truth')}
                  className="px-12 py-6 bg-blue-500/20 border-2 border-blue-500 rounded-2xl font-bold text-2xl hover:bg-blue-500/40 transition-all"
                >
                  😇 Truth
                </button>
                <button
                  onClick={() => chooseOption('dare')}
                  className="px-12 py-6 bg-red-500/20 border-2 border-red-500 rounded-2xl font-bold text-2xl hover:bg-red-500/40 transition-all"
                >
                  😈 Dare
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'asking':
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className={`inline-block px-6 py-2 rounded-full mb-6 ${
              gameState.current_choice === 'truth' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span className="font-bold text-xl">
                {gameState.current_choice === 'truth' ? '😇 TRUTH' : '😈 DARE'}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {amIAsker ? `Ask your ${gameState.current_choice}!` : 'Waiting for question...'}
            </h2>
            
            {amIAsker ? (
              <form onSubmit={submitQuestion}>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={gameState.current_choice === 'truth' 
                    ? "Ask a truth question..." 
                    : "Give them a dare..."}
                  className="w-full h-32 bg-white/10 border border-pink-500/30 focus:border-pink-500 rounded-xl p-4 text-white placeholder:text-white/30 outline-none resize-none mb-4"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  <Send size={20} />
                  Send
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'answering':
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className={`inline-block px-6 py-2 rounded-full mb-6 ${
              gameState.current_choice === 'truth' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span className="font-bold text-xl">
                {gameState.current_choice === 'truth' ? '😇 TRUTH' : '😈 DARE'}
              </span>
            </div>
            
            <div className="bg-white/10 border border-pink-500/30 rounded-2xl p-6 mb-8">
              <p className="text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {gameState.current_question}
              </p>
            </div>
            
            <p className="text-gray-400 mb-6">
              {isMyTurn ? 'Answer or complete the dare!' : 'Waiting for response...'}
            </p>
            
            <button
              onClick={completeRound}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold transition-all"
            >
              Done! Next Round
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4a1a6b] via-[#2d1b4e] to-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-pink-500/20">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/match')}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <span className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Truth or Dare
            </span>
          </div>
          <div className="px-4 py-2 bg-pink-500/20 rounded-full">
            <span className="text-pink-400 font-semibold">Round {gameState.rounds_played + 1}</span>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {renderGameContent()}
      </div>
    </div>
  );
};

export default GameTruthOrDare;
