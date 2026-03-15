import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { updateColumn } from '../api'
import type { Column, Card } from '../types'
import SortableCard from './SortableCard'

interface Props {
  column: Column
  cards: Card[]
  filteredCardIds: Set<number> | null
  canEdit: boolean
  boardId: number
  dragHandleProps: Record<string, any>
  onAddCard: (colId: number, title: string) => void
  onDeleteColumn: (colId: number) => void
  onCardClick: (card: Card) => void
  onDeleteCard: (card: Card) => void
}

export default function KanbanColumn({ column, cards, filteredCardIds, canEdit, boardId, dragHandleProps, onAddCard, onDeleteColumn, onCardClick, onDeleteCard }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(column.title)
  const [showWipEdit, setShowWipEdit] = useState(false)
  const [wipVal, setWipVal] = useState(String(column.wip_limit ?? ''))

  const { setNodeRef } = useDroppable({ id: column.id })

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
    <div className={`bg-slate-100 rounded-xl w-64 shrink-0 flex flex-col max-h-[calc(100vh-8rem)] ${atLimit ? 'ring-2 ring-red-400' : ''}`}>
      {/* Column header — drag handle */}
      <div
        {...dragHandleProps}
        className="flex items-center gap-1 px-3 py-2 cursor-grab active:cursor-grabbing select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {editingTitle ? (
          <input
            autoFocus
            className="flex-1 bg-white rounded px-1 text-sm font-semibold text-gray-700 focus:outline-none"
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle() }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            className="font-semibold text-gray-700 text-sm flex-1 truncate"
            onDoubleClick={(e) => { e.stopPropagation(); if (canEdit) setEditingTitle(true) }}
          >
            {column.title}
          </h3>
        )}
        <span className={`text-xs font-medium px-1.5 rounded ${atLimit ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}>
          {cards.length}{column.wip_limit !== null ? `/${column.wip_limit}` : ''}
        </span>
        {canEdit && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowWipEdit((v) => !v) }}
              className="text-gray-400 hover:text-sky-500 text-xs"
              title="Set WIP limit"
            >⚙</button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteColumn(column.id) }} className="text-gray-400 hover:text-red-500 text-sm leading-none">✕</button>
          </div>
        )}
      </div>

      {/* Column header hover trick */}
      <div className="group">
        {showWipEdit && canEdit && (
          <div className="px-3 pb-2 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
            <input
              className="w-16 border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-300"
              type="number" min="1" placeholder="Limit"
              value={wipVal}
              onChange={(e) => setWipVal(e.target.value)}
            />
            <button onClick={saveWip} className="text-xs bg-sky-600 text-white rounded px-1.5 py-0.5">Set</button>
            <button onClick={() => { setWipVal(''); saveWip() }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-2 pb-2 space-y-2" style={{ scrollbarWidth: 'thin' }}>
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
          <p className="text-xs text-gray-400 text-center py-2">No matching cards</p>
        )}
      </div>

      {/* Add card */}
      {canEdit && (
        <div className="px-2 pb-2">
          {adding ? (
            <form onSubmit={submitCard} className="space-y-1">
              <textarea
                autoFocus
                className="w-full rounded-lg px-2 py-1 text-sm bg-white border focus:outline-none resize-none"
                rows={2}
                placeholder="Card title…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCard(e as any) } }}
              />
              <div className="flex gap-2">
                <button className="bg-sky-600 text-white text-xs rounded px-2 py-1 hover:bg-sky-700">Add</button>
                <button type="button" onClick={() => setAdding(false)} className="text-gray-400 text-xs hover:text-gray-600">Cancel</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full text-left text-gray-500 text-xs hover:text-gray-700 hover:bg-slate-200 rounded-lg px-2 py-1 transition"
            >
              + Add card
            </button>
          )}
        </div>
      )}
    </div>
  )
}
