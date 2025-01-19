import React, { useState, useEffect, useRef } from 'react';
import Canvas from './Canvas';
import confetti from 'canvas-confetti';

function GameRoom({ socket, username, roomId }) {
  const [messages, setMessages] = useState([]);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [wordChoices, setWordChoices] = useState([]);
  const [revealedWord, setRevealedWord] = useState('');
  const [showScoreCard, setShowScoreCard] = useState(false);
  const [gameStatus, setGameStatus] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [roundActive, setRoundActive] = useState(false);
  const [timer, setTimer] = useState(null);
  const [timerType, setTimerType] = useState(null);
  const [prevScores, setPrevScores] = useState({});
  const [guess, setGuess] = useState('');
  const [word, setWord] = useState('');
  const [wordLength, setWordLength] = useState(0);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.3 },
        zIndex: 1500
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.3 },
        zIndex: 1500
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (timer !== null) {
      const startTime = Date.now();
      const duration = timer;
      
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        
        if (remaining === 0) {
          clearInterval(timerRef.current);
          setTimer(null);
        } else {
          setTimer(remaining);
        }
      }, 100);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timer]);

  useEffect(() => {
    if (!socket) return;

    socket.on('playerJoined', ({ players, scores, gameStarted }) => {
      setPlayers(players);
      setScores(scores);
      setGameStarted(gameStarted);
    });

    socket.on('systemMessage', ({ message, type, avatar }) => {
      setMessages(prev => [...prev, {
        type: 'system',
        messageType: type,
        message,
        avatar
      }]);
    });

    socket.on('gameStarted', ({ drawer, isStarted }) => {
      setCurrentDrawer(drawer);
      setGameStarted(isStarted);
      setIsDrawing(drawer.id === socket.id);
      setShowScoreCard(false);
      setRevealedWord('');
      setRoundActive(false);
      setWord('');
      setWordLength(0);
      setWordChoices([]);
      setGameStatus(`${drawer.username} is choosing a word...`);
      setMessages(prev => [...prev, {
        type: 'system',
        message: `${drawer.username} is choosing a word...`
      }]);
    });

    socket.on('wordChoices', (choices) => {
      setWordChoices(choices);
    });

    socket.on('roundStarted', ({ drawer, wordLength }) => {
      setCurrentDrawer(drawer);
      setIsDrawing(drawer.id === socket.id);
      setWordLength(wordLength);
      setRoundActive(true);
      setWordChoices([]);
      setGameStatus(`${drawer.username} is drawing now!`);
      setMessages(prev => [...prev, {
        type: 'system',
        message: `${drawer.username} is drawing now!`
      }]);
    });

    socket.on('wordToDraw', (word) => {
      setWord(word);
    });

    socket.on('clearCanvas', () => {
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    });

    socket.on('newGuess', ({ username, guess, avatar }) => {
      setMessages(prev => [...prev, {
        username,
        message: guess,
        type: 'wrong-guess',
        avatar
      }]);
    });

    socket.on('correctGuess', ({ username, roundScores, scores, players, word }) => {
      setPrevScores(scores);
      setScores(scores);
      setPlayers(players);
      setRevealedWord(word);
      setShowScoreCard(true);
      setRoundActive(false);
      triggerConfetti();
      
      setMessages(prev => [...prev, {
        type: 'system',
        message: ` ${username} guessed correctly! The word was "${word}"!`
      }]);
    });

    socket.on('wordSelectionTimer', (time) => {
      setTimer(time);
      setTimerType('selection');
    });

    socket.on('guessingTimer', (time) => {
      setTimer(time);
      setTimerType('guessing');
    });

    socket.on('timeUp', ({ word }) => {
      setTimer(null);
      setTimerType(null);
      setShowScoreCard(true);
      setRevealedWord(word);
      setRoundActive(false);
      setMessages(prev => [...prev, {
        type: 'system',
        message: `Time's up! The word was "${word}"!`
      }]);
    });

    socket.on('gameOver', ({ players, scores }) => {
      setPlayers(players);
      setScores(scores);
      setShowScoreCard(true);
      setGameStatus('Game Over!');
      setGameStarted(false);
      triggerConfetti();
    });

    return () => {
      socket.off('playerJoined');
      socket.off('systemMessage');
      socket.off('gameStarted');
      socket.off('wordChoices');
      socket.off('roundStarted');
      socket.off('wordToDraw');
      socket.off('newGuess');
      socket.off('correctGuess');
      socket.off('clearCanvas');
      socket.off('wordSelectionTimer');
      socket.off('guessingTimer');
      socket.off('timeUp');
      socket.off('gameOver');
    };
  }, [socket]);

  const startGame = () => {
    socket.emit('startGame', roomId);
  };

  const selectWord = (selectedWord) => {
    if (!socket) return;
    socket.emit('selectWord', { roomId, word: selectedWord });
    setWord(selectedWord);
    setWordChoices([]);
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || !socket || currentDrawer?.id === socket.id) return;

    socket.emit('guess', {
      roomId,
      guess: guess.trim(),
      username
    });
    setGuess('');
  };

  const renderWordDisplay = () => {
    if (!roundActive && !revealedWord) return null;
    
    if (isDrawing && word) {
      return <div className="word-display drawing">Word to draw: {word}</div>;
    }
    
    if (revealedWord) {
      return <div className="word-display revealed">Word: {revealedWord}</div>;
    }
    
    if (wordLength > 0 && roundActive) {
      return (
        <div className="word-display">
          Word: {Array(wordLength).fill('_').join(' ')}
        </div>
      );
    }
    
    return null;
  };

  const renderTimer = () => {
    if (timer === null) return null;
    
    const seconds = Math.ceil(timer / 1000);
    const timerClass = seconds <= 5 ? 'timer-warning' : '';
    
    return (
      <div className={`timer ${timerClass}`}>
        {timerType === 'selection' ? 'Choose a word: ' : 'Time to guess: '}
        {seconds}s
      </div>
    );
  };

  return (
    <div className="game-room">
      {wordChoices.length > 0 && (
        <div className="word-choices-overlay">
          <div className="word-choices">
            <h3>Choose a word to draw:</h3>
            <div className="word-buttons">
              {wordChoices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => selectWord(choice)}
                  className="word-choice-btn"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showScoreCard && (
        <div className="score-card-overlay">
          <div className="score-card">
            <h2>Scores</h2>
            
            <div className="final-scores">
              {players
                .sort((a, b) => scores[b.id] - scores[a.id])
                .map(player => (
                  <div key={player.id} className="player-score">
                    <div className="player-info">
                      <span className="player-rank">#{player.rank}</span>
                      <img src={player.avatar} alt={player.username} className="player-avatar" />
                      <span className="player-name">{player.username}</span>
                    </div>
                    <span className="player-points">{scores[player.id] || 0} points</span>
                  </div>
              ))}
            </div>
            
            <p className="next-round-info">
              Next turn will start automatically...
            </p>
          </div>
        </div>
      )}

      <div className="game-header">
        {renderTimer()}
        {renderWordDisplay()}
        {gameStatus && <div className="game-status">{gameStatus}</div>}
      </div>

      <div className="game-content">
        <div className="game-info">
          <h2>Room: {roomId}</h2>
          {!gameStarted && players.length >= 2 && (
            <button onClick={startGame} className="start-game-btn">
              Start Game
            </button>
          )}
          <div className="players">
            <h3>Players:</h3>
            {players
              .sort((a, b) => scores[b.id] - scores[a.id])
              .map(player => (
                <div key={player.id} className={`player ${currentDrawer?.id === player.id ? 'drawing' : ''}`}>
                  <div className="player-info">
                    <span className="player-rank">#{player.rank}</span>
                    <img src={player.avatar} alt={player.username} className="player-avatar" />
                    <span className="player-name">
                      {player.username}
                      {currentDrawer?.id === player.id ? ' (Drawing)' : ''}
                    </span>
                  </div>
                  <span className="player-points">{scores[player.id] || 0}</span>
                </div>
            ))}
          </div>
        </div>

        <div className="game-area">
          <Canvas
            ref={canvasRef}
            isDrawing={isDrawing && roundActive}
            socket={socket}
            roomId={roomId}
          />
        </div>

        <div className="chat-area">
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type} ${msg.messageType || ''}`}>
                {msg.username ? (
                  <div className="message-content">
                    {msg.avatar && <img src={msg.avatar} alt={msg.username} className="message-avatar" />}
                    <div className="message-text">
                      <strong>{msg.username}:</strong> {msg.message}
                      {msg.type === 'wrong-guess' && (
                        <span className="wrong-guess-indicator"> (Wrong guess)</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className={`system-message ${msg.messageType || ''}`}>
                    {msg.avatar && <img src={msg.avatar} alt="System" className="message-avatar" />}
                    {msg.message}
                  </span>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleGuess} className="guess-form">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder={currentDrawer?.id === socket.id ? "You are drawing..." : "Type your guess here..."}
              disabled={currentDrawer?.id === socket.id || !roundActive}
            />
            <button 
              type="submit" 
              disabled={currentDrawer?.id === socket.id || !roundActive}
            >
              Guess
            </button>
          </form>
        </div>
      </div>

      {players.length >= 2 && !gameStarted && players[0].id === socket.id && (
        <button onClick={startGame} className="start-game-btn">
          Start Game
        </button>
      )}
    </div>
  );
};

export default GameRoom;
