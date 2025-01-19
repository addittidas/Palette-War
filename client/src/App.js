import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import GameRoom from './components/GameRoom';
import './App.css';

const ENDPOINT = 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const newSocket = io(ENDPOINT);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim() || !socket) return;

    socket.emit('joinRoom', { roomId, username });
    setJoined(true);
  };

  if (!socket) return <div>Connecting...</div>;

  if (!joined) {
    return (
      <div className="join-form">
        <h1>Pictionary Game</h1>
        <form onSubmit={handleJoinRoom}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button type="submit">Join Room</button>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <GameRoom
        socket={socket}
        roomId={roomId}
        username={username}
      />
    </div>
  );
}

export default App;
