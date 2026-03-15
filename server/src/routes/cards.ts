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
  const r = await pool.query('SELECT * FROM cards WHERE board_id = $1 ORDER BY position, created_at', [boardId])
  res.json(r.rows)
})

router.post('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { column_id, title } = req.body
  if (!title?.trim() || !column_id) return res.status(400).json({ error: 'column_id and title required' })
  const posR = await pool.query('SELECT COUNT(*) FROM cards WHERE column_id = $1', [column_id])
  const position = Number(posR.rows[0].count)
  const r = await pool.query(
    'INSERT INTO cards (board_id, column_id, title, position) VALUES ($1, $2, $3, $4) RETURNING *',
    [boardId, column_id, title.trim(), position]
  )
  res.json(r.rows[0])
})

router.patch('/:cardId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { title, description, due_date, label_color, column_id, position } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (title !== undefined) { fields.push(`title = $${vals.length + 1}`); vals.push(title) }
  if (description !== undefined) { fields.push(`description = $${vals.length + 1}`); vals.push(description) }
  if (due_date !== undefined) { fields.push(`due_date = $${vals.length + 1}`); vals.push(due_date || null) }
  if (label_color !== undefined) { fields.push(`label_color = $${vals.length + 1}`); vals.push(label_color || null) }
  if (column_id !== undefined) { fields.push(`column_id = $${vals.length + 1}`); vals.push(column_id) }
  if (position !== undefined) { fields.push(`position = $${vals.length + 1}`); vals.push(position) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(cardId, boardId)
  const r = await pool.query(
    `UPDATE cards SET ${fields.join(', ')} WHERE id = $${vals.length - 1} AND board_id = $${vals.length} RETURNING *`,
    vals
  )
  res.json(r.rows[0])
})

router.delete('/:cardId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  await pool.query('DELETE FROM cards WHERE id = $1 AND board_id = $2', [cardId, boardId])
  res.json({ ok: true })
})

// Checklist
router.get('/:cardId/checklist', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await pool.query('SELECT * FROM checklist_items WHERE card_id = $1 ORDER BY position, id', [req.params.cardId])
  res.json(r.rows)
})

router.post('/:cardId/checklist', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' })
  const posR = await pool.query('SELECT COUNT(*) FROM checklist_items WHERE card_id = $1', [req.params.cardId])
  const position = Number(posR.rows[0].count)
  const r = await pool.query(
    'INSERT INTO checklist_items (card_id, text, position) VALUES ($1, $2, $3) RETURNING *',
    [req.params.cardId, text.trim(), position]
  )
  res.json(r.rows[0])
})

router.patch('/:cardId/checklist/:itemId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { text, checked } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (text !== undefined) { fields.push(`text = $${vals.length + 1}`); vals.push(text) }
  if (checked !== undefined) { fields.push(`checked = $${vals.length + 1}`); vals.push(checked) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(req.params.itemId)
  const r = await pool.query(
    `UPDATE checklist_items SET ${fields.join(', ')} WHERE id = $${vals.length} RETURNING *`,
    vals
  )
  res.json(r.rows[0])
})

router.delete('/:cardId/checklist/:itemId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  await pool.query('DELETE FROM checklist_items WHERE id = $1', [req.params.itemId])
  res.json({ ok: true })
})

export default router
