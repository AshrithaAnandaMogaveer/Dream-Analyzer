const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('./config/database');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Trust proxy to avoid express-rate-limit warnings in dev behind localhost
app.set('trust proxy', 1);

// Security middleware - configure to allow cross-origin images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable gzip compression to reduce payload sizes and speed responses
app.use(compression());

// Allow multiple dev origins (CRA may run on 3000 or 3001). Respect CLIENT_URL if set.
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
].filter(Boolean);

// In development, allow all localhost origins and common dev ports
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('*'); // Allow all origins in development to prevent CORS issues
}

// Configure CORS before other middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser clients or same-origin requests without origin header
    if (!origin) return callback(null, true);
    // Allow all origins in development or if '*' is in allowedOrigins
    if (allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Serve temp-images with CORS headers before other routes
app.use('/temp-images', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}, express.static(path.join(__dirname, 'temp-images'), {
  fallthrough: false,
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Debug route to check environment variables
app.get('/debug/env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    IMG_TEST_STUB: process.env.IMG_TEST_STUB,
    GENERATOR_API_BASE: process.env.GENERATOR_API_BASE ? 'set' : 'not set',
    GENERATOR_API_KEY: process.env.GENERATOR_API_KEY ? 'set' : 'not set',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'not set',
    PORT: process.env.PORT
  });
});

