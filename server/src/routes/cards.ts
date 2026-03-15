import { Router } from 'express'
import { db, parseChecklist } from '../db'
import { requireAuth, type AuthRequest } from '../auth'
import { getRole } from './boards'

const router = Router({ mergeParams: true })
router.use(requireAuth)

router.get('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await db.execute({
    sql: 'SELECT * FROM cards WHERE board_id = ? ORDER BY position, created_at',
    args: [boardId]
  })
  res.json(r.rows)
})

router.post('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { column_id, title } = req.body
  if (!title?.trim() || !column_id) return res.status(400).json({ error: 'column_id and title required' })
  const posR = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM cards WHERE column_id = ?', args: [column_id] })
  const position = Number(posR.rows[0].cnt)
  const r = await db.execute({
    sql: 'INSERT INTO cards (board_id, column_id, title, position) VALUES (?, ?, ?, ?)',
    args: [boardId, column_id, title.trim(), position]
  })
  const id = Number(r.lastInsertRowid)
  res.json({ id, board_id: boardId, column_id, title: title.trim(), description: '', due_date: null, label_color: null, position })
})

router.patch('/:cardId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { title, description, due_date, label_color, column_id, position } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (title !== undefined) { fields.push('title = ?'); vals.push(title) }
  if (description !== undefined) { fields.push('description = ?'); vals.push(description) }
  if (due_date !== undefined) { fields.push('due_date = ?'); vals.push(due_date || null) }
  if (label_color !== undefined) { fields.push('label_color = ?'); vals.push(label_color || null) }
  if (column_id !== undefined) { fields.push('column_id = ?'); vals.push(column_id) }
  if (position !== undefined) { fields.push('position = ?'); vals.push(position) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(cardId, boardId)
  await db.execute({ sql: `UPDATE cards SET ${fields.join(', ')} WHERE id = ? AND board_id = ?`, args: vals })
  const r = await db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [cardId] })
  res.json(r.rows[0])
})

router.delete('/:cardId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({ sql: 'DELETE FROM checklist_items WHERE card_id = ?', args: [cardId] })
  await db.execute({ sql: 'DELETE FROM cards WHERE id = ? AND board_id = ?', args: [cardId, boardId] })
  res.json({ ok: true })
})

router.get('/:cardId/checklist', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await db.execute({
    sql: 'SELECT * FROM checklist_items WHERE card_id = ? ORDER BY position, id',
    args: [req.params.cardId]
  })
  res.json(r.rows.map(parseChecklist))
})

router.post('/:cardId/checklist', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' })
  const posR = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM checklist_items WHERE card_id = ?', args: [req.params.cardId] })
  const position = Number(posR.rows[0].cnt)
  const r = await db.execute({
    sql: 'INSERT INTO checklist_items (card_id, text, position) VALUES (?, ?, ?)',
    args: [req.params.cardId, text.trim(), position]
  })
  res.json({ id: Number(r.lastInsertRowid), card_id: Number(req.params.cardId), text: text.trim(), checked: false, position })
})

router.patch('/:cardId/checklist/:itemId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { text, checked } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (text !== undefined) { fields.push('text = ?'); vals.push(text) }
  if (checked !== undefined) { fields.push('checked = ?'); vals.push(checked ? 1 : 0) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(req.params.itemId)
  await db.execute({ sql: `UPDATE checklist_items SET ${fields.join(', ')} WHERE id = ?`, args: vals })
  const r = await db.execute({ sql: 'SELECT * FROM checklist_items WHERE id = ?', args: [req.params.itemId] })
  res.json(parseChecklist(r.rows[0] as any))
})

router.delete('/:cardId/checklist/:itemId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({ sql: 'DELETE FROM checklist_items WHERE id = ?', args: [req.params.itemId] })
  res.json({ ok: true })
})

export default router
