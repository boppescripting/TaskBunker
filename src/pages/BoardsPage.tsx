import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getBoards, createBoard, deleteBoard, logout } from '../api'
import type { Board } from '../types'

const COLORS = [
  'bg-sky-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-rose-600', 'bg-amber-600', 'bg-teal-600'
]

export default function BoardsPage() {
  const { user, setUser, boards, setBoards } = useStore()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [showNew, setShowNew] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    getBoards().then((r) => setBoards(r.data))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const r = await createBoard(title.trim(), color)
    setBoards([...boards, r.data])
    setTitle('')
    setShowNew(false)
  }

  const handleDelete = async (b: Board, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete board "${b.title}"?`)) return
    await deleteBoard(b.id)
    setBoards(boards.filter((x) => x.id !== b.id))
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  return (
    <div className="min-h-screen p-6 bg-sky-700">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-white text-2xl font-bold">TaskBunker</h1>
        <div className="flex items-center gap-3">
          <span className="text-sky-200 text-sm">{user?.username}</span>
          <button onClick={handleLogout} className="text-sky-200 text-sm hover:text-white transition">
            Sign out
          </button>
        </div>
      </header>

      <h2 className="text-white font-semibold text-lg mb-4">Your Boards</h2>
      <div className="flex flex-wrap gap-4">
        {boards.map((b) => (
          <div
            key={b.id}
            onClick={() => nav(`/board/${b.id}`)}
            className={`${b.color} relative w-48 h-28 rounded-xl cursor-pointer shadow-md hover:opacity-90 transition p-3 flex flex-col justify-between`}
          >
            <span className="text-white font-semibold text-sm leading-tight">{b.title}</span>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs capitalize">{b.role}</span>
              {(b.role === 'owner' || b.role === 'admin') && (
                <button
                  onClick={(e) => handleDelete(b, e)}
                  className="text-white/70 hover:text-white text-xs"
                >✕</button>
              )}
            </div>
          </div>
        ))}

        {showNew ? (
          <form onSubmit={handleCreate} className="bg-white/20 w-48 rounded-xl p-3 flex flex-col gap-2">
            <input
              autoFocus
              className="rounded px-2 py-1 text-sm bg-white/90 focus:outline-none"
              placeholder="Board title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex gap-1 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className={`${c} w-5 h-5 rounded-full ${color === c ? 'ring-2 ring-white' : ''}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button className="bg-white text-sky-700 text-sm rounded px-2 py-1 font-medium hover:bg-sky-50">Add</button>
              <button type="button" onClick={() => setShowNew(false)} className="text-white/80 text-sm hover:text-white">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNew(true)}
            className="w-48 h-28 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center text-sm font-medium transition"
          >
            + New Board
          </button>
        )}
      </div>
    </div>
  )
}
