import { Router } from 'express'
import { db, parseBoard } from '../db'
import { requireAuth, type AuthRequest } from '../auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (req: AuthRequest, res) => {
  const r = await db.execute({
    sql: `SELECT b.*, bm.role FROM boards b
          JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
          ORDER BY b.created_at DESC`,
    args: [req.userId!]
  })
  res.json(r.rows.map(parseBoard))
})

router.post('/', async (req: AuthRequest, res) => {
  const { title, color } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
  const tx = await db.transaction('write')
  try {
    const br = await tx.execute({
      sql: 'INSERT INTO boards (title, color, owner_id) VALUES (?, ?, ?)',
      args: [title.trim(), color || 'bg-sky-600', req.userId!]
    })
    const boardId = Number(br.lastInsertRowid)
    await tx.execute({
      sql: 'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?)',
      args: [boardId, req.userId!, 'owner']
    })
    await tx.commit()
    res.json({ id: boardId, title: title.trim(), color: color || 'bg-sky-600', owner_id: req.userId, column_ids: [], role: 'owner' })
  } catch {
    await tx.rollback()
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer' || role === 'member') return res.status(403).json({ error: 'Forbidden' })
  const { title, color, column_ids } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (title !== undefined) { fields.push('title = ?'); vals.push(title) }
  if (color !== undefined) { fields.push('color = ?'); vals.push(color) }
  if (column_ids !== undefined) { fields.push('column_ids = ?'); vals.push(JSON.stringify(column_ids)) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(boardId)
  await db.execute({ sql: `UPDATE boards SET ${fields.join(', ')} WHERE id = ?`, args: vals })
  const r = await db.execute({ sql: 'SELECT * FROM boards WHERE id = ?', args: [boardId] })
  res.json(parseBoard(r.rows[0] as any))
})

router.delete('/:id', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (role !== 'owner') return res.status(403).json({ error: 'Only owner can delete board' })
  await db.execute({ sql: 'DELETE FROM checklist_items WHERE card_id IN (SELECT id FROM cards WHERE board_id = ?)', args: [boardId] })
  await db.execute({ sql: 'DELETE FROM cards WHERE board_id = ?', args: [boardId] })
  await db.execute({ sql: 'DELETE FROM columns WHERE board_id = ?', args: [boardId] })
  await db.execute({ sql: 'DELETE FROM board_members WHERE board_id = ?', args: [boardId] })
  await db.execute({ sql: 'DELETE FROM boards WHERE id = ?', args: [boardId] })
  res.json({ ok: true })
})

router.get('/:id/members', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await db.execute({
    sql: `SELECT bm.user_id, u.username, u.email, bm.role
          FROM board_members bm JOIN users u ON u.id = bm.user_id
          WHERE bm.board_id = ? ORDER BY u.username`,
    args: [boardId]
  })
  res.json(r.rows)
})

router.post('/:id/members', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  const { email, role: newRole } = req.body
  const ur = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email?.trim().toLowerCase()]
  })
  if (!ur.rows[0]) return res.status(404).json({ error: 'User not found' })
  const userId = ur.rows[0].id
  await db.execute({
    sql: 'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT (board_id, user_id) DO UPDATE SET role = excluded.role',
    args: [boardId, userId, newRole || 'member']
  })
  res.json({ ok: true })
})

router.delete('/:id/members/:userId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.id)
  const role = await getRole(req.userId!, boardId)
  if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({
    sql: 'DELETE FROM board_members WHERE board_id = ? AND user_id = ?',
    args: [boardId, req.params.userId]
  })
  res.json({ ok: true })
})

export async function getRole(userId: number, boardId: number) {
  const r = await db.execute({
    sql: 'SELECT role FROM board_members WHERE board_id = ? AND user_id = ?',
    args: [boardId, userId]
  })
  return r.rows[0]?.role as string | undefined
}

export default router
