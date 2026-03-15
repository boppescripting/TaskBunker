import { Router } from 'express'
import { db, parseCard, parseChecklist, logActivity } from '../db'
import { requireAuth, type AuthRequest } from '../auth'
import { getRole } from './boards'

const router = Router({ mergeParams: true })
router.use(requireAuth)

router.get('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const showArchived = req.query.archived === 'true'
  const r = await db.execute({
    sql: `SELECT c.*,
            COUNT(ci.id) AS checklist_total,
            SUM(CASE WHEN ci.checked = 1 THEN 1 ELSE 0 END) AS checklist_done
          FROM cards c
          LEFT JOIN checklist_items ci ON ci.card_id = c.id
          WHERE c.board_id = ? AND c.archived = ?
          GROUP BY c.id
          ORDER BY c.position, c.created_at`,
    args: [boardId, showArchived ? 1 : 0]
  })
  res.json(r.rows.map(parseCard))
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
  await logActivity(boardId, req.userId!, `Created card "${title.trim()}"`, id)
  res.json({ id, board_id: boardId, column_id, title: title.trim(), description: '', due_date: null, labels: [], cover_color: null, archived: false, position })
})

router.patch('/:cardId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { title, description, due_date, labels, cover_color, column_id, position, archived, completed } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (title !== undefined) { fields.push('title = ?'); vals.push(title) }
  if (description !== undefined) { fields.push('description = ?'); vals.push(description) }
  if (due_date !== undefined) { fields.push('due_date = ?'); vals.push(due_date || null) }
  if (labels !== undefined) { fields.push('labels = ?'); vals.push(JSON.stringify(labels)) }
  if (cover_color !== undefined) { fields.push('cover_color = ?'); vals.push(cover_color || null) }
  if (column_id !== undefined) { fields.push('column_id = ?'); vals.push(column_id) }
  if (position !== undefined) { fields.push('position = ?'); vals.push(position) }
  if (archived !== undefined) { fields.push('archived = ?'); vals.push(archived ? 1 : 0) }
  if (completed !== undefined) { fields.push('completed = ?'); vals.push(completed ? 1 : 0) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(cardId, boardId)
  await db.execute({ sql: `UPDATE cards SET ${fields.join(', ')} WHERE id = ? AND board_id = ?`, args: vals })
  if (archived) await logActivity(boardId, req.userId!, `Archived a card`, cardId)
  const r = await db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [cardId] })
  res.json(parseCard(r.rows[0] as any))
})

router.delete('/:cardId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({ sql: 'DELETE FROM checklist_items WHERE card_id = ?', args: [cardId] })
  await db.execute({ sql: 'DELETE FROM card_comments WHERE card_id = ?', args: [cardId] })
  await db.execute({ sql: 'DELETE FROM card_assignees WHERE card_id = ?', args: [cardId] })
  await db.execute({ sql: 'DELETE FROM cards WHERE id = ? AND board_id = ?', args: [cardId, boardId] })
  res.json({ ok: true })
})

// Move card to different column/board
router.post('/:cardId/move', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { target_column_id, target_board_id } = req.body
  const destBoardId = target_board_id || boardId
  if (destBoardId !== boardId) {
    const destRole = await getRole(req.userId!, destBoardId)
    if (!destRole || destRole === 'viewer') return res.status(403).json({ error: 'No access to target board' })
  }
  const posR = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM cards WHERE column_id = ?', args: [target_column_id] })
  const position = Number(posR.rows[0].cnt)
  await db.execute({
    sql: 'UPDATE cards SET column_id = ?, board_id = ?, position = ? WHERE id = ?',
    args: [target_column_id, destBoardId, position, cardId]
  })
  await logActivity(boardId, req.userId!, `Moved a card`, cardId)
  const r = await db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [cardId] })
  res.json(parseCard(r.rows[0] as any))
})

// Copy card
router.post('/:cardId/copy', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const cardId = Number(req.params.cardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { target_column_id, title } = req.body
  const src = await db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [cardId] })
  if (!src.rows[0]) return res.status(404).json({ error: 'Card not found' })
  const card = src.rows[0] as any
  const posR = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM cards WHERE column_id = ?', args: [target_column_id || card.column_id] })
  const position = Number(posR.rows[0].cnt)
  const r = await db.execute({
    sql: 'INSERT INTO cards (board_id, column_id, title, description, due_date, labels, cover_color, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [boardId, target_column_id || card.column_id, title || card.title, card.description, card.due_date, card.labels, card.cover_color, position]
  })
  const newId = Number(r.lastInsertRowid)
  // Copy checklist items
  const items = await db.execute({ sql: 'SELECT * FROM checklist_items WHERE card_id = ?', args: [cardId] })
  for (const item of items.rows as any[]) {
    await db.execute({
      sql: 'INSERT INTO checklist_items (card_id, text, checked, position) VALUES (?, ?, 0, ?)',
      args: [newId, item.text, item.position]
    })
  }
  await logActivity(boardId, req.userId!, `Copied a card`, newId)
  const newCard = await db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [newId] })
  res.json(parseCard(newCard.rows[0] as any))
})

// Checklist
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

// Comments
router.get('/:cardId/comments', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await db.execute({
    sql: `SELECT cc.*, u.username FROM card_comments cc JOIN users u ON u.id = cc.user_id
          WHERE cc.card_id = ? ORDER BY cc.created_at ASC`,
    args: [req.params.cardId]
  })
  res.json(r.rows)
})

router.post('/:cardId/comments', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' })
  const r = await db.execute({
    sql: 'INSERT INTO card_comments (card_id, user_id, text) VALUES (?, ?, ?)',
    args: [req.params.cardId, req.userId!, text.trim()]
  })
  const userR = await db.execute({ sql: 'SELECT username FROM users WHERE id = ?', args: [req.userId!] })
  res.json({ id: Number(r.lastInsertRowid), card_id: Number(req.params.cardId), user_id: req.userId, text: text.trim(), username: userR.rows[0].username, created_at: new Date().toISOString() })
})

router.delete('/:cardId/comments/:commentId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const comment = await db.execute({ sql: 'SELECT user_id FROM card_comments WHERE id = ?', args: [req.params.commentId] })
  if (!comment.rows[0]) return res.status(404).json({ error: 'Not found' })
  if (Number(comment.rows[0].user_id) !== req.userId && role !== 'owner' && role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  await db.execute({ sql: 'DELETE FROM card_comments WHERE id = ?', args: [req.params.commentId] })
  res.json({ ok: true })
})

// Assignees
router.get('/:cardId/assignees', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await db.execute({
    sql: `SELECT ca.user_id, u.username, u.email FROM card_assignees ca JOIN users u ON u.id = ca.user_id WHERE ca.card_id = ?`,
    args: [req.params.cardId]
  })
  res.json(r.rows)
})

router.post('/:cardId/assignees/:userId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({
    sql: 'INSERT INTO card_assignees (card_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
    args: [req.params.cardId, req.params.userId]
  })
  res.json({ ok: true })
})

router.delete('/:cardId/assignees/:userId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({
    sql: 'DELETE FROM card_assignees WHERE card_id = ? AND user_id = ?',
    args: [req.params.cardId, req.params.userId]
  })
  res.json({ ok: true })
})

// Activity
router.get('/:cardId/activity', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await db.execute({
    sql: `SELECT al.*, u.username FROM activity_log al JOIN users u ON u.id = al.user_id
          WHERE al.card_id = ? ORDER BY al.created_at DESC LIMIT 50`,
    args: [req.params.cardId]
  })
  res.json(r.rows)
})

export default router
