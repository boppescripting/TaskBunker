import { Router } from 'express'
import { db } from '../db'
import { requireAuth, type AuthRequest } from '../auth'
import { getRole } from './boards'

const router = Router({ mergeParams: true })
router.use(requireAuth)

const DEFAULT_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400',
  'bg-sky-400', 'bg-violet-400', 'bg-pink-400', 'bg-teal-400',
]

async function ensureLabels(boardId: number) {
  const existing = await db.execute({
    sql: 'SELECT id FROM board_labels WHERE board_id = ? LIMIT 1',
    args: [boardId]
  })
  if (existing.rows.length === 0) {
    for (let i = 0; i < DEFAULT_COLORS.length; i++) {
      await db.execute({
        sql: 'INSERT INTO board_labels (board_id, name, color, position) VALUES (?, ?, ?, ?)',
        args: [boardId, '', DEFAULT_COLORS[i], i]
      })
    }
  }
}

router.get('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  await ensureLabels(boardId)
  const r = await db.execute({
    sql: 'SELECT * FROM board_labels WHERE board_id = ? ORDER BY position, id',
    args: [boardId]
  })
  res.json(r.rows)
})

router.post('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { name, color } = req.body
  if (!color) return res.status(400).json({ error: 'Color required' })
  const posR = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM board_labels WHERE board_id = ?',
    args: [boardId]
  })
  const position = Number(posR.rows[0].cnt)
  const r = await db.execute({
    sql: 'INSERT INTO board_labels (board_id, name, color, position) VALUES (?, ?, ?, ?)',
    args: [boardId, name || '', color, position]
  })
  res.json({ id: Number(r.lastInsertRowid), board_id: boardId, name: name || '', color, position })
})

router.patch('/:labelId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { name, color } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (name !== undefined) { fields.push('name = ?'); vals.push(name) }
  if (color !== undefined) { fields.push('color = ?'); vals.push(color) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(req.params.labelId, boardId)
  await db.execute({
    sql: `UPDATE board_labels SET ${fields.join(', ')} WHERE id = ? AND board_id = ?`,
    args: vals
  })
  const r = await db.execute({
    sql: 'SELECT * FROM board_labels WHERE id = ?',
    args: [req.params.labelId]
  })
  res.json(r.rows[0])
})

router.delete('/:labelId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer' || role === 'member') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({
    sql: 'DELETE FROM board_labels WHERE id = ? AND board_id = ?',
    args: [req.params.labelId, boardId]
  })
  res.json({ ok: true })
})

export default router
