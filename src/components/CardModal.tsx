import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const mdPlugins = [remarkGfm]

const mdComponents = {
  a: ({ children, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline hover:text-sky-800 break-all">
      {children}
    </a>
  ),
}
import { useStore } from '../store'
import type { Card, ChecklistItem, Comment, Assignee, ActivityEntry, Column, Board, BoardLabel } from '../types'
import { LABEL_COLORS, COVER_COLORS } from '../types'
import {
  getChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  getComments, addComment, deleteComment,
  getAssignees, addAssignee, removeAssignee,
  getCardActivity, getBoardMembers, moveCard, copyCard,
  updateBoardLabel, createBoardLabel, deleteBoardLabel,
} from '../api'


interface Props {
  card: Card
  boardId: number
  columns: Column[]
  boards: Board[]
  boardLabels: BoardLabel[]
  currentUserId: number
  canEdit: boolean
  onClose: () => void
  onSave: (data: Partial<Card>) => Promise<void>
  onDelete: () => void
  onArchive: () => void
  onCardMoved: (card: Card) => void
  onCardCopied: (card: Card) => void
  onLabelsChanged: (labels: BoardLabel[]) => void
}

export default function CardModal({ card, boardId, columns, boards, boardLabels: initialBoardLabels, currentUserId, canEdit, onClose, onSave, onDelete, onArchive, onCardMoved, onCardCopied, onLabelsChanged }: Props) {
  const updateCard = useStore((s) => s.updateCard)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [editingDesc, setEditingDesc] = useState(false)
  const [dueDate, setDueDate] = useState(card.due_date?.slice(0, 10) || '')
  const [labels, setLabels] = useState<string[]>(card.labels || [])
  const [coverColor, setCoverColor] = useState(card.cover_color || '')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [showChecklist, setShowChecklist] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [members, setMembers] = useState<{ user_id: number; username: string; email: string }[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [boardLabels, setBoardLabels] = useState<BoardLabel[]>(initialBoardLabels)
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null)
  const [editingLabelName, setEditingLabelName] = useState('')
  const [editingLabelColor, setEditingLabelColor] = useState('')
const [saving, setSaving] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [moveColId, setMoveColId] = useState(card.column_id)
  const [copyColId, setCopyColId] = useState(card.column_id)
  const [copyTitle, setCopyTitle] = useState(card.title)

  useEffect(() => {
    getChecklist(boardId, card.id).then((r) => { setChecklist(r.data); if (r.data.length > 0) setShowChecklist(true) })
    getComments(boardId, card.id).then((r) => setComments(r.data))
    getAssignees(boardId, card.id).then((r) => setAssignees(r.data))
    getBoardMembers(boardId).then((r) => setMembers(r.data))
    getCardActivity(boardId, card.id).then((r) => setActivity(r.data))
  }, [card.id])

  const save = async () => {
    setSaving(true)
    await onSave({ title, description, due_date: dueDate || null, labels, cover_color: coverColor || null })
    setSaving(false)
  }

  const toggleLabel = (id: number) => {
    const sid = String(id)
    setLabels((prev) => prev.includes(sid) ? prev.filter((l) => l !== sid) : [...prev, sid])
  }

  const startEditLabel = (l: BoardLabel) => {
    setEditingLabelId(l.id)
    setEditingLabelName(l.name)
    setEditingLabelColor(l.color)
  }

  const saveLabel = async () => {
    if (!editingLabelId) return
    const r = await updateBoardLabel(boardId, editingLabelId, { name: editingLabelName, color: editingLabelColor })
    const updated = boardLabels.map((l) => l.id === editingLabelId ? r.data : l)
    setBoardLabels(updated)
    onLabelsChanged(updated)
    setEditingLabelId(null)
  }

  const addLabel = async () => {
    const color = LABEL_COLORS[boardLabels.length % LABEL_COLORS.length]
    const r = await createBoardLabel(boardId, color)
    const updated = [...boardLabels, r.data]
    setBoardLabels(updated)
    onLabelsChanged(updated)
    startEditLabel(r.data)
  }

  const removeLabel = async (labelId: number) => {
    await deleteBoardLabel(boardId, labelId)
    const updated = boardLabels.filter((l) => l.id !== labelId)
    setBoardLabels(updated)
    onLabelsChanged(updated)
    setLabels((prev) => prev.filter((id) => id !== String(labelId)))
    setEditingLabelId(null)
  }

  const syncChecklistCounts = (updated: ChecklistItem[]) => {
    updateCard({ ...card, checklist_total: updated.length, checklist_done: updated.filter((i) => i.checked).length })
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    const r = await addChecklistItem(boardId, card.id, newItem.trim())
    const updated = [...checklist, r.data]
    setChecklist(updated)
    syncChecklistCounts(updated)
    setNewItem('')
  }

  const toggleItem = async (item: ChecklistItem) => {
    await updateChecklistItem(boardId, card.id, item.id, { checked: !item.checked })
    const updated = checklist.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i))
    setChecklist(updated)
    syncChecklistCounts(updated)
  }

  const removeItem = async (item: ChecklistItem) => {
    await deleteChecklistItem(boardId, card.id, item.id)
    const updated = checklist.filter((i) => i.id !== item.id)
    setChecklist(updated)
    syncChecklistCounts(updated)
  }

  const removeChecklist = async () => {
    await Promise.all(checklist.map((i) => deleteChecklistItem(boardId, card.id, i.id)))
    setChecklist([])
    syncChecklistCounts([])
    setShowChecklist(false)
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const r = await addComment(boardId, card.id, newComment.trim())
    setComments([...comments, r.data])
    setNewComment('')
  }

  const deleteCommentHandler = async (commentId: number) => {
    await deleteComment(boardId, card.id, commentId)
    setComments(comments.filter((c) => c.id !== commentId))
  }

  const toggleAssignee = async (userId: number) => {
    const assigned = assignees.some((a) => a.user_id === userId)
    if (assigned) {
      await removeAssignee(boardId, card.id, userId)
      setAssignees(assignees.filter((a) => a.user_id !== userId))
    } else {
      await addAssignee(boardId, card.id, userId)
      const member = members.find((m) => m.user_id === userId)
      if (member) setAssignees([...assignees, member])
    }
  }

  const handleMove = async () => {
    const r = await moveCard(boardId, card.id, moveColId)
    onCardMoved(r.data)
    setShowMove(false)
  }

  const handleCopy = async () => {
    const r = await copyCard(boardId, card.id, copyColId, copyTitle)
    onCardCopied(r.data)
    setShowCopy(false)
  }

  const done = checklist.filter((i) => i.checked).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-10 z-50 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mb-10" onClick={(e) => e.stopPropagation()}>
        {/* Cover */}
        {coverColor && <div className={`${coverColor} h-16 rounded-t-xl`} />}

        <div className="p-6 space-y-4">
          {/* Title */}
          <div className="flex items-start gap-2">
            <input
              className="text-xl font-bold text-gray-800 flex-1 focus:outline-none border-b-2 border-transparent focus:border-sky-300"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
            />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-1">✕</button>
          </div>

          <div className="flex gap-6">
            {/* Main content */}
            <div className="flex-1 space-y-5 min-w-0">
              <div className="space-y-5">
                  {/* Description */}
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                    {editingDesc || !description ? (
                      <textarea
                        autoFocus={editingDesc}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300 resize-none font-mono"
                        rows={4}
                        placeholder="Add a description… (Markdown supported)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => setEditingDesc(false)}
                        disabled={!canEdit}
                      />
                    ) : (
                      <div
                        className="prose prose-sm max-w-none text-gray-700 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                        onClick={() => canEdit && setEditingDesc(true)}
                      >
                        <ReactMarkdown remarkPlugins={mdPlugins} components={mdComponents}>{description}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Checklist */}
                  {showChecklist ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-500 font-medium">Checklist</p>
                        <div className="flex items-center gap-2">
                          {checklist.length > 0 && <span className="text-xs text-gray-400">{done}/{checklist.length}</span>}
                          {canEdit && (
                            <button onClick={removeChecklist} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
                          )}
                        </div>
                      </div>
                      {checklist.length > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${(done / checklist.length) * 100}%` }} />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 group">
                            <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item)} disabled={!canEdit} className="rounded" />
                            <span className={`text-sm flex-1 ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</span>
                            {canEdit && (
                              <button onClick={() => removeItem(item)} className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100">✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                      {canEdit && (
                        <form onSubmit={addItem} className="flex gap-2 mt-2">
                          <input
                            className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                            placeholder="Add item…"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                          />
                          <button className="bg-sky-600 text-white text-xs rounded px-2 py-1 hover:bg-sky-700">Add</button>
                        </form>
                      )}
                    </div>
                  ) : canEdit && (
                    <button
                      onClick={() => setShowChecklist(true)}
                      className="text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition flex items-center gap-1.5 w-full"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Add checklist
                    </button>
                  )}
                {/* Comments & Activity */}
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs text-gray-500 font-medium">
                    Comments & Activity
                    {comments.length > 0 && <span className="ml-1 text-gray-400">({comments.length})</span>}
                  </p>

                  {canEdit && (
                    <form onSubmit={submitComment} className="space-y-1">
                      <textarea
                        className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300 resize-none"
                        rows={2} placeholder="Write a comment… (Markdown supported)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button className="bg-sky-600 text-white text-xs rounded px-3 py-1 hover:bg-sky-700">Post</button>
                    </form>
                  )}

                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={`comment-${c.id}`} className="group">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-800">{c.username}</span>
                          <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                          {c.user_id === currentUserId && (
                            <button onClick={() => deleteCommentHandler(c.id)} className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 ml-auto">Delete</button>
                          )}
                        </div>
                        <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg px-3 py-2 text-gray-700">
                          <ReactMarkdown remarkPlugins={mdPlugins} components={mdComponents}>{c.text}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                    {activity.map((a) => (
                      <div key={`activity-${a.id}`} className="flex gap-2 text-xs text-gray-500">
                        <span className="font-medium text-gray-600">{a.username}</span>
                        <span>{a.action}</span>
                        <span className="text-gray-400 ml-auto shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                    {comments.length === 0 && activity.length === 0 && (
                      <p className="text-xs text-gray-400">No activity yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-44 shrink-0 space-y-4">
              {/* Labels */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Labels</p>
                <div className="space-y-1">
                  {boardLabels.map((l) => (
                    <div key={l.id} className="flex items-center gap-1">
                      <button
                        onClick={() => toggleLabel(l.id)}
                        className={`${l.color} flex-1 text-left px-2 py-1 rounded text-xs font-medium text-white transition truncate ${labels.includes(String(l.id)) ? 'ring-2 ring-offset-1 ring-gray-500' : 'opacity-60 hover:opacity-90'}`}
                      >
                        {l.name || <span className="italic opacity-70">unnamed</span>}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => startEditLabel(l)}
                          className="text-gray-400 hover:text-gray-600 text-xs px-1 shrink-0"
                        >✎</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Inline label editor */}
                {editingLabelId !== null && (
                  <div className="mt-2 p-2 bg-gray-50 rounded border space-y-2">
                    <input
                      autoFocus
                      className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-300"
                      placeholder="Label name…"
                      value={editingLabelName}
                      onChange={(e) => setEditingLabelName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveLabel() }}
                    />
                    <div className="flex flex-wrap gap-1">
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditingLabelColor(c)}
                          className={`${c} w-5 h-5 rounded ${editingLabelColor === c ? 'ring-2 ring-offset-1 ring-gray-600' : ''}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={saveLabel} className="bg-sky-600 text-white text-xs rounded px-2 py-1 hover:bg-sky-700">Save</button>
                      <button onClick={() => setEditingLabelId(null)} className="text-gray-500 text-xs px-2 py-1 hover:text-gray-700">Cancel</button>
                      <button onClick={() => removeLabel(editingLabelId)} className="text-red-400 text-xs px-2 py-1 hover:text-red-600 ml-auto">Delete</button>
                    </div>
                  </div>
                )}

                {canEdit && editingLabelId === null && (
                  <button onClick={addLabel} className="mt-1 text-xs text-gray-400 hover:text-gray-600 w-full text-left">
                    + Add label
                  </button>
                )}
              </div>

              {/* Due date */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Due Date</p>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sky-300"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canEdit}
                />
                {dueDate && canEdit && (
                  <button onClick={() => setDueDate('')} className="text-xs text-gray-400 hover:text-gray-600 mt-0.5">Clear</button>
                )}
              </div>

              {/* Cover */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Cover</p>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => canEdit && setCoverColor('')} className={`w-5 h-5 rounded bg-gray-200 ${!coverColor ? 'ring-2 ring-gray-500' : ''}`} />
                  {COVER_COLORS.map((c) => (
                    <button key={c} onClick={() => canEdit && setCoverColor(c)} className={`${c} w-5 h-5 rounded ${coverColor === c ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`} />
                  ))}
                </div>
              </div>

              {/* Assignees */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Assignees</p>
                <div className="space-y-1">
                  {members.map((m) => {
                    const assigned = assignees.some((a) => a.user_id === m.user_id)
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => canEdit && toggleAssignee(m.user_id)}
                        className={`flex items-center gap-1.5 w-full text-left text-xs rounded px-1.5 py-1 transition ${assigned ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0 ${assigned ? 'bg-sky-500' : 'bg-gray-300'}`}>
                          {m.username[0].toUpperCase()}
                        </span>
                        <span className="truncate">{m.username}</span>
                        {assigned && <span className="ml-auto">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Move */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Actions</p>
                <div className="space-y-1">
                  {canEdit && (
                    <button onClick={() => setShowMove((v) => !v)} className="w-full text-left text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-1.5 text-gray-700">
                      Move card
                    </button>
                  )}
                  <button onClick={() => setShowCopy((v) => !v)} className="w-full text-left text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-1.5 text-gray-700">
                    Copy card
                  </button>
                  {canEdit && (
                    <button onClick={onArchive} className="w-full text-left text-xs bg-gray-100 hover:bg-yellow-50 hover:text-yellow-700 rounded px-2 py-1.5 text-gray-700">
                      Archive
                    </button>
                  )}
                </div>
              </div>

              {showMove && (
                <div className="space-y-1 bg-gray-50 rounded p-2">
                  <p className="text-xs font-medium text-gray-600">Move to column</p>
                  <select className="w-full text-xs border rounded px-1 py-1" value={moveColId} onChange={(e) => setMoveColId(Number(e.target.value))}>
                    {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button onClick={handleMove} className="w-full bg-sky-600 text-white text-xs rounded px-2 py-1">Move</button>
                </div>
              )}

              {showCopy && (
                <div className="space-y-1 bg-gray-50 rounded p-2">
                  <p className="text-xs font-medium text-gray-600">Copy to</p>
                  <input className="w-full text-xs border rounded px-1 py-1" value={copyTitle} onChange={(e) => setCopyTitle(e.target.value)} placeholder="Title" />
                  <select className="w-full text-xs border rounded px-1 py-1" value={copyColId} onChange={(e) => setCopyColId(Number(e.target.value))}>
                    {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button onClick={handleCopy} className="w-full bg-sky-600 text-white text-xs rounded px-2 py-1">Copy</button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {canEdit && (
            <div className="flex items-center justify-between pt-3 border-t">
              <button onClick={onDelete} className="text-red-500 text-sm hover:text-red-700">Delete card</button>
              <button onClick={save} disabled={saving} className="bg-sky-600 text-white text-sm rounded-lg px-5 py-1.5 hover:bg-sky-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
