import { Router } from 'express'
import { pool } from '../db'
import { requireAuth, type AuthRequest } from '../auth'

const router = Router()
router.use(requireAuth)

// Get user's boards
router.get('/', async (req: AuthRequest, res) => {
  const r = await pool.query(`
    SELECT b.*, bm.role
    FROM boards b
    JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = $1
    ORDER BY b.created_at DESC
  `, [req.userId])
  res.json(r.rows)
})

// Create board
router.post('/', async (req: AuthRequest, res) => {
  const { title, color } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const br = await client.query(
      'INSERT INTO boards (title, color, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [title.trim(), color || 'bg-sky-600', req.userId]
    )
    const board = br.rows[0]
    await client.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
      [board.id, req.userId, 'owner']
    )
    await client.query('COMMIT')
    res.json({ ...board, role: 'owner' })
  } catch {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

// Update board
router.patch('/:id', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer' || role === 'member') return res.status(403).json({ error: 'Forbidden' })
  const { title, color, column_ids } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (title !== undefined) { fields.push(`title = $${vals.length + 1}`); vals.push(title) }
  if (color !== undefined) { fields.push(`color = $${vals.length + 1}`); vals.push(color) }
  if (column_ids !== undefined) { fields.push(`column_ids = $${vals.length + 1}`); vals.push(column_ids) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(boardId)
  const r = await pool.query(`UPDATE boards SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals)
  res.json(r.rows[0])
})

// Delete board
router.delete('/:id', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (role !== 'owner') return res.status(403).json({ error: 'Only owner can delete board' })
  await pool.query('DELETE FROM boards WHERE id = $1', [boardId])
  res.json({ ok: true })
})

// Get members
router.get('/:id/members', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await pool.query(`
    SELECT bm.user_id, u.username, u.email, bm.role
    FROM board_members bm JOIN users u ON u.id = bm.user_id
    WHERE bm.board_id = $1
    ORDER BY bm.role DESC, u.username
  `, [boardId])
  res.json(r.rows)
})

// Add member
router.post('/:id/members', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  const { email, role: newRole } = req.body
  const ur = await pool.query('SELECT id FROM users WHERE email = $1', [email?.trim().toLowerCase()])
  if (!ur.rows[0]) return res.status(404).json({ error: 'User not found' })
  const userId = ur.rows[0].id
  await pool.query(
    'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (board_id, user_id) DO UPDATE SET role = $3',
    [boardId, userId, newRole || 'member']
  )
  res.json({ ok: true })
})

// Remove member
router.delete('/:id/members/:userId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  await pool.query('DELETE FROM board_members WHERE board_id = $1 AND user_id = $2', [boardId, req.params.userId])
  res.json({ ok: true })
})

async function getRole(userId: number, boardId: number) {
  const r = await pool.query('SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2', [boardId, userId])
  return r.rows[0]?.role as string | undefined
}

export { getRole }
export default router
