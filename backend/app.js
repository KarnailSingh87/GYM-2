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

export default app
