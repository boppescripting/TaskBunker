import { useState, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateColumn } from '../api'
import type { Column, Card } from '../types'
import SortableCard from './SortableCard'

interface Props {
  column: Column
  cards: Card[]
  filteredCardIds: Set<number> | null
  canEdit: boolean
  boardId: number
  onAddCard: (colId: number, title: string) => void
  onDeleteColumn: (colId: number) => void
  onCardClick: (card: Card) => void
  onDeleteCard: (card: Card) => void
}

export default function KanbanColumn({ column, cards, filteredCardIds, canEdit, boardId, onAddCard, onDeleteColumn, onCardClick, onDeleteCard }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(column.title)
  const [showWipEdit, setShowWipEdit] = useState(false)
  const [wipVal, setWipVal] = useState(String(column.wip_limit ?? ''))

  // Sortable for column reordering — outer wrapper
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: -column.id, data: { type: 'column' } })

  // Droppable for cards dropped into this column
  const { setNodeRef: setDropRef } = useDroppable({ id: column.id })

  const setCardsRef = useCallback(
    (node: HTMLDivElement | null) => { setDropRef(node) },
    [setDropRef]
  )

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAddCard(column.id, newTitle.trim())
    setNewTitle('')
    setAdding(false)
  }

  const saveTitle = async () => {
    setEditingTitle(false)
    if (titleVal.trim() && titleVal !== column.title) {
      await updateColumn(boardId, column.id, { title: titleVal.trim() })
    }
  }

  const saveWip = async () => {
    setShowWipEdit(false)
    const val = wipVal === '' ? null : Number(wipVal)
    await updateColumn(boardId, column.id, { wip_limit: val })
  }

  const atLimit = column.wip_limit !== null && cards.length >= column.wip_limit
  const visibleCards = filteredCardIds ? cards.filter((c) => filteredCardIds.has(c.id)) : cards

  return (
    <div
      ref={setSortRef}
      style={{ width: '272px', transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div className={`bg-black/20 backdrop-blur-sm rounded-xl flex flex-col max-h-[calc(100vh-9rem)] ${atLimit ? 'ring-2 ring-red-400/60' : 'ring-1 ring-white/10'}`}>

        {/* Header */}
        <div className="flex items-center gap-1 px-2 py-2.5">
          {/* Grip — only this element initiates column drag */}
          <button
            {...attributes}
            {...listeners}
            className="text-white/25 hover:text-white/60 cursor-grab active:cursor-grabbing px-1 shrink-0 touch-none select-none transition-colors"
            tabIndex={-1}
            aria-label="Drag column"
          >
            ⠿
          </button>

          {editingTitle ? (
            <input
              autoFocus
              className="flex-1 bg-white/15 rounded-lg px-2 py-0.5 text-sm font-semibold text-white focus:outline-none focus:bg-white/20 border border-white/20"
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle() }}
            />
          ) : (
            <h3
              className="font-semibold text-white/90 text-sm flex-1 truncate cursor-default"
              onDoubleClick={() => canEdit && setEditingTitle(true)}
              title={canEdit ? 'Double-click to rename' : undefined}
            >
              {column.title}
            </h3>
          )}

          <span className={`text-xs font-medium px-1.5 rounded shrink-0 ${atLimit ? 'bg-red-500/30 text-red-200' : 'text-white/40'}`}>
            {cards.length}{column.wip_limit !== null ? `/${column.wip_limit}` : ''}
          </span>

          {canEdit && (
            <>
              <button
                onClick={() => setShowWipEdit((v) => !v)}
                className="text-white/35 hover:text-white/80 text-xs shrink-0 transition-colors"
                title="Set WIP limit"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              <button
                onClick={() => onDeleteColumn(column.id)}
                className="text-white/35 hover:text-red-400 text-sm leading-none shrink-0 transition-colors"
              >✕</button>
            </>
          )}
        </div>

        {showWipEdit && canEdit && (
          <div className="px-3 pb-2 flex gap-2 items-center">
            <input
              className="w-16 bg-white/10 border border-white/20 text-white rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:bg-white/20 placeholder-white/30"
              type="number" min="1" placeholder="Limit"
              value={wipVal}
              onChange={(e) => setWipVal(e.target.value)}
            />
            <button onClick={saveWip} className="text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg px-2 py-0.5 transition">Set</button>
            <button onClick={() => { setWipVal(''); saveWip() }} className="text-xs text-white/40 hover:text-white/70 transition">Clear</button>
          </div>
        )}

        {/* Cards drop zone */}
        <div
          ref={setCardsRef}
          className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[2rem] column-scroll"
        >
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {visibleCards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                canEdit={canEdit}
                dimmed={filteredCardIds !== null && !filteredCardIds.has(card.id)}
                onClick={() => onCardClick(card)}
                onDelete={() => onDeleteCard(card)}
              />
            ))}
          </SortableContext>
          {filteredCardIds && visibleCards.length === 0 && (
            <p className="text-xs text-white/35 text-center py-4">No matching cards</p>
          )}
        </div>

        {/* Add card */}
        {canEdit && (
          <div className="px-2 pb-2.5">
            {adding ? (
              <form onSubmit={submitCard} className="space-y-1.5">
                <textarea
                  autoFocus
                  className="w-full rounded-lg px-2.5 py-1.5 text-sm bg-white/15 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:bg-white/20 resize-none"
                  rows={2}
                  placeholder="Card title…"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCard(e as any) } }}
                />
                <div className="flex gap-2">
                  <button className="bg-white text-sky-700 text-xs rounded-lg px-3 py-1.5 font-semibold hover:bg-white/90 transition">Add card</button>
                  <button type="button" onClick={() => setAdding(false)} className="text-white/50 text-xs hover:text-white transition">Cancel</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full text-left text-white/50 text-xs hover:text-white/80 hover:bg-white/10 rounded-lg px-2.5 py-1.5 transition flex items-center gap-1.5"
              >
                <span className="text-base leading-none">+</span> Add card
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
