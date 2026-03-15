import { Router } from 'express'
import { db, parseColumn } from '../db'
import { requireAuth, type AuthRequest } from '../auth'
import { getRole } from './boards'

const router = Router({ mergeParams: true })
router.use(requireAuth)

router.get('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role) return res.status(403).json({ error: 'Forbidden' })
  const r = await db.execute({
    sql: 'SELECT * FROM columns WHERE board_id = ? ORDER BY created_at',
    args: [boardId]
  })
  res.json(r.rows.map(parseColumn))
})

router.post('/', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { title } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
  const r = await db.execute({
    sql: 'INSERT INTO columns (board_id, title) VALUES (?, ?)',
    args: [boardId, title.trim()]
  })
  const id = Number(r.lastInsertRowid)
  res.json({ id, board_id: boardId, title: title.trim(), card_ids: [] })
})

router.patch('/:colId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const colId = Number(req.params.colId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer') return res.status(403).json({ error: 'Forbidden' })
  const { title, card_ids } = req.body
  const fields: string[] = []
  const vals: any[] = []
  if (title !== undefined) { fields.push('title = ?'); vals.push(title) }
  if (card_ids !== undefined) { fields.push('card_ids = ?'); vals.push(JSON.stringify(card_ids)) }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(colId, boardId)
  await db.execute({ sql: `UPDATE columns SET ${fields.join(', ')} WHERE id = ? AND board_id = ?`, args: vals })
  const r = await db.execute({ sql: 'SELECT * FROM columns WHERE id = ?', args: [colId] })
  res.json(parseColumn(r.rows[0] as any))
})

router.delete('/:colId', async (req: AuthRequest, res) => {
  const boardId = Number(req.params.boardId)
  const colId = Number(req.params.colId)
  const role = await getRole(req.userId!, boardId)
  if (!role || role === 'viewer' || role === 'member') return res.status(403).json({ error: 'Forbidden' })
  await db.execute({ sql: 'DELETE FROM checklist_items WHERE card_id IN (SELECT id FROM cards WHERE column_id = ?)', args: [colId] })
  await db.execute({ sql: 'DELETE FROM cards WHERE column_id = ? AND board_id = ?', args: [colId, boardId] })
  await db.execute({ sql: 'DELETE FROM columns WHERE id = ? AND board_id = ?', args: [colId, boardId] })
  res.json({ ok: true })
})

export default router
