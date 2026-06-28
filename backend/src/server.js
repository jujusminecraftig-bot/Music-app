require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const audioRoutes = require('./routes/audio');
const playlistRoutes = require('./routes/playlists');
const favoriteRoutes = require('./routes/favorites');
const recentRoutes = require('./routes/recent');
const queueRoutes = require('./routes/queue');
const adminRoutes = require('./routes/admin');
const deezerRoutes = require('./routes/deezer');
const recommendationsRoutes = require('./routes/recommendations');
const discordRoutes = require('./routes/discord');
const discordRpc = require('./services/discordRpc');

const app = express();
const PORT = process.env.PORT || 5000;
const NEXT_PORT = process.env.NEXT_PORT || 3000;

// Resolve paths relative to the repo root (two levels up from backend/src/)
const REPO_ROOT = path.resolve(__dirname, '../../');
const FRONTEND_STANDALONE = path.join(REPO_ROOT, 'frontend/.next/standalone');
const FRONTEND_STATIC = path.join(REPO_ROOT, 'frontend/.next/static');
const FRONTEND_PUBLIC = path.join(REPO_ROOT, 'frontend/public');

const frontendBuilt = fs.existsSync(FRONTEND_STANDALONE);

// Security middleware
app.use(helmet({
  // Relax CSP so the Next.js frontend assets load correctly
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true,
}));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Rate limiting (disabled for development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);
}

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded audio and images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve Next.js static assets and public files (must come before API routes)
if (frontendBuilt) {
  // Next.js compiled static assets (JS chunks, CSS, etc.)
  app.use('/_next/static', express.static(FRONTEND_STATIC, { maxAge: '1y', immutable: true }));
  // Next.js public directory (favicon, images, etc.)
  app.use(express.static(FRONTEND_PUBLIC));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/recent', recentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/deezer', deezerRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/discord', discordRoutes);

// Proxy all remaining requests to the Next.js standalone server
if (frontendBuilt) {
  app.use(
    createProxyMiddleware({
      target: `http://localhost:${NEXT_PORT}`,
      changeOrigin: true,
      on: {
        error: (err, req, res) => {
          console.error('Next.js proxy error:', err.message);
          res.status(502).json({ error: 'Frontend unavailable' });
        },
      },
    })
  );
} else {
  // Fallback when frontend has not been built yet
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handler (must be last)
app.use(errorHandler);

// Spawn the Next.js standalone server as a child process
let nextProcess = null;

function startNextServer() {
  if (!frontendBuilt) {
    console.log('⚠️  Next.js standalone build not found — frontend will not be served.');
    console.log('   Run `npm run build` from the project root to build the frontend.');
    return;
  }

  const nextServerPath = path.join(FRONTEND_STANDALONE, 'server.js');

  nextProcess = spawn('node', [nextServerPath], {
    env: {
      ...process.env,
      PORT: String(NEXT_PORT),
      HOSTNAME: '127.0.0.1',
    },
    stdio: 'inherit',
  });

  nextProcess.on('error', (err) => {
    console.error('❌ Failed to start Next.js server:', err);
  });

  nextProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Next.js server exited with code ${code}`);
    }
  });

  console.log(`🎨 Next.js frontend starting on port ${NEXT_PORT}`);
}

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();

    // Start the Next.js standalone server before accepting requests
    startNextServer();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      if (frontendBuilt) {
        console.log(`🌐 Frontend proxied from Next.js on port ${NEXT_PORT}`);
      }

      // Start Discord RPC (only if DISCORD_CLIENT_ID is configured)
      if (process.env.DISCORD_CLIENT_ID) {
        discordRpc.start();
      } else {
        console.log('ℹ️  Discord RPC disabled — set DISCORD_CLIENT_ID in .env to enable');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server`);
  if (nextProcess) {
    nextProcess.kill();
  }
  discordRpc.destroy();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
