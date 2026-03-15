import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'

const LABEL_COLORS: Record<string, string> = {
  red: 'bg-red-400',
  orange: 'bg-orange-400',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-400',
  blue: 'bg-sky-400',
  purple: 'bg-violet-400'
}

interface Props {
  card: Card
  canEdit: boolean
  onClick: () => void
  onDelete: () => void
}

export default function SortableCard({ card, canEdit, onClick, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing group"
    >
      {card.label_color && (
        <div className={`${LABEL_COLORS[card.label_color] || 'bg-gray-400'} h-1.5 rounded-full mb-2 w-12`} />
      )}
      <p className="text-sm text-gray-800 leading-snug" onClick={onClick}>{card.title}</p>
      <div className="flex items-center justify-between mt-2">
        {card.due_date && (
          <span className="text-xs text-gray-400">{new Date(card.due_date).toLocaleDateString()}</span>
        )}
        <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className="text-gray-400 hover:text-sky-600 text-xs"
          >Edit</button>
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="text-gray-400 hover:text-red-500 text-xs"
            >✕</button>
          )}
        </div>
      </div>
    </div>
  )
}
