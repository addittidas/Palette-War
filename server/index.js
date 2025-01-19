const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game state
const rooms = new Map();
const words = [
  'dog', 'cat', 'house', 'tree', 'car', 'sun', 'moon', 'book', 'phone', 'computer',
  'bird', 'fish', 'flower', 'mountain', 'beach', 'pizza', 'guitar', 'elephant', 'butterfly', 'rainbow'
];

function getRandomWords(count) {
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getCleanPlayerData(player) {
  return {
    id: player.id,
    username: player.username,
    avatar: player.avatar,
    rank: player.rank
  };
}

function startWordSelectionTimer(room, roomId) {
  const WORD_SELECTION_TIME = 15000; // 15 seconds
  
  if (room.wordSelectionTimer) {
    clearTimeout(room.wordSelectionTimer);
  }
  
  room.wordSelectionTimer = setTimeout(() => {
    // If no word was selected, choose a random one
    if (!room.word) {
      const randomWord = getRandomWords(1)[0];
      room.word = randomWord;
      
      // Clear canvas and notify players
      io.to(roomId).emit('clearCanvas');
      io.to(roomId).emit('roundStarted', {
        drawer: getCleanPlayerData(room.currentDrawer),
        wordLength: randomWord.length
      });
      io.to(room.currentDrawer.id).emit('wordToDraw', randomWord);
      
      // Start guessing timer
      startGuessingTimer(room, roomId);
    }
  }, WORD_SELECTION_TIME);
}

function startGuessingTimer(room, roomId) {
  const GUESSING_TIME = 40000; // 40 seconds
  
  if (room.guessingTimer) {
    clearTimeout(room.guessingTimer);
  }
  
  room.guessingTimer = setTimeout(() => {
    // Time's up - reveal word and move to next player
    io.to(roomId).emit('timeUp', {
      word: room.word,
      scores: room.scores,
      players: room.players.map(getCleanPlayerData)
    });
    
    // Reset for next round
    setTimeout(() => {
      if (room.players.length >= 2) {
        room.word = null;
        room.roundScores = {};
        
        // Move to next drawer
        const currentIndex = room.players.findIndex(p => p.id === room.currentDrawer.id);
        const nextIndex = (currentIndex + 1) % room.players.length;
        room.currentDrawer = room.players[nextIndex];
        
        io.to(roomId).emit('gameStarted', { 
          drawer: getCleanPlayerData(room.currentDrawer),
          isStarted: true
        });
        
        const wordChoices = getRandomWords(3);
        io.to(room.currentDrawer.id).emit('wordChoices', wordChoices);
        startWordSelectionTimer(room, roomId);
      }
    }, 5000);
  }, GUESSING_TIME);
}

function updatePlayerRanks(room) {
  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => 
    (room.scores[b.id] || 0) - (room.scores[a.id] || 0)
  );
  
  // Assign ranks (handle ties)
  let currentRank = 1;
  let prevScore = -1;
  let sameRankCount = 0;
  
  sortedPlayers.forEach((player, index) => {
    const playerScore = room.scores[player.id] || 0;
    if (playerScore === prevScore) {
      sameRankCount++;
    } else {
      currentRank = index + 1;
      sameRankCount = 0;
    }
    player.rank = currentRank;
    prevScore = playerScore;
  });
  
  // Update ranks in original players array
  room.players.forEach(player => {
    const updatedPlayer = sortedPlayers.find(p => p.id === player.id);
    player.rank = updatedPlayer.rank;
  });
}

