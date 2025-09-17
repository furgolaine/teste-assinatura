const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const propertiesRoutes = require('./routes/properties');
const plansRoutes = require('./routes/plans');
const subscriptionsRoutes = require('./routes/subscriptions');
const shipmentsRoutes = require('./routes/shipments');
const reportsRoutes = require('./routes/reports');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://admin.yourdomain.com'] 
    : true, // Allow all origins in development
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.'
  }
});
app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.message
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Token inválido'
    });
  }

  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Dados já existem no sistema'
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      error: 'Referência inválida'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

module.exports = app;

