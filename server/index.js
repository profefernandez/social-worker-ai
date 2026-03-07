require('dotenv').config();

const { validateEnv } = require('./utils/validateEnv');
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');

const { testConnection } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const { setupSocketHandlers } = require('./socket/handler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
  },
});
app.set('io', io);

// Security headers (relax CSP for the widget embed use-case)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  })
);

// Body parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built chatbot widget — therapists embed via:
//   <script src="https://your-domain.com/widget.js" data-session-id="<id>"></script>
const widgetDistPath = path.join(__dirname, '..', 'chatbot', 'dist');
app.use(
  express.static(widgetDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    },
  })
);

// Serve the built dashboard
const dashboardDistPath = path.join(__dirname, '..', 'dashboard', 'dist');
app.use('/dashboard', express.static(dashboardDistPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket
setupSocketHandlers(io);

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
  testConnection();
});

module.exports = { app, server };
