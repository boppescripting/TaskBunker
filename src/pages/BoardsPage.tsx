import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getBoards, createBoard, deleteBoard, logout } from '../api'
import type { Board } from '../types'
import { BOARD_COLORS } from '../types'

export default function BoardsPage() {
  const { user, setUser, boards, setBoards } = useStore()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(BOARD_COLORS[0])
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
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
    setColor(BOARD_COLORS[0])
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

  const filtered = boards.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  )

  const owned = filtered.filter((b) => b.role === 'owner')
  const shared = filtered.filter((b) => b.role !== 'owner')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <rect x="3" y="3" width="7" height="11" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="18" width="7" height="3" rx="1.5" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">TaskBunker</span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-300 transition"
                placeholder="Search boards…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-800 leading-none">{user?.username}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-800 transition ml-1"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">

        {/* Your boards */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h8m-8 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Boards</h2>
              <span className="bg-gray-200 text-gray-500 text-xs font-medium px-1.5 py-0.5 rounded">{owned.length}</span>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 text-sm text-sky-600 font-medium hover:text-sky-800 transition"
            >
              <span className="text-lg leading-none">+</span> New Board
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {owned.map((b) => <BoardCard key={b.id} board={b} onOpen={() => nav(`/board/${b.id}`)} onDelete={(e) => handleDelete(b, e)} />)}

            {showNew && (
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-3 flex flex-col gap-2.5 h-36">
                <form onSubmit={handleCreate} className="flex flex-col gap-2.5 h-full">
                  <input
                    autoFocus
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    placeholder="Board title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {BOARD_COLORS.map((c) => (
                      <button
                        key={c} type="button"
                        onClick={() => setColor(c)}
                        className={`${c} w-5 h-5 rounded-full transition ${color === c ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : 'hover:scale-110'}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button className="bg-sky-600 text-white text-xs rounded-lg px-3 py-1.5 font-medium hover:bg-sky-700">Create</button>
                    <button type="button" onClick={() => setShowNew(false)} className="text-gray-400 text-xs hover:text-gray-600">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {!showNew && (
              <button
                onClick={() => setShowNew(true)}
                className="h-36 rounded-xl bg-gray-100 hover:bg-gray-200 transition flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 group-hover:bg-gray-300 flex items-center justify-center transition text-xl leading-none">+</div>
                <span className="text-xs font-medium">Create board</span>
              </button>
            )}
          </div>
        </section>

        {/* Shared boards */}
        {shared.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Shared with me</h2>
              <span className="bg-gray-200 text-gray-500 text-xs font-medium px-1.5 py-0.5 rounded">{shared.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {shared.map((b) => <BoardCard key={b.id} board={b} onOpen={() => nav(`/board/${b.id}`)} onDelete={(e) => handleDelete(b, e)} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {boards.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-9 h-9 text-sky-500 fill-current">
                <rect x="3" y="3" width="7" height="11" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="18" width="7" height="3" rx="1.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No boards yet</h3>
            <p className="text-gray-500 text-sm mb-5">Create your first board to start organizing tasks.</p>
            <button
              onClick={() => setShowNew(true)}
              className="bg-sky-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-sky-700 transition"
            >
              Create a board
            </button>
          </div>
        )}

        {/* No search results */}
        {boards.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">No boards match "<span className="font-medium">{search}</span>"</p>
          </div>
        )}
      </main>
    </div>
  )
}

function BoardCard({ board, onOpen, onDelete }: { board: Board; onOpen: () => void; onDelete: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onOpen}
      className={`${board.color} relative h-36 rounded-xl cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 p-4 flex flex-col justify-between group overflow-hidden`}
    >
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white" />
        <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white" />
      </div>

      <div className="relative">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{board.title}</p>
      </div>

      <div className="relative flex items-center justify-between">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded bg-black/20 text-white/90 capitalize`}>
          {board.role}
        </span>
        {(board.role === 'owner' || board.role === 'admin') && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/70 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded bg-black/20 hover:bg-black/40"
          >✕</button>
        )}
      </div>
    </div>
  )
}
