import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useStore } from '../store'
import {
  getBoards, getColumns, getCards,
  createColumn, updateColumn, deleteColumn,
  createCard, updateCard, deleteCard, updateBoard
} from '../api'
import type { Column, Card } from '../types'
import KanbanColumn from '../components/KanbanColumn'
import CardModal from '../components/CardModal'
import MembersModal from '../components/MembersModal'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const boardId = Number(id)
  const nav = useNavigate()
  const { boards, setBoards, currentBoard, setCurrentBoard, columns, setColumns, cards, setCards } = useStore()

  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [addingCol, setAddingCol] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    Promise.all([getBoards(), getColumns(boardId), getCards(boardId)]).then(([br, cr, kr]) => {
      const board = br.data.find((b: any) => b.id === boardId)
      if (!board) { nav('/'); return }
      setBoards(br.data)
      setCurrentBoard(board)
      setColumns(cr.data)
      setCards(kr.data)
    }).catch(() => nav('/'))
  }, [boardId])

  const canEdit = currentBoard?.role !== 'viewer'

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColTitle.trim()) return
    const r = await createColumn(boardId, newColTitle.trim())
    const newCol: Column = r.data
    setColumns([...columns, newCol])
    // update board column_ids
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
    }
  }

  const handleAddCard = async (colId: number, title: string) => {
    const r = await createCard(boardId, colId, title)
    const newCard: Card = r.data
    setCards([...cards, newCard])
    const col = columns.find((c) => c.id === colId)
    if (col) {
      const newIds = [...col.card_ids, newCard.id]
      const updated = { ...col, card_ids: newIds }
      setColumns(columns.map((c) => (c.id === colId ? updated : c)))
      await updateColumn(boardId, colId, { card_ids: newIds })
    }
  }

  const handleDeleteCard = async (card: Card) => {
    await deleteCard(boardId, card.id)
    setCards(cards.filter((c) => c.id !== card.id))
    const col = columns.find((c) => c.id === card.column_id)
    if (col) {
      const newIds = col.card_ids.filter((i) => i !== card.id)
      setColumns(columns.map((c) => (c.id === col.id ? { ...col, card_ids: newIds } : c)))
      await updateColumn(boardId, col.id, { card_ids: newIds })
    }
  }

  // DnD handlers
  const onDragStart = ({ active }: DragStartEvent) => {
    const card = cards.find((c) => c.id === active.id)
    if (card) setActiveCard(card)
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const activeId = active.id as number
    const overId = over.id as number

    const activeCard = cards.find((c) => c.id === activeId)
    if (!activeCard) return

    const overCard = cards.find((c) => c.id === overId)
    const overCol = columns.find((c) => c.id === overId)

    if (!overCard && !overCol) return

    const targetColId = overCard ? overCard.column_id : overId

    if (activeCard.column_id !== targetColId) {
      // move card to new column optimistically
      setCards((prev: Card[]) =>
        prev.map((c) => c.id === activeId ? { ...c, column_id: targetColId } : c)
      )
      setColumns((prev: Column[]) =>
        prev.map((col) => {
          if (col.id === activeCard.column_id) return { ...col, card_ids: col.card_ids.filter((i) => i !== activeId) }
          if (col.id === targetColId) return { ...col, card_ids: [...col.card_ids, activeId] }
          return col
        })
      )
    }
  }

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveCard(null)
    if (!over) return

    const activeId = active.id as number
    const overId = over.id as number
    const activeCard = cards.find((c) => c.id === activeId)
    if (!activeCard) return

    const col = columns.find((c) => c.card_ids.includes(activeId))
    if (!col) return

    const overCard = cards.find((c) => c.id === overId)

    if (overCard && overCard.column_id === activeCard.column_id) {
      // reorder within same column
      const oldIdx = col.card_ids.indexOf(activeId)
      const newIdx = col.card_ids.indexOf(overId)
      if (oldIdx !== newIdx) {
        const newIds = arrayMove(col.card_ids, oldIdx, newIdx)
        const updated = { ...col, card_ids: newIds }
        setColumns(columns.map((c) => (c.id === col.id ? updated : c)))
        await updateColumn(boardId, col.id, { card_ids: newIds })
      }
    } else {
      // cross-column: persist card's column change
      await updateCard(boardId, activeId, { column_id: activeCard.column_id })
      // persist both columns' card_ids
      for (const c of columns) {
        await updateColumn(boardId, c.id, { card_ids: c.card_ids })
      }
    }
  }

  const orderedColumns = currentBoard
    ? (currentBoard.column_ids || []).map((id) => columns.find((c) => c.id === id)).filter(Boolean) as Column[]
    : columns

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-black/20">
        <button onClick={() => nav('/')} className="text-white/80 hover:text-white text-sm">← Boards</button>
        <h1 className="text-white font-bold text-lg flex-1">{currentBoard?.title}</h1>
        <button onClick={() => setShowMembers(true)} className="text-white/80 hover:text-white text-sm">Members</button>
      </header>

      {/* Board */}
      <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          {orderedColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={col.card_ids.map((cid) => cards.find((c) => c.id === cid)).filter(Boolean) as Card[]}
              canEdit={canEdit}
              onAddCard={handleAddCard}
              onDeleteColumn={handleDeleteColumn}
              onCardClick={setEditingCard}
              onDeleteCard={handleDeleteCard}
              boardId={boardId}
            />
          ))}

          <DragOverlay>
            {activeCard && (
              <div className="bg-white rounded-lg shadow-xl p-3 w-64 text-sm font-medium text-gray-800 rotate-2 opacity-90">
                {activeCard.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Add column */}
        {canEdit && (
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
          canEdit={canEdit}
          onClose={() => setEditingCard(null)}
          onSave={async (data) => {
            const r = await updateCard(boardId, editingCard.id, data)
            setCards(cards.map((c) => (c.id === editingCard.id ? r.data : c)))
            setEditingCard(r.data)
          }}
          onDelete={() => { handleDeleteCard(editingCard); setEditingCard(null) }}
        />
      )}

      {showMembers && currentBoard && (
        <MembersModal boardId={boardId} role={currentBoard.role} onClose={() => setShowMembers(false)} />
      )}
    </div>
  )
}
