import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column, Card } from '../types'
import SortableCard from './SortableCard'

interface Props {
  column: Column
  cards: Card[]
  canEdit: boolean
  boardId: number
  onAddCard: (colId: number, title: string) => void
  onDeleteColumn: (colId: number) => void
  onCardClick: (card: Card) => void
  onDeleteCard: (card: Card) => void
}

export default function KanbanColumn({ column, cards, canEdit, onAddCard, onDeleteColumn, onCardClick, onDeleteCard }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(column.title)

  const { setNodeRef } = useDroppable({ id: column.id })

  const submitCard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAddCard(column.id, newTitle.trim())
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="bg-slate-100 rounded-xl w-64 shrink-0 flex flex-col max-h-[calc(100vh-8rem)]">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2">
        {editingTitle ? (
          <input
            autoFocus
            className="flex-1 bg-white rounded px-1 text-sm font-semibold text-gray-700 focus:outline-none"
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false) }}
          />
        ) : (
          <h3
            className="font-semibold text-gray-700 text-sm flex-1 cursor-pointer"
            onDoubleClick={() => canEdit && setEditingTitle(true)}
          >
            {column.title}
          </h3>
        )}
        <span className="text-gray-400 text-xs mr-2">{cards.length}</span>
        {canEdit && (
          <button onClick={() => onDeleteColumn(column.id)} className="text-gray-400 hover:text-red-500 text-sm leading-none">✕</button>
        )}
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto column-scroll px-2 pb-2 space-y-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              canEdit={canEdit}
              onClick={() => onCardClick(card)}
              onDelete={() => onDeleteCard(card)}
            />
          ))}
        </SortableContext>
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
