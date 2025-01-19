# Multiplayer Pictionary Game

A real-time multiplayer drawing and guessing game built with React.js and Socket.io.

## Features

- Real-time multiplayer gameplay
- Drawing canvas with real-time sync
- Chat system for guessing
- Score tracking
- Turn-based gameplay
- Room system for multiple concurrent games

## Tech Stack

- Frontend: React.js
- Backend: Node.js + Express.js
- Real-time Communication: Socket.io
- Styling: CSS Grid and Flexbox

## Setup and Running

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```
3. Install client dependencies:
   ```bash
   cd client
   npm install
   ```

### Running the Application

1. Start the server:
   ```bash
   cd server
   npm start
   ```
   The server will run on http://localhost:5000

2. Start the client (in a new terminal):
   ```bash
   cd client
   npm start
   ```
   The client will run on http://localhost:3000

## How to Play

1. Open http://localhost:3000 in your browser
2. Enter your username and a room ID
3. Share the room ID with friends
4. Once at least 2 players join, click "Start Game"
5. Take turns drawing and guessing
6. Points are awarded based on correct guesses

## Game Rules

- One player draws while others guess
- The drawer cannot type in chat
- Points are awarded for correct guesses
- Each round has a time limit
- The player with the most points wins
