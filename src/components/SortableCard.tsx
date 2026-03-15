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
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg shadow-sm overflow-hidden group select-none">
      {card.cover_color && <div className={`${card.cover_color} h-8 w-full`} />}

      <div className="p-3">
        {cardLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {cardLabels.map((l) => (
              <span key={l.id} className={`${l.color} h-2 rounded-full px-1 min-w-[2rem]`} title={l.name} />
            ))}
          </div>
        )}

        {/* Drag handle strip + title row */}
        <div className="flex items-start gap-1">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0 touch-none leading-none"
          >
            ⠿
          </div>
          <p className="text-sm text-gray-800 leading-snug flex-1 cursor-pointer" onClick={onClick}>
            {card.title}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 gap-1">
          <div className="flex items-center gap-2">
            {card.due_date && (() => {
              const due = new Date(card.due_date)
              const now = new Date()
              const overdue = due < now
              const soon = due < new Date(now.getTime() + 2 * 24 * 3600 * 1000)
              return (
                <span className={`text-xs px-1.5 py-0.5 rounded ${overdue ? 'bg-red-100 text-red-600' : soon ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400'}`}>
                  {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )
            })()}
            {card.description && <span className="text-gray-300 text-xs">≡</span>}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onClick() }} className="text-gray-400 hover:text-sky-600 text-xs">Edit</button>
            {canEdit && (
              <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
