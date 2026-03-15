import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Card, ChecklistItem, Comment, Assignee, ActivityEntry, Column, Board } from '../types'
import { LABELS, COVER_COLORS } from '../types'
import {
  getChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  getComments, addComment, deleteComment,
  getAssignees, addAssignee, removeAssignee,
  getCardActivity, getBoardMembers, moveCard, copyCard
} from '../api'

type Tab = 'details' | 'comments' | 'activity'

interface Props {
  card: Card
  boardId: number
  columns: Column[]
  boards: Board[]
  currentUserId: number
  canEdit: boolean
  onClose: () => void
  onSave: (data: Partial<Card>) => Promise<void>
  onDelete: () => void
  onArchive: () => void
  onCardMoved: (card: Card) => void
  onCardCopied: (card: Card) => void
}

export default function CardModal({ card, boardId, columns, boards, currentUserId, canEdit, onClose, onSave, onDelete, onArchive, onCardMoved, onCardCopied }: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [editingDesc, setEditingDesc] = useState(false)
  const [dueDate, setDueDate] = useState(card.due_date?.slice(0, 10) || '')
  const [labels, setLabels] = useState<string[]>(card.labels || [])
  const [coverColor, setCoverColor] = useState(card.cover_color || '')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [members, setMembers] = useState<{ user_id: number; username: string; email: string }[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [tab, setTab] = useState<Tab>('details')
  const [saving, setSaving] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [moveColId, setMoveColId] = useState(card.column_id)
  const [copyColId, setCopyColId] = useState(card.column_id)
  const [copyTitle, setCopyTitle] = useState(card.title)

  useEffect(() => {
    getChecklist(boardId, card.id).then((r) => setChecklist(r.data))
    getComments(boardId, card.id).then((r) => setComments(r.data))
    getAssignees(boardId, card.id).then((r) => setAssignees(r.data))
    getBoardMembers(boardId).then((r) => setMembers(r.data))
  }, [card.id])

  useEffect(() => {
    if (tab === 'activity') getCardActivity(boardId, card.id).then((r) => setActivity(r.data))
  }, [tab])

  const save = async () => {
    setSaving(true)
    await onSave({ title, description, due_date: dueDate || null, labels, cover_color: coverColor || null })
    setSaving(false)
  }

  const toggleLabel = (id: string) =>
    setLabels((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id])

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return
    const r = await addChecklistItem(boardId, card.id, newItem.trim())
    setChecklist([...checklist, r.data])
    setNewItem('')
  }

  const toggleItem = async (item: ChecklistItem) => {
    await updateChecklistItem(boardId, card.id, item.id, { checked: !item.checked })
    setChecklist(checklist.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
  }

  const removeItem = async (item: ChecklistItem) => {
    await deleteChecklistItem(boardId, card.id, item.id)
    setChecklist(checklist.filter((i) => i.id !== item.id))
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
              {/* Tabs */}
              <div className="flex gap-1 border-b">
                {(['details', 'comments', 'activity'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-sm capitalize border-b-2 -mb-px transition ${tab === t ? 'border-sky-500 text-sky-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {t}
                    {t === 'comments' && comments.length > 0 && <span className="ml-1 text-xs text-gray-400">({comments.length})</span>}
                  </button>
                ))}
              </div>

              {tab === 'details' && (
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
                        <ReactMarkdown>{description}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Checklist */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500 font-medium">Checklist</p>
                      {checklist.length > 0 && <span className="text-xs text-gray-400">{done}/{checklist.length}</span>}
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
                </div>
              )}

              {tab === 'comments' && (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="group">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-800">{c.username}</span>
                        <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                        {(c.user_id === currentUserId) && (
                          <button onClick={() => deleteCommentHandler(c.id)} className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 ml-auto">Delete</button>
                        )}
                      </div>
                      <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg px-3 py-2 text-gray-700">
                        <ReactMarkdown>{c.text}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
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
                </div>
              )}

              {tab === 'activity' && (
                <div className="space-y-2">
                  {activity.length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
                  {activity.map((a) => (
                    <div key={a.id} className="flex gap-2 text-sm">
                      <span className="font-medium text-gray-700">{a.username}</span>
                      <span className="text-gray-500">{a.action}</span>
                      <span className="text-gray-400 text-xs ml-auto">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-44 shrink-0 space-y-4">
              {/* Labels */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Labels</p>
                <div className="flex flex-wrap gap-1">
                  {LABELS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => canEdit && toggleLabel(l.id)}
                      className={`${l.color} px-2 py-0.5 rounded text-xs font-medium text-white transition ${labels.includes(l.id) ? 'ring-2 ring-offset-1 ring-gray-500' : 'opacity-50 hover:opacity-80'}`}
                    >
                      {l.id}
                    </button>
                  ))}
                </div>
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