function moveToNextDrawer(room, roomId) {
  const currentIndex = room.players.findIndex(p => p.id === room.currentDrawer.id);
  const nextIndex = (currentIndex + 1) % room.players.length;
  room.currentDrawer = room.players[nextIndex];
  
  return true;
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', ({ roomId, username }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: [],
        scores: {},
        roundScores: {},
        isPlaying: false,
        word: null,
        currentDrawer: null,
        wordSelectionTimer: null,
        guessingTimer: null
      });
    }
    
    const room = rooms.get(roomId);
    const avatarId = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarId}`;
    
    const player = { 
      id: socket.id, 
      username,
      avatar: avatarUrl,
      rank: 1 
    };
    
    room.players.push(player);
    room.scores[socket.id] = 0;
    room.roundScores[socket.id] = 0;
    
    updatePlayerRanks(room);
    
    const cleanPlayers = room.players.map(getCleanPlayerData);
    
    io.to(roomId).emit('playerJoined', {
      players: cleanPlayers,
      scores: room.scores,
      gameStarted: room.isPlaying
    });
    
    io.to(roomId).emit('systemMessage', {
      message: `${username} has joined the room!`,
      type: 'join',
      avatar: avatarUrl
    });
  });

  socket.on('startGame', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players.length >= 2 && !room.isPlaying) {
      room.isPlaying = true;
      room.currentDrawer = room.players[0];
      
      io.to(roomId).emit('gameStarted', { 
        drawer: getCleanPlayerData(room.currentDrawer),
        isStarted: true
      });

      const wordChoices = getRandomWords(3);
      io.to(room.currentDrawer.id).emit('wordChoices', wordChoices);
      
      startWordSelectionTimer(room, roomId);
    }
  });

  socket.on('selectWord', ({ roomId, word }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.currentDrawer.id) {
      room.word = word;
      
      // Clear any existing timers
      if (room.wordSelectionTimer) {
        clearTimeout(room.wordSelectionTimer);
        room.wordSelectionTimer = null;
      }
      
      // Clear canvas and notify players
      io.to(roomId).emit('clearCanvas');
      io.to(roomId).emit('roundStarted', {
        drawer: getCleanPlayerData(room.currentDrawer),
        wordLength: word.length
      });
      io.to(room.currentDrawer.id).emit('wordToDraw', word);
      
      // Start guessing timer
      startGuessingTimer(room, roomId);
    }
  });

  // Handle drawing events
  socket.on('draw', ({ roomId, drawData }) => {
    const room = rooms.get(roomId);
    if (room && room.currentDrawer && room.currentDrawer.id === socket.id) {
      socket.to(roomId).emit('drawing', drawData);
    }
  });

  socket.on('clearCanvas', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.currentDrawer && room.currentDrawer.id === socket.id) {
      socket.to(roomId).emit('clearCanvas');
    }
  });

  socket.on('guess', ({ roomId, guess, username }) => {
    const room = rooms.get(roomId);
    if (room && room.word && room.currentDrawer.id !== socket.id) {
      if (guess.toLowerCase() === room.word.toLowerCase()) {
        // Clear guessing timer
        if (room.guessingTimer) {
          clearTimeout(room.guessingTimer);
        }
        
        const guesserPoints = 100;
        const drawerPoints = 50;
        room.roundScores[socket.id] = guesserPoints;
        room.roundScores[room.currentDrawer.id] = drawerPoints;
        
        room.scores[socket.id] = (room.scores[socket.id] || 0) + guesserPoints;
        room.scores[room.currentDrawer.id] = (room.scores[room.currentDrawer.id] || 0) + drawerPoints;
        
        updatePlayerRanks(room);
        
        io.to(roomId).emit('clearCanvas');
        io.to(roomId).emit('correctGuess', {
          username,
          roundScores: room.roundScores,
          scores: room.scores,
          players: room.players.map(getCleanPlayerData),
          word: room.word
        });
        
        setTimeout(() => {
          if (room.players.length >= 2) {
            room.word = null;
            room.roundScores = {};
            
            const gameCanContinue = moveToNextDrawer(room, roomId);
            
            if (gameCanContinue) {
              io.to(roomId).emit('gameStarted', { 
                drawer: getCleanPlayerData(room.currentDrawer),
                isStarted: true
              });
              
              const wordChoices = getRandomWords(3);
              io.to(room.currentDrawer.id).emit('wordChoices', wordChoices);
              startWordSelectionTimer(room, roomId);
            }
          }
        }, 5000);
      } else {
        const player = room.players.find(p => p.id === socket.id);
        io.to(roomId).emit('newGuess', { 
          username, 
          guess,
          avatar: player?.avatar
        });
      }
    }
  });

  socket.on('disconnect', () => {
    // Find which room this socket was in
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const disconnectedPlayer = room.players[playerIndex];
        
        // Clear any active timers
        if (room.wordSelectionTimer) {
          clearTimeout(room.wordSelectionTimer);
        }
        if (room.guessingTimer) {
          clearTimeout(room.guessingTimer);
        }
        
        // Remove player from the room
        room.players.splice(playerIndex, 1);
        delete room.scores[socket.id];
        delete room.roundScores[socket.id];
        
        // Send system message about player leaving
        io.to(roomId).emit('systemMessage', {
          message: `${disconnectedPlayer.username} has left the room!`,
          type: 'leave'
        });
        
        // If this was the drawer, end the round
        if (room.currentDrawer && room.currentDrawer.id === socket.id) {
          room.word = null;
          room.isPlaying = false;
          
          if (room.players.length >= 2) {
            // Move to next drawer
            const nextIndex = playerIndex % room.players.length;
            room.currentDrawer = room.players[nextIndex];
            
            // Start new round
            const wordChoices = getRandomWords(3);
            io.to(roomId).emit('gameStarted', { 
              drawer: getCleanPlayerData(room.currentDrawer),
              isStarted: true
            });
            io.to(room.currentDrawer.id).emit('wordChoices', wordChoices);
            
            // Start word selection timer for new round
            startWordSelectionTimer(room, roomId);
          }
        }
        
        // Update all clients with new player list
        io.to(roomId).emit('playerJoined', {
          players: room.players.map(getCleanPlayerData),
          scores: room.scores,
          gameStarted: room.isPlaying
        });
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          rooms.delete(roomId);
        }
        
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
