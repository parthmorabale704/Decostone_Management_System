const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { startLowStockNotifications } = require('./services/notificationService');

dotenv.config();

// Ensure DB is initialized & seeded
require('./db/database');
const seedDatabase = require('./db/seed');
seedDatabase();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
    }
  });
  next();
});

// Register API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/godowns', require('./routes/godownRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/system', require('./routes/auditRoutes'));
app.use('/api/operations', require('./routes/operationsRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'DecoStone Material Management System API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : (err.message || 'Internal Server Error')
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🏛️  DecoStone MMS Server running on port ${PORT}`);
  console.log(`📍 REST API available at http://localhost:${PORT}/api`);
  console.log(`===============================================`);
  startLowStockNotifications();
});

module.exports = app;
