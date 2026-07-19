const { PeerServer } = require('peer');

const PORT = process.env.PORT || 9000;

const peerServer = PeerServer({
  port: PORT,
  path: '/',
  // Set proxied to true to trust reverse-proxy headers (Fly.io/Railway/Render load balancers)
  proxied: true,
  allow_discovery: false
});

peerServer.on('connection', (client) => {
  console.log(`Client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`Client disconnected: ${client.getId()}`);
});

console.log(`PeerJS Signaling Server running on port ${PORT}`);
