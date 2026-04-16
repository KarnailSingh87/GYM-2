import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import memberRoutes from './routes/members.js'
import whatsappRoutes from './routes/whatsapp.js'

dotenv.config()

const app = express()
app.use(express.json())

const FRONTEND = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: FRONTEND }))

app.use('/api/auth', authRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/whatsapp', whatsappRoutes)

app.get('/api/ping', (req, res) => res.json({ pong: true }))

export default app