// Fallback for missing temp images
app.get('/temp-images/:file', (req, res) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    <text x="50%" y="50%" font-family="Arial" font-size="16" text-anchor="middle" fill="#666">Image not found</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === Serve temp-images early with permissive headers ===
// Middleware to add permissive headers for images (before static)
app.use('/temp-images', (req, res, next) => {
  // Allow cross-origin image fetching from the UI
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Ensure responses are allowed to be loaded cross-origin
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // Do not set restrictive caching policy for dev; set a cache in production
  res.setHeader('Cache-Control', 'public, max-age=86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
console.log(`Serving static files from: ${uploadsDir}`);

// Debug middleware to log static file requests
app.use('/uploads', (req, res, next) => {
    console.log(`Static file request: ${req.originalUrl}`);
    console.log(`Looking for file: ${path.join(uploadsDir, req.path)}`);
    next();
});

app.use('/uploads', express.static(uploadsDir, {
  dotfiles: 'allow',
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    // Set proper content type based on file extension
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
    // Allow cross-origin access to images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
  }
}));

// Serve temp-images (keep existing)
app.use('/temp-images', express.static(path.join(__dirname, 'temp-images'), {
  dotfiles: 'deny',
  maxAge: '24h'
}));

// Serve meditation-sounds from client public folder (optional fallback)
app.use('/meditation-sounds', express.static(path.join(__dirname, '..', 'client', 'public', 'meditation-sounds'), {
  dotfiles: 'deny',
  maxAge: '7d'
}));

// Fallback route for temp-images (returns placeholder SVG if file missing)
app.get('/temp-images/:name', (req, res) => {
  const fileName = req.params.name;
  const fsPath = path.join(__dirname, 'temp-images', fileName);
  const fs = require('fs');
  res.sendFile(fsPath, (err) => {
    if (err) {
      console.error('sendFile error for', fsPath, err);
      // respond with a small placeholder SVG body rather than a 500 file-not-found
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="#888">Image unavailable</text></svg>`;
      res.status(200).type('image/svg+xml').send(svg);
    }
  });
});

// Connect to MongoDB with local/Atlas fallback
connectDB()
  .then(() => logger.info('✅ Database initialized'))
  .catch((err) => logger.error(`❌ Database init failed: ${err.message}`));

// Function to safely require routes
function useRoute(app, mountPath, routePath) {
  try {
    require.resolve(`./routes/${routePath}`);
    app.use(mountPath, require(`./routes/${routePath}`));
    logger.info(`✅ Loaded route: ${mountPath}`);
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      logger.warn(`⚠️  Route not found: ${mountPath} (./routes/${routePath}.js)`);
    } else {
      const details = error && (error.stack || error.message || String(error));
      logger.error(`❌ Error loading route ${mountPath}: ${details}`);
    }
  }
}

// Simple test route for Stable Diffusion
app.get('/api/sd/test', (req, res) => {
    console.log('Test route hit!');
    res.json({ message: 'Stable Diffusion test route is working!' });
});

// Load only existing routes
useRoute(app, '/api/auth', 'auth');
useRoute(app, '/api/dreams', 'dreams');
useRoute(app, '/api/chatbot', 'chatbot');

// === Mount dream-diary router safely ===
try {
  // adjust path if your routes folder is different
  const path = './routes/dreamDiary';
  console.log(`Attempting to mount route ${path}`);
  const dreamDiaryRouter = require(path);
  app.use('/api/dream-diary', dreamDiaryRouter);
  logger.info('✅ Loaded route: /api/dream-diary');
} catch (err) {
  // Log full stack so you can fix any require-time issue
  logger.error('❌ Failed to load /api/dream-diary route:', err && (err.stack || err.message || err));
}

// Stable Diffusion image generation route
try {
    const sdImageRouter = require('./routes/sdImageGeneration');
    app.use('/api/sd', sdImageRouter);
    logger.info('✅ Loaded route: /api/sd');
    
    // Add a test route
    app.get('/api/sd/status', (req, res) => {
        res.json({ status: 'Stable Diffusion API is working' });
    });
} catch (error) {
    console.error('❌ Error loading Stable Diffusion route:', error);
    logger.error('❌ Error loading Stable Diffusion route:', error.message);
    
    // Add a fallback route with error information
    app.use('/api/sd', (req, res, next) => {
        res.status(500).json({
            error: 'Stable Diffusion route failed to load',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    });
}

// Local image generation route
const localImageRouter = require('./routes/localImageGeneration');
app.use('/api/local-image', localImageRouter);
useRoute(app, '/api/community', 'communityEnhanced');
useRoute(app, '/api/feedback', 'feedback');
useRoute(app, '/api/analytics', 'analytics');
// useRoute(app, '/api/dream-diary', 'dreamDiary'); // Now loaded above with detailed error handling
useRoute(app, '/api/dream-diary/lifestyle', 'enhancedLifestyleRoutes');
useRoute(app, '/api/recent-activity', 'recentActivity');
useRoute(app, '/api/activity', 'activity');
useRoute(app, '/api/generate-image', 'imageGeneration');

// Serve static files from the temp-images directory
app.use('/temp-images', express.static(path.join(__dirname, 'temp-images'), {
  maxAge: '1d', // Cache images for 1 day
  setHeaders: (res, filePath) => {
    // Set proper content type based on file extension
    if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
}));

// Downgrade dream-diary GET errors to safe 200 fallback in development to avoid console spam
app.use('/api/dream-diary', (err, req, res, next) => {
  if (req.method === 'GET' && err) {
    console.warn('dream-diary GET fallback:', err.message || err);
    return res.status(200).json({
      message: 'OK (fallback)',
      analyses: [],
      pagination: { total: 0, page: 1, limit: 10, pages: 0 },
      stats: { totalDreams: 0, avgStress: 0, avgHappiness: 0 }
    });
  }
  next(err);
});

// Legacy health route compatibility
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'Dream Analyzer Active' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'Dream Analyzer Active' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('ping', () => {
    try { socket.emit('pong', { t: Date.now() }); } catch (_) {}
  });
  
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });
  
  socket.on('leave-room', (room) => {
    try {
      socket.leave(room);
      console.log(`User ${socket.id} left room ${room}`);
    } catch (_) {}
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use. Please stop the other process or change PORT.`);
    process.exit(1);
  } else {
    logger.error(`❌ Server error: ${err.message}`);
    process.exit(1);
  }
});

server.listen(PORT, HOST, () => {
  logger.info(`✅ Backend Running on ${HOST}:${PORT}`);
  logger.info(`🌐 Access at: http://localhost:${PORT}`);
});
