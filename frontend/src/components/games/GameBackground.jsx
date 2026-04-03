import React from 'react';

const PARTICLES = [
  { top: '12%', left: '18%', size: 2, delay: '0s', duration: '26s', opacity: 0.24 },
  { top: '22%', left: '72%', size: 3, delay: '3s', duration: '30s', opacity: 0.18 },
  { top: '34%', left: '42%', size: 2, delay: '6s', duration: '24s', opacity: 0.2 },
  { top: '48%', left: '82%', size: 2, delay: '2s', duration: '28s', opacity: 0.16 },
  { top: '58%', left: '26%', size: 3, delay: '9s', duration: '32s', opacity: 0.2 },
  { top: '68%', left: '64%', size: 2, delay: '5s', duration: '27s', opacity: 0.18 },
  { top: '78%', left: '12%', size: 2, delay: '1s', duration: '29s', opacity: 0.16 },
  { top: '84%', left: '54%', size: 3, delay: '7s', duration: '33s', opacity: 0.22 },
];

export const GameBackground = React.memo(function GameBackground() {
  return (
    <div className="game-background" aria-hidden="true">
      <div className="game-background__gradient" />
      <div className="game-background__glow game-background__glow--primary" />
      <div className="game-background__glow game-background__glow--secondary" />
      <div className="game-background__glow game-background__glow--accent" />

      {PARTICLES.map((particle, index) => (
        <span
          key={`game-particle-${index}`}
          className="game-background__particle"
          style={{
            top: particle.top,
            left: particle.left,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
});

export default GameBackground;