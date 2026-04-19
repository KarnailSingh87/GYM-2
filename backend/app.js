import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import memberRoutes from './routes/members.js'
import whatsappRoutes from './routes/whatsapp.js'

dotenv.config()

const app = express()

// Build allowed-origins list from env (supports multiple comma-separated values)
const frontendOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
if (process.env.FRONTEND_ORIGIN) {
  process.env.FRONTEND_ORIGIN.split(',').map(o => o.trim()).forEach(o => {
    if (o && !frontendOrigins.includes(o)) frontendOrigins.push(o);
  });
}
if (process.env.ADMIN_ORIGIN) {
  process.env.ADMIN_ORIGIN.split(',').map(o => o.trim()).forEach(o => {
    if (o && !frontendOrigins.includes(o)) frontendOrigins.push(o);
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (frontendOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin not allowed — ${origin}`));
  },
  credentials: true
}))

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Important for CORS API
}))

// Rate limiting (Basic DDoS and brute force protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased slightly for the admin dashboard
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/whatsapp', whatsappRoutes)

// Health-check / keep-alive endpoint
app.get('/api/ping', (req, res) => res.json({ pong: true, ts: Date.now() }))

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Error Handler — Prevents app crash and returns consistent error shape
app.use((err, req, res, next) => {
  console.error('🔥 [Server] Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Prevent process crash on unhandled async errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('😱 [Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💀 [Process] Uncaught Exception:', error);
  // Don't exit — nodemon will restart if truly fatal; we log and continue for resilience
});

export default app
