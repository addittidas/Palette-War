import React from 'react';
import './StartPage.css';

function StartPage({ onStartGame }) {
  return (
    <div className="start-page">
      <div className="start-page-content">
        <h1 className="game-title">Palette War</h1>
        <p className="game-description">
          Draw, Guess, and Have Fun! Join the ultimate multiplayer Pictionary experience.
        </p>
        <button className="play-button" onClick={onStartGame}>
          Play Game
        </button>
        <div className="features">
          <div className="feature">
            <span className="feature-icon">🎨</span>
            <span>Real-time Drawing</span>
          </div>
          <div className="feature">
            <span className="feature-icon">👥</span>
            <span>Multiplayer Fun</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🏆</span>
            <span>Score Points</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StartPage;
