import { Router } from 'express'
import { pool } from '../db'
import { requireAuth, type AuthRequest } from '../auth'
import { getRole } from './boards'

const router = Router({ mergeParams: true })
router.use(requireAuth)

router.get('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await pool.query('SELECT * FROM columns WHERE board_id = $1 ORDER BY created_at', [boardId])
  res.json(r.rows)
})

router.post('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { title } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
  const r = await pool.query(
    'INSERT INTO columns (board_id, title) VALUES ($1, $2) RETURNING *',
    [boardId, title.trim()]
  )
  res.json(r.rows[0])
})

router.patch('/:colId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const colId = Number(req.params.colId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { title, card_ids } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (title !== undefined) { fields.push(`title = $${vals.length + 1}`); vals.push(title) }
  if (card_ids !== undefined) { fields.push(`card_ids = $${vals.length + 1}`); vals.push(card_ids) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(colId, boardId)
  const r = await pool.query(
    `UPDATE columns SET ${fields.join(', ')} WHERE id = $${vals.length - 1} AND board_id = $${vals.length} RETURNING *`,
    vals
  )
  res.json(r.rows[0])
})

router.delete('/:colId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const colId = Number(req.params.colId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer' || role === 'member') return res.status(403).json({ error: 'Forbidden' })
  await pool.query('DELETE FROM columns WHERE id = $1 AND board_id = $2', [colId, boardId])
  res.json({ ok: true })
})

export default router
