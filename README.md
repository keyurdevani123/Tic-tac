# Multiplayer Tic Tac Toe

## Start the game

1. Install Node.js on the host PC from https://nodejs.org.
2. Open PowerShell in this folder.
3. Run:

```powershell
npm install
npm start
```

4. On the host PC, open `http://localhost:3000`.
5. Click **Create Room** and share the room code.
6. Find the host PC's local IPv4 address with `ipconfig`, then the other player opens:

```text
http://HOST-IP:3000
```

For example: `http://192.168.1.25:3000`

The other player enters the room code and clicks **Join Room**. Both PCs must be on the same network, and Windows Firewall must allow Node.js on the private network.

The bot remains available in local mode. Use **Bot: On/Off** to switch between local bot play and two-player local play.
