const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const port = process.env.PORT || 3000;
const rooms = new Map();

const wins = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function createRoomCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function newRoom(code) {
  return {
    code,
    board: Array(9).fill(""),
    history: [],
    turn: "X",
    gameOver: false,
    winner: "",
    players: { X: null, O: null }
  };
}

function winningMark(board) {
  for (const [a, b, c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.includes("") ? "" : "draw";
}

function send(socket, message) {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(room, message) {
  send(room.players.X, message);
  send(room.players.O, message);
}

function broadcastState(room) {
  broadcast(room, {
    type: "state",
    board: room.board,
    history: room.history,
    turn: room.turn,
    gameOver: room.gameOver,
    winner: room.winner
  });
}

function removePlayer(socket) {
  if (!socket.roomCode) return;
  const room = rooms.get(socket.roomCode);
  if (!room) return;
  if (room.players[socket.mark] === socket) room.players[socket.mark] = null;
  broadcast(room, { type: "waiting", room: room.code });
  if (!room.players.X && !room.players.O) rooms.delete(room.code);
  socket.roomCode = null;
  socket.mark = null;
}

const server = http.createServer((request, response) => {
  if (request.url !== "/" && request.url !== "/game.html") {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  fs.createReadStream(path.join(__dirname, "game.html")).pipe(response);
});

const webSocketServer = new WebSocket.Server({ server });

webSocketServer.on("connection", socket => {
  socket.on("message", raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }

    if (message.type === "create") {
      removePlayer(socket);
      const room = newRoom(createRoomCode());
      room.players.X = socket;
      socket.roomCode = room.code;
      socket.mark = "X";
      rooms.set(room.code, room);
      send(socket, { type: "room", room: room.code, mark: "X" });
      send(socket, { type: "waiting", room: room.code });
      return;
    }

    if (message.type === "join") {
      const room = rooms.get(String(message.room || "").toUpperCase());
      if (!room) return send(socket, { type: "error", message: "Room not found" });
      if (room.players.O) return send(socket, { type: "error", message: "Room is full" });
      removePlayer(socket);
      room.players.O = socket;
      socket.roomCode = room.code;
      socket.mark = "O";
      send(socket, { type: "room", room: room.code, mark: "O" });
      broadcastState(room);
      return;
    }

    const room = rooms.get(socket.roomCode);
    if (!room || room.players.X === null || room.players.O === null) return;

    if (message.type === "move") {
      const index = Number(message.index);
      if (room.gameOver || socket.mark !== room.turn || !Number.isInteger(index) || index < 0 || index > 8 || room.board[index]) return;
      room.board[index] = socket.mark;
      room.history.push({ player: socket.mark, index });
      const result = winningMark(room.board);
      if (result) {
        room.gameOver = true;
        room.winner = result === "draw" ? "" : result;
      } else {
        room.turn = room.turn === "X" ? "O" : "X";
      }
      broadcastState(room);
      return;
    }

    if (message.type === "reset") {
      room.board = Array(9).fill("");
      room.history = [];
      room.turn = "X";
      room.gameOver = false;
      room.winner = "";
      broadcastState(room);
    }
  });

  socket.on("close", () => removePlayer(socket));
});

server.listen(port, () => {
  console.log(`Tic Tac Toe server running at http://localhost:${port}`);
});
