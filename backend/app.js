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

const FRONTEND = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
app.use(cors({
  origin: [FRONTEND, "http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}))

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // important for CORS API
}))

// Rate limiting (Basic DDoS and brute force protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/whatsapp', whatsappRoutes)

app.get('/api/ping', (req, res) => res.json({ pong: true }))

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// GLOBAL ERROR HANDLER - Prevents app crash and sends consistent errors
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// CRITICAL: Prevent process crash on unhandled background errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('😱 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💀 Uncaught Exception:', error);
  // Optional: Graceful shutdown if needed, but for gym use, let node-cron/nodemon handle restart
});

export default app
