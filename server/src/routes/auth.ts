import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db'
import { signToken, requireAuth, type AuthRequest } from '../auth'

const router = Router()

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  try {
    const hash = await bcrypt.hash(password, 12)
    const r = await db.execute({
      sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      args: [username.trim(), email.trim().toLowerCase(), hash]
    })
    const id = Number(r.lastInsertRowid)
    const token = signToken(id)
    res.cookie('taskbunker_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 })
    res.json({ id, username: username.trim(), email: email.trim().toLowerCase() })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Email or username already taken' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'All fields required' })
  const r = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email.trim().toLowerCase()]
  })
  const user = r.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = signToken(Number(user.id))
  res.cookie('taskbunker_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 })
  res.json({ id: user.id, username: user.username, email: user.email })
})

router.post('/logout', (_req, res) => {
  res.clearCookie('taskbunker_token')
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const r = await db.execute({
    sql: 'SELECT id, username, email FROM users WHERE id = ?',
    args: [req.userId!]
  })
  if (!r.rows[0]) return res.status(404).json({ error: 'User not found' })
  res.json(r.rows[0])
})

export default router
