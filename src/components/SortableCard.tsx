import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { useStore } from '../store'

interface Props {
  card: Card
  canEdit: boolean
  dimmed: boolean
  onClick: () => void
  onDelete: () => void
}

export default function SortableCard({ card, canEdit, dimmed, onClick, onDelete }: Props) {
  const boardLabels = useStore((s) => s.boardLabels)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : dimmed ? 0.35 : 1,
  }

  const cardLabels = boardLabels.filter((l) => card.labels?.includes(String(l.id)))

  return (
    <div ref={setNodeRef} style={style} className="bg-white/85 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group select-none">
      {card.cover_color && <div className={`${card.cover_color} h-9 w-full`} />}

      <div className="p-3">
        {cardLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {cardLabels.map((l) => (
              <span key={l.id} className={`${l.color} h-1.5 rounded-full px-1 min-w-[2rem]`} title={l.name} />
            ))}
          </div>
        )}

        {/* Drag handle strip + title row */}
        <div className="flex items-start gap-1.5">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0 touch-none leading-none transition-colors"
          >
            ⠿
          </div>
          <p className="text-sm text-gray-800 leading-snug flex-1 cursor-pointer" onClick={onClick}>
            {card.title}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 gap-1">
          <div className="flex items-center gap-1.5">
            {card.due_date && (() => {
              const due = new Date(card.due_date + 'T00:00:00')
              const now = new Date()
              const overdue = due < now
              const soon = due < new Date(now.getTime() + 2 * 24 * 3600 * 1000)
              return (
                <span className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${overdue ? 'bg-red-100 text-red-600' : soon ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )
            })()}
            {card.description && (
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h12M4 18h8" />
              </svg>
            )}
          </div>
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onClick() }} className="text-gray-400 hover:text-sky-600 text-xs transition-colors">Edit</button>
            {canEdit && (
              <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-gray-400 hover:text-red-500 text-xs transition-colors">✕</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
