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
import MembersModal from '../components/MembersModal'
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
  const [showMembers, setShowMembers] = useState(false)
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
    Promise.all([getBoards(), getColumns(boardId), getCards(boardId), getBoardLabels(boardId)]).then(([br, cr, kr, lr]) => {
      const board = br.data.find((b: any) => b.id === boardId)
      if (!board) { nav('/'); return }
      setBoards(br.data)
      setCurrentBoard(board)
      setColumns(cr.data)
      setCards(kr.data)
      setBoardLabels(lr.data)
    }).catch(() => nav('/'))
  }, [boardId])

  useEffect(() => {
    getCards(boardId, showArchived).then((r) => setCards(r.data))
  }, [showArchived, boardId])

  const canEdit = currentBoard?.role !== 'viewer'

  const filteredCardIds = useMemo(() => {
    const now = new Date()
    const soon = new Date(now.getTime() + 2 * 24 * 3600 * 1000)
    return new Set(
      cards.filter((c) => {
        if (filter.search && !c.title.toLowerCase().includes(filter.search.toLowerCase())) return false
        if (filter.labels.length && !filter.labels.some((l) => c.labels.map(String).includes(l))) return false
        if (filter.dueSoon && (!c.due_date || new Date(c.due_date) > soon)) return false
        return true
      }).map((c) => c.id)
    )
  }, [cards, filter])

  const hasFilter = !!(filter.search || filter.labels.length || filter.dueSoon)

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
      setActiveColId(active.id as number)
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
    const overCol = currentColumns.find((c) => c.id === overId)
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
      if (activeId === overId || !currentBoardState) return
      const colIds = currentBoardState.column_ids || []
      const oldIdx = colIds.indexOf(activeId)
      const newIdx = colIds.indexOf(overId)
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
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-2 bg-black/20 shrink-0">
        <button onClick={() => nav('/')} className="text-white/80 hover:text-white text-sm">← Boards</button>
        <h1 className="text-white font-bold text-lg flex-1">{currentBoard?.title}</h1>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={`text-sm px-2 py-1 rounded transition ${showArchived ? 'bg-white/30 text-white' : 'text-white/70 hover:text-white'}`}
        >
          {showArchived ? 'Hide Archived' : 'Archived'}
        </button>
        <button onClick={() => setShowMembers(true)} className="text-white/80 hover:text-white text-sm">Members</button>
      </header>

      <FilterBar filter={filter} onChange={setFilter} boardLabels={boardLabels} />

      <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <SortableContext items={orderedColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {orderedColumns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                cards={col.card_ids.map((cid) => cards.find((c) => c.id === cid)).filter(Boolean) as Card[]}
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
            <form onSubmit={handleAddColumn} className="bg-white/20 rounded-xl p-3 w-64 shrink-0 flex flex-col gap-2 h-fit">
              <input
                autoFocus
                className="rounded px-2 py-1 text-sm bg-white/90 focus:outline-none"
                placeholder="Column title"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="bg-white text-sky-700 text-sm rounded px-2 py-1 font-medium">Add</button>
                <button type="button" onClick={() => setAddingCol(false)} className="text-white/80 text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-3 text-sm font-medium w-64 shrink-0 h-fit transition"
            >
              + Add Column
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

      {showMembers && currentBoard && (
        <MembersModal boardId={boardId} role={currentBoard.role} onClose={() => setShowMembers(false)} />
      )}
    </div>
  )
}
