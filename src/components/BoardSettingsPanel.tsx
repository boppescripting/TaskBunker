import { useState, useEffect } from 'react'
import type { Board, BoardLabel, ActivityEntry } from '../types'
import { BOARD_COLORS, LABEL_COLORS } from '../types'
import {
  updateBoard, deleteBoard,
  getBoardMembers, addBoardMember, removeBoardMember,
  getBoardLabels, createBoardLabel, updateBoardLabel, deleteBoardLabel,
  getBoardActivity,
} from '../api'
import { useNavigate } from 'react-router-dom'

type Tab = 'general' | 'members' | 'labels' | 'activity'

interface Member { user_id: number; username: string; email: string; role: string }

interface Props {
  board: Board
  boardLabels: BoardLabel[]
  onClose: () => void
  onBoardUpdated: (b: Board) => void
  onLabelsChanged: (l: BoardLabel[]) => void
}

export default function BoardSettingsPanel({ board, boardLabels: initialLabels, onClose, onBoardUpdated, onLabelsChanged }: Props) {
  const [tab, setTab] = useState<Tab>('general')
  const nav = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative w-96 bg-white h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="font-bold text-gray-800">Board Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b shrink-0">
          {(['general', 'members', 'labels', 'activity'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition ${tab === t ? 'border-sky-500 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'general' && (
            <GeneralTab board={board} onBoardUpdated={onBoardUpdated} nav={nav} />
          )}
          {tab === 'members' && (
            <MembersTab boardId={board.id} role={board.role} />
          )}
          {tab === 'labels' && (
            <LabelsTab boardId={board.id} initialLabels={initialLabels} onLabelsChanged={onLabelsChanged} />
          )}
          {tab === 'activity' && (
            <ActivityTab boardId={board.id} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── General ───────────────────────────────────────────────────────────────────

function GeneralTab({ board, onBoardUpdated, nav }: { board: Board; onBoardUpdated: (b: Board) => void; nav: ReturnType<typeof useNavigate> }) {
  const [title, setTitle] = useState(board.title)
  const [color, setColor] = useState(board.color)
  const [visibility, setVisibility] = useState<'private' | 'public'>(board.visibility ?? 'private')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const save = async () => {
    setSaving(true)
    const r = await updateBoard(board.id, { title, color, visibility })
    onBoardUpdated({ ...board, ...r.data })
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Permanently delete "${board.title}" and all its data?`)) return
    setDeleting(true)
    await deleteBoard(board.id)
    nav('/')
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Board Title</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Color */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {BOARD_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`${c} w-8 h-8 rounded-lg transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-700' : 'hover:scale-110'}`}
            />
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Visibility</label>
        <div className="space-y-2">
          {(['private', 'public'] as const).map((v) => (
            <label key={v} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${visibility === v ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input
                type="radio"
                checked={visibility === v}
                onChange={() => setVisibility(v)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-800 capitalize">{v}</p>
                <p className="text-xs text-gray-500">
                  {v === 'private' ? 'Only board members can see this board.' : 'Anyone with the link can view this board.'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-sky-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      {/* Danger zone */}
      {board.role === 'owner' && (
        <div className="border border-red-200 rounded-lg p-4 mt-6">
          <p className="text-xs font-semibold text-red-600 mb-1">Danger Zone</p>
          <p className="text-xs text-gray-500 mb-3">This will permanently delete the board and all its columns, cards, and activity.</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full bg-red-50 text-red-600 border border-red-300 rounded-lg py-1.5 text-sm font-medium hover:bg-red-600 hover:text-white transition disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Board'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Members ───────────────────────────────────────────────────────────────────

function MembersTab({ boardId, role }: { boardId: number; role: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [error, setError] = useState('')

  const canManage = role === 'owner' || role === 'admin'

  useEffect(() => {
    getBoardMembers(boardId).then((r) => setMembers(r.data))
  }, [boardId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await addBoardMember(boardId, email, memberRole)
      const r = await getBoardMembers(boardId)
      setMembers(r.data)
      setEmail('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member')
    }
  }

  const handleRemove = async (userId: number) => {
    await removeBoardMember(boardId, userId)
    setMembers(members.filter((m) => m.user_id !== userId))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{m.username}</p>
              <p className="text-xs text-gray-400">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded">{m.role}</span>
              {canManage && m.role !== 'owner' && (
                <button onClick={() => handleRemove(m.user_id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t">
          <p className="text-xs font-semibold text-gray-600">Add Member</p>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            type="email" placeholder="Email address"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <div className="flex gap-2">
            <select
              className="border rounded-lg px-2 py-2 text-sm flex-1 focus:outline-none"
              value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="viewer">Viewer — can view only</option>
              <option value="member">Member — can edit cards</option>
              <option value="admin">Admin — can manage board</option>
            </select>
            <button className="bg-sky-600 text-white text-sm rounded-lg px-3 hover:bg-sky-700">Add</button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Labels ────────────────────────────────────────────────────────────────────

function LabelsTab({ boardId, initialLabels, onLabelsChanged }: { boardId: number; initialLabels: BoardLabel[]; onLabelsChanged: (l: BoardLabel[]) => void }) {
  const [labels, setLabels] = useState<BoardLabel[]>(initialLabels)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  // Reload if initialLabels changes (e.g. from CardModal edits)
  useEffect(() => { setLabels(initialLabels) }, [initialLabels])

  const startEdit = (l: BoardLabel) => {
    setEditingId(l.id)
    setEditName(l.name)
    setEditColor(l.color)
  }

  const save = async () => {
    if (!editingId) return
    const r = await updateBoardLabel(boardId, editingId, { name: editName, color: editColor })
    const updated = labels.map((l) => l.id === editingId ? r.data : l)
    setLabels(updated)
    onLabelsChanged(updated)
    setEditingId(null)
  }

  const add = async () => {
    const color = LABEL_COLORS[labels.length % LABEL_COLORS.length]
    const r = await createBoardLabel(boardId, color)
    const updated = [...labels, r.data]
    setLabels(updated)
    onLabelsChanged(updated)
    startEdit(r.data)
  }

  const remove = async (id: number) => {
    await deleteBoardLabel(boardId, id)
    const updated = labels.filter((l) => l.id !== id)
    setLabels(updated)
    onLabelsChanged(updated)
    setEditingId(null)
  }

  return (
    <div className="space-y-2">
      {labels.map((l) => (
        <div key={l.id}>
          <div className="flex items-center gap-2">
            <div className={`${l.color} h-8 flex-1 rounded flex items-center px-3`}>
              <span className="text-white text-sm font-medium truncate">{l.name || <span className="italic opacity-70">unnamed</span>}</span>
            </div>
            <button
              onClick={() => editingId === l.id ? setEditingId(null) : startEdit(l)}
              className="text-gray-400 hover:text-gray-700 text-sm px-1"
            >
              {editingId === l.id ? '✕' : '✎'}
            </button>
          </div>

          {editingId === l.id && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Name</label>
                <input
                  autoFocus
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                  placeholder="Label name…"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save() }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {LABEL_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`${c} w-6 h-6 rounded transition ${editColor === c ? 'ring-2 ring-offset-1 ring-gray-600 scale-110' : 'hover:scale-110'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="bg-sky-600 text-white text-xs rounded px-3 py-1.5 hover:bg-sky-700">Save</button>
                <button onClick={() => setEditingId(null)} className="text-gray-500 text-xs px-2 py-1.5 hover:text-gray-700">Cancel</button>
                <button onClick={() => remove(l.id)} className="text-red-400 text-xs px-2 py-1.5 hover:text-red-600 ml-auto">Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={add}
        className="w-full border-2 border-dashed border-gray-200 rounded-lg py-2 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition mt-2"
      >
        + Add Label
      </button>
    </div>
  )
}

// ── Activity ──────────────────────────────────────────────────────────────────

function ActivityTab({ boardId }: { boardId: number }) {
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBoardActivity(boardId).then((r) => {
      setActivity(r.data)
      setLoading(false)
    })
  }, [boardId])

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!activity.length) return <p className="text-sm text-gray-400">No activity yet.</p>

  return (
    <div className="space-y-3">
      {activity.map((a) => (
        <div key={a.id} className="flex gap-3 text-sm">
          <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">
            {a.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-gray-800">{a.username} </span>
            <span className="text-gray-600">{a.action}</span>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
