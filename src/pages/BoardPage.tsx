import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useStore } from '../store'
import {
  getBoards, getColumns, getCards,
  createColumn, updateColumn, deleteColumn,
  createCard, updateCard, deleteCard, updateBoard,
  getBoardLabels,
} from '../api'
import type { Column, Card } from '../types'
import KanbanColumn from '../components/KanbanColumn'
import CardModal from '../components/CardModal'
import BoardSettingsPanel from '../components/BoardSettingsPanel'
import FilterBar from '../components/FilterBar'

export interface FilterState {
  search: string
  labels: string[]
  dueSoon: boolean
  assignedToMe: boolean
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const boardId = Number(id)
  const nav = useNavigate()
  const { user, boards, setBoards, currentBoard, setCurrentBoard, columns, setColumns, cards, setCards, boardLabels, setBoardLabels } = useStore()

  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [activeColId, setActiveColId] = useState<number | null>(null)
  const dragOriginalColRef = useRef<number | null>(null)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [filter, setFilter] = useState<FilterState>({ search: '', labels: [], dueSoon: false, assignedToMe: false })

  // Require 8px movement before drag starts, prevents accidental drags on clicks
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  useEffect(() => {
    Promise.all([getBoards(), getColumns(boardId), getBoardLabels(boardId)]).then(([br, cr, lr]) => {
      const board = br.data.find((b: any) => b.id === boardId)
      if (!board) { nav('/'); return }
      setBoards(br.data)
      setCurrentBoard(board)
      setColumns(cr.data)
      setBoardLabels(lr.data)
    }).catch(() => nav('/'))
  }, [boardId])

  // Cards re-fetched whenever boardId or showArchived changes (handles both initial load and toggle)
  useEffect(() => {
    getCards(boardId, showArchived).then((r) => setCards(r.data))
  }, [boardId, showArchived])

  const canEdit = currentBoard?.role !== 'viewer'

  const filteredCardIds = useMemo(() => {
    const now = new Date()
    const soon = new Date(now.getTime() + 2 * 24 * 3600 * 1000)
    return new Set(
      cards.filter((c) => {
        if (filter.search && !c.title.toLowerCase().includes(filter.search.toLowerCase())) return false
        if (filter.labels.length && !filter.labels.some((l) => c.labels.map(String).includes(l))) return false
        if (filter.dueSoon && (!c.due_date || new Date(c.due_date + 'T00:00:00') > soon)) return false
        return true
      }).map((c) => c.id)
    )
  }, [cards, filter])

