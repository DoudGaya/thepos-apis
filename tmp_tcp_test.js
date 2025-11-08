require('dotenv').config();
const net = require('net');
const url = new URL(process.env.DATABASE_URL || '');
const host = url.hostname;
const port = parseInt(url.port || '5432', 10);

console.log(`Attempting TCP connect to ${host}:${port}...`);
const socket = net.createConnection({ host, port, timeout: 10000 });

socket.on('connect', () => {
  console.log('✅ TCP connection established. DB host is reachable.');
  socket.end();
  process.exit(0);
});

socket.on('timeout', () => {
  console.error('❌ TCP connection timeout. DB may be paused or unreachable.');
  socket.destroy();
  process.exit(1);
});

socket.on('error', (err) => {
  console.error('❌ TCP connection error:', err.message);
  process.exit(1);
});
