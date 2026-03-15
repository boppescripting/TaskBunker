import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { initDb } from './db'
import authRouter from './routes/auth'
import boardsRouter from './routes/boards'
import columnsRouter from './routes/columns'
import cardsRouter from './routes/cards'

const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin: isProd ? false : 'http://localhost:5173',
  credentials: true
}))

app.use('/api/auth', authRouter)
app.use('/api/boards', boardsRouter)
app.use('/api/boards/:boardId/columns', columnsRouter)
app.use('/api/boards/:boardId/cards', cardsRouter)

// Serve frontend in production
if (isProd) {
  // In Docker: /app/frontend (built Vite output). __dirname = /app/dist
  const frontendPath = path.join(__dirname, '../frontend')
  app.use(express.static(frontendPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'))
  })
}

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on :${PORT}`))
}).catch((err) => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