  const hasFilter = !!(filter.search || filter.labels.length > 0 || filter.dueSoon)

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColTitle.trim()) return
    const r = await createColumn(boardId, newColTitle.trim())
    const newCol: Column = r.data
    setColumns([...columns, newCol])
    if (currentBoard) {
      const newIds = [...(currentBoard.column_ids || []), newCol.id]
      setCurrentBoard({ ...currentBoard, column_ids: newIds })
      await updateBoard(boardId, { column_ids: newIds })
    }
    setNewColTitle('')
    setAddingCol(false)
  }

  const handleDeleteColumn = async (colId: number) => {
    if (!confirm('Delete this column and all its cards?')) return
    await deleteColumn(boardId, colId)
    setColumns(columns.filter((c) => c.id !== colId))
    setCards(cards.filter((c) => c.column_id !== colId))
    if (currentBoard) {
      const newIds = (currentBoard.column_ids || []).filter((i) => i !== colId)
      setCurrentBoard({ ...currentBoard, column_ids: newIds })
      await updateBoard(boardId, { column_ids: newIds })
    }
  }

  const handleAddCard = async (colId: number, title: string) => {
    const r = await createCard(boardId, colId, title)
    const newCard: Card = r.data
    setCards([...cards, newCard])
    const col = columns.find((c) => c.id === colId)
    if (col) {
      const newIds = [...col.card_ids, newCard.id]
      setColumns(columns.map((c) => c.id === colId ? { ...col, card_ids: newIds } : c))
      await updateColumn(boardId, colId, { card_ids: newIds })
    }
  }

  const handleDeleteCard = async (card: Card) => {
    await deleteCard(boardId, card.id)
    setCards(cards.filter((c) => c.id !== card.id))
    const col = columns.find((c) => c.id === card.column_id)
    if (col) {
      const newIds = col.card_ids.filter((i) => i !== card.id)
      setColumns(columns.map((c) => c.id === col.id ? { ...col, card_ids: newIds } : c))
      await updateColumn(boardId, col.id, { card_ids: newIds })
    }
  }

  const handleArchiveCard = async (card: Card) => {
    await updateCard(boardId, card.id, { archived: true } as any)
    setCards(cards.filter((c) => c.id !== card.id))
    const col = columns.find((c) => c.id === card.column_id)
    if (col) setColumns(columns.map((c) => c.id === col.id ? { ...col, card_ids: col.card_ids.filter((i) => i !== card.id) } : c))
    setEditingCard(null)
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onDragStart = ({ active }: DragStartEvent) => {
    const type = active.data.current?.type
    if (type === 'card') {
      // Read fresh state — no stale closure risk
      const card = useStore.getState().cards.find((c) => c.id === active.id)
      if (card) {
        setActiveCard(card)
        dragOriginalColRef.current = card.column_id
      }
    } else if (type === 'column') {
      setActiveColId(-(active.id as number)) // convert negative sortable id back to positive column id
    }
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.data.current?.type === 'column') return
    const activeId = active.id as number
    const overId = over.id as number

    // Always read current store state to avoid stale column_id after previous onDragOver
    const { cards: currentCards, columns: currentColumns } = useStore.getState()
    const draggingCard = currentCards.find((c) => c.id === activeId)
    if (!draggingCard) return

    const overCard = currentCards.find((c) => c.id === overId)
    // overId may be a negative column sortable id or positive column droppable id
    const overCol = currentColumns.find((c) => c.id === Math.abs(overId))
    const targetColId = overCard ? overCard.column_id : overCol?.id
    if (!targetColId || draggingCard.column_id === targetColId) return

    setCards((prev) => prev.map((c) => c.id === activeId ? { ...c, column_id: targetColId } : c))
    setColumns((prev) => prev.map((col) => {
      if (col.id === draggingCard.column_id) return { ...col, card_ids: col.card_ids.filter((i) => i !== activeId) }
      if (col.id === targetColId) return { ...col, card_ids: [...col.card_ids, activeId] }
      return col
    }))
  }

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveCard(null)
    setActiveColId(null)

    // Always read current store state — by this point onDragOver has already updated it
    const { cards: currentCards, columns: currentColumns, currentBoard: currentBoardState } = useStore.getState()

    if (!over) return
    const activeId = active.id as number
    const overId = over.id as number
    const type = active.data.current?.type

    if (type === 'column') {
      // active.id and over.id are negative (-column.id); convert back to real ids
      const activeColId = -activeId
      const overColId = -overId
      if (activeColId === overColId || !currentBoardState) return
      const colIds = currentBoardState.column_ids || []
      const oldIdx = colIds.indexOf(activeColId)
      const newIdx = colIds.indexOf(overColId)
      if (oldIdx === -1 || newIdx === -1) return
      const newIds = arrayMove(colIds, oldIdx, newIdx)
      setCurrentBoard({ ...currentBoardState, column_ids: newIds })
      await updateBoard(boardId, { column_ids: newIds })
      return
    }

    if (type === 'card') {
      const originalColId = dragOriginalColRef.current
      dragOriginalColRef.current = null

      const draggingCard = currentCards.find((c) => c.id === activeId)
      if (!draggingCard || !originalColId) return

      const targetColId = draggingCard.column_id  // updated by onDragOver
      const targetCol = currentColumns.find((c) => c.id === targetColId)
      if (!targetCol) return

      if (originalColId === targetColId) {
        // Same-column reorder
        const overCard = currentCards.find((c) => c.id === overId)
        if (!overCard) return
        const oldIdx = targetCol.card_ids.indexOf(activeId)
        const newIdx = targetCol.card_ids.indexOf(overId)
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const newIds = arrayMove(targetCol.card_ids, oldIdx, newIdx)
          setColumns(currentColumns.map((c) => c.id === targetCol.id ? { ...c, card_ids: newIds } : c))
          await updateColumn(boardId, targetCol.id, { card_ids: newIds })
        }
      } else {
        // Cross-column: save card's new column + only the two affected columns
        const sourceCol = currentColumns.find((c) => c.id === originalColId)
        await updateCard(boardId, activeId, { column_id: targetColId })
        if (sourceCol) await updateColumn(boardId, sourceCol.id, { card_ids: sourceCol.card_ids })
        await updateColumn(boardId, targetCol.id, { card_ids: targetCol.card_ids })
      }
    }
  }

  const orderedColumns = currentBoard
    ? (currentBoard.column_ids || []).map((cid) => columns.find((c) => c.id === cid)).filter(Boolean) as Column[]
    : columns

  return (
    <div className={`flex flex-col min-h-screen ${currentBoard?.color ?? 'bg-sky-700'}`}>
      <header className="shrink-0 flex flex-col">
        {/* Main toolbar */}
        <div className="flex items-center gap-2 px-4 h-13 py-2 bg-black/25 backdrop-blur-sm border-b border-white/10">
          {/* Back */}
          <button
            onClick={() => nav('/')}
            className="flex items-center gap-1.5 text-white/75 hover:text-white text-sm font-medium transition shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Boards</span>
          </button>

          <div className="w-px h-5 bg-white/20 mx-0.5 shrink-0" />

          {/* Board title */}
          <h1 className="text-white font-bold text-base flex-1 truncate">{currentBoard?.title}</h1>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${showArchived ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4" />
              </svg>
              <span className="hidden sm:inline">{showArchived ? 'Hide archived' : 'Archived'}</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar filter={filter} onChange={setFilter} boardLabels={boardLabels} />
      </header>

      <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <SortableContext items={orderedColumns.map((c) => -c.id)} strategy={horizontalListSortingStrategy}>
            {orderedColumns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                cards={col.card_ids.map((cid) => cardMap.get(cid)).filter(Boolean) as Card[]}
                filteredCardIds={hasFilter ? filteredCardIds : null}
                canEdit={canEdit && !showArchived}
                onAddCard={handleAddCard}
                onDeleteColumn={handleDeleteColumn}
                onCardClick={setEditingCard}
                onDeleteCard={handleDeleteCard}
                boardId={boardId}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeCard && (
              <div className="bg-white rounded-lg shadow-xl p-3 w-64 text-sm font-medium text-gray-800 rotate-1 opacity-95">
                {activeCard.title}
              </div>
            )}
            {activeColId && (() => {
              const col = columns.find((c) => c.id === activeColId)
              return col ? (
                <div className="bg-slate-200 rounded-xl w-64 p-3 text-sm font-semibold text-gray-700 opacity-90 shadow-xl">
                  {col.title}
                </div>
              ) : null
            })()}
          </DragOverlay>
        </DndContext>

        {canEdit && !showArchived && (
          addingCol ? (
            <form onSubmit={handleAddColumn} className="bg-black/20 backdrop-blur-sm rounded-xl p-3 w-64 shrink-0 flex flex-col gap-2 h-fit ring-1 ring-white/10">
              <input
                autoFocus
                className="rounded-lg px-2.5 py-1.5 text-sm bg-white/15 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 border border-white/20"
                placeholder="Column title…"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="bg-white text-sky-700 text-sm rounded-lg px-3 py-1 font-semibold hover:bg-white/90 transition">Add</button>
                <button type="button" onClick={() => setAddingCol(false)} className="text-white/60 text-sm hover:text-white transition">Cancel</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white/80 hover:text-white rounded-xl px-4 py-3 text-sm font-medium w-64 shrink-0 h-fit transition ring-1 ring-white/10 hover:ring-white/20"
            >
              + Add column
            </button>
          )
        )}
      </div>

      {editingCard && (
        <CardModal
          card={editingCard}
          boardId={boardId}
          columns={columns}
          boards={boards}
          boardLabels={boardLabels}
          currentUserId={user?.id ?? 0}
          onLabelsChanged={setBoardLabels}
          canEdit={canEdit && !showArchived}
          onClose={() => setEditingCard(null)}
          onSave={async (data) => {
            const r = await updateCard(boardId, editingCard.id, data)
            setCards(cards.map((c) => c.id === editingCard.id ? r.data : c))
            setEditingCard(r.data)
          }}
          onDelete={() => { handleDeleteCard(editingCard); setEditingCard(null) }}
          onArchive={() => handleArchiveCard(editingCard)}
          onCardMoved={(updatedCard) => {
            setCards(cards.map((c) => c.id === updatedCard.id ? updatedCard : c))
            const oldCol = columns.find((c) => c.id === editingCard.column_id)
            const newCol = columns.find((c) => c.id === updatedCard.column_id)
            setColumns(columns.map((c) => {
              if (oldCol && c.id === oldCol.id) return { ...c, card_ids: c.card_ids.filter((i) => i !== updatedCard.id) }
              if (newCol && c.id === newCol.id) return { ...c, card_ids: [...c.card_ids, updatedCard.id] }
              return c
            }))
            setEditingCard(updatedCard)
          }}
          onCardCopied={(newCard) => {
            setCards([...cards, newCard])
            const col = columns.find((c) => c.id === newCard.column_id)
            if (col) setColumns(columns.map((c) => c.id === col.id ? { ...c, card_ids: [...c.card_ids, newCard.id] } : c))
          }}
        />
      )}

      {showSettings && currentBoard && (
        <BoardSettingsPanel
          board={currentBoard}
          boardLabels={boardLabels}
          onClose={() => setShowSettings(false)}
          onBoardUpdated={(b) => { setCurrentBoard(b); setBoards(boards.map((x) => x.id === b.id ? b : x)) }}
          onLabelsChanged={setBoardLabels}
        />
      )}
    </div>
  )
}
