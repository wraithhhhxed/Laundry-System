import express from 'express'

// Global fix: turuan si JSON.stringify kung paano i-convert ang BigInt
// (ginagamit natin ito sa Branch.date at Appointment.date sa Prisma schema —
// walang alam si JSON.stringify kung paano i-serialize ang BigInt bydefault).
BigInt.prototype.toJSON = function () {
  return Number(this)
}

import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import { EventEmitter } from 'events'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import adminRouter from './src/routes/adminRoute.js'
import branchRouter from './src/routes/branchRoute.js'
import userRouter from './src/routes/userRoute.js'
import { errorHandler } from './src/middlewares/error.middleware.js'
import settingRoute from './src/routes/settingRoute.js'
import productRoute from './src/routes/productRoute.js'
import inventoryRoute from './src/routes/inventoryRoute.js'
import salesRouter from './src/routes/salesRoute.js'
import auditRouter from './src/routes/auditRoute.js'
import extraServiceRouter from './src/routes/extraServiceRoute.js' // ✅ added

EventEmitter.defaultMaxListeners = 20

const app = express()
const port = process.env.PORT || 4000
const isDev = process.env.NODE_ENV !== 'production'

// ─── Security headers ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy:     isDev ? false : undefined,
  crossOriginResourcePolicy: isDev ? false : undefined,
  crossOriginOpenerPolicy:   isDev ? false : undefined,
  crossOriginEmbedderPolicy: isDev ? false : undefined,
}))

// ─── CORS ────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',')
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

// ─── Body parsers ────────────────────────────────────────────────
app.use(cookieParser())
app.use(express.json())

// ─── Rate limiting ───────────────────────────────────────────────
app.use('/api/user/login',    rateLimit({ windowMs: 15 * 60 * 1000, max: 20,  message: 'Too many login attempts' }))
app.use('/api/user/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10,  message: 'Too many registrations' }))
app.use('/api/admin/login',   rateLimit({ windowMs: 15 * 60 * 1000, max: 10,  message: 'Too many login attempts' }))
app.use('/api/branch/login',  rateLimit({ windowMs: 15 * 60 * 1000, max: 10,  message: 'Too many login attempts' }))
app.use('/api',               rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' }))

// ─── Routes ──────────────────────────────────────────────────────
app.use('/api/admin',          adminRouter)
app.use('/api/branch',         branchRouter)
app.use('/api/user',           userRouter)
app.use('/api/settings',       settingRoute)
app.use('/api/products',       productRoute)
app.use('/api/inventory',      inventoryRoute)
app.use('/api/sales',          salesRouter)
app.use('/api/audit-logs',     auditRouter)
app.use('/api/extra-services', extraServiceRouter) // ✅ added

app.get('/', (req, res) => res.send('API WORKING'))

// ─── Global error handler — must be last ─────────────────────────
app.use(errorHandler)

// ─── Startup ─────────────────────────────────────────────────────
connectCloudinary()
connectDB()
  .then(() => app.listen(port, () => console.log(`Server started on port ${port}`)))
  .catch((err) => console.log('DB connection failed:', err))